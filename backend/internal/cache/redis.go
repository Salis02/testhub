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

type memoryItem struct {
	value     string
	expiresAt time.Time
}

type Client struct {
	rdb         *redis.Client
	ctx         context.Context
	useMemory   bool
	memStore    sync.Map
	rateLimiter sync.Map
}

func New(redisURL string, password string) *Client {
	ctx := context.Background()

	// Parse host:port if prefixed with redis://
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
		rdb:       rdb,
		ctx:       ctx,
		useMemory: false,
	}

	// Test connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Cache] Redis ping failed (%v). Falling back to resilient in-memory cache.", err)
		c.useMemory = true
	} else {
		log.Printf("[Cache] Connected to Redis at %s", addr)
	}

	return c
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

func (c *Client) Incr(key string) (int64, error) {
	if !c.useMemory {
		return c.rdb.Incr(c.ctx, key).Result()
	}

	raw, _ := c.rateLimiter.LoadOrStore(key, int64(0))
	val := raw.(int64) + 1
	c.rateLimiter.Store(key, val)
	return val, nil
}

func (c *Client) Expire(key string, expiration time.Duration) error {
	if !c.useMemory {
		return c.rdb.Expire(c.ctx, key, expiration).Err()
	}
	// Expire for in-memory handled by item TTL
	return nil
}
