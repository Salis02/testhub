package tests

import (
	"context"
	"fmt"
	"testing"
	"time"

	"testhub/internal/cache"
	"testhub/internal/config"
)

func TestRateLimiterAtomicIncr(t *testing.T) {
	cfg := config.LoadConfig()
	client := cache.New(cfg.RedisURL, cfg.RedisPassword)
	defer client.Close()

	ctx := context.Background()
	testKey := fmt.Sprintf("test_rl_%d", time.Now().UnixNano())

	// First hit
	c1, err := client.IncrAtomic(ctx, testKey, 1*time.Second)
	if err != nil {
		t.Fatalf("IncrAtomic failed: %v", err)
	}
	if c1 != 1 {
		t.Errorf("Expected count 1 on first hit, got %d", c1)
	}

	// Second hit within window
	c2, err := client.IncrAtomic(ctx, testKey, 1*time.Second)
	if err != nil {
		t.Fatalf("IncrAtomic failed: %v", err)
	}
	if c2 != 2 {
		t.Errorf("Expected count 2 on second hit, got %d", c2)
	}

	// Wait for window to expire
	time.Sleep(1100 * time.Millisecond)

	// Hit after window expiration should reset to 1
	c3, err := client.IncrAtomic(ctx, testKey, 1*time.Second)
	if err != nil {
		t.Fatalf("IncrAtomic failed: %v", err)
	}
	if c3 != 1 {
		t.Errorf("Expected count 1 after window reset, got %d", c3)
	}
}
