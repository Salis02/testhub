package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Redis Lua script for atomic INCR + EXPIRE (eliminates race condition & zombie keys)
var rateLimitLua = redis.NewScript(`
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`)

type memoryItem struct {
	value     string
	expiresAt time.Time
}

type rateLimitEntry struct {
	count     int64
	expiresAt time.Time
}

type Client struct {
	rdb         *redis.Client
	ctx         context.Context
	useMemory   bool
	memStore    sync.Map
	rateLimiter sync.Map
	stopJanitor chan struct{}
	mu          sync.Mutex
}

func New(redisURL string, password string) *Client {
	ctx := context.Background()

	addr := redisURL
	if strings.HasPrefix(addr, "redis://") {
		addr = strings.TrimPrefix(addr, "redis://")
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})

	c := &Client{
		rdb:         rdb,
		ctx:         ctx,
		useMemory:   false,
		stopJanitor: make(chan struct{}),
	}

	// Test connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Cache] Redis ping failed (%v). Falling back to resilient in-memory cache.", err)
		c.useMemory = true
	} else {
		log.Printf("[Cache] Connected to Redis at %s", addr)
	}

	// Start janitor goroutine for automatic TTL eviction on in-memory store
	c.startJanitor(30 * time.Second)

	return c
}

func (c *Client) startJanitor(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				now := time.Now()
				// Evict expired cache items
				c.memStore.Range(func(key, val interface{}) bool {
					if item, ok := val.(memoryItem); ok && !item.expiresAt.IsZero() && now.After(item.expiresAt) {
						c.memStore.Delete(key)
					}
					return true
				})
				// Evict expired rate limit windows (prevents permanent 429 lockouts)
				c.rateLimiter.Range(func(key, val interface{}) bool {
					if entry, ok := val.(rateLimitEntry); ok && now.After(entry.expiresAt) {
						c.rateLimiter.Delete(key)
					}
					return true
				})
			case <-c.stopJanitor:
				return
			}
		}
	}()
}

func (c *Client) Close() error {
	select {
	case <-c.stopJanitor:
	default:
		close(c.stopJanitor)
	}
	if c.rdb != nil && !c.useMemory {
		return c.rdb.Close()
	}
	return nil
}

func (c *Client) Set(key string, value interface{}, expiration time.Duration) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache value: %w", err)
	}

	if !c.useMemory {
		return c.rdb.Set(c.ctx, key, string(bytes), expiration).Err()
	}

	var exp time.Time
	if expiration > 0 {
		exp = time.Now().Add(expiration)
	}
	c.memStore.Store(key, memoryItem{value: string(bytes), expiresAt: exp})
	return nil
}

func (c *Client) Get(key string, target interface{}) error {
	if !c.useMemory {
		val, err := c.rdb.Get(c.ctx, key).Result()
		if err != nil {
			return err
		}
		return json.Unmarshal([]byte(val), target)
	}

	raw, ok := c.memStore.Load(key)
	if !ok {
		return redis.Nil
	}
	item := raw.(memoryItem)
	if !item.expiresAt.IsZero() && time.Now().After(item.expiresAt) {
		c.memStore.Delete(key)
		return redis.Nil
	}
	return json.Unmarshal([]byte(item.value), target)
}

func (c *Client) Delete(key string) error {
	if !c.useMemory {
		return c.rdb.Del(c.ctx, key).Err()
	}
	c.memStore.Delete(key)
	return nil
}

// IncrAtomic increments the key and sets TTL atomically in 1 operation.
// In Redis: Uses Lua script. In Memory: Thread-safe window expiration with auto-reset.
func (c *Client) IncrAtomic(ctx context.Context, key string, window time.Duration) (int64, error) {
	if !c.useMemory {
		ttlSeconds := int(window.Seconds())
		if ttlSeconds <= 0 {
			ttlSeconds = 1
		}
		res, err := rateLimitLua.Run(ctx, c.rdb, []string{key}, ttlSeconds).Int64()
		if err != nil {
			return 0, fmt.Errorf("redis rate limit lua: %w", err)
		}
		return res, nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	raw, ok := c.rateLimiter.Load(key)
	if !ok {
		c.rateLimiter.Store(key, rateLimitEntry{count: 1, expiresAt: now.Add(window)})
		return 1, nil
	}

	entry := raw.(rateLimitEntry)
	if now.After(entry.expiresAt) {
		// Window has passed, reset counter to 1 with new expiry
		c.rateLimiter.Store(key, rateLimitEntry{count: 1, expiresAt: now.Add(window)})
		return 1, nil
	}

	entry.count++
	c.rateLimiter.Store(key, entry)
	return entry.count, nil
}

// Incr is maintained for backward compatibility
func (c *Client) Incr(key string) (int64, error) {
	if !c.useMemory {
		return c.rdb.Incr(c.ctx, key).Result()
	}
	return c.IncrAtomic(c.ctx, key, 1*time.Minute)
}

// Expire is maintained for backward compatibility
func (c *Client) Expire(key string, expiration time.Duration) error {
	if !c.useMemory {
		return c.rdb.Expire(c.ctx, key, expiration).Err()
	}
	return nil
}
