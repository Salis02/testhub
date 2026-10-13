package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"testhub/internal/cache"
)

// RateLimit creates a rate limiter using atomic Redis Lua script / in-memory window eviction
func RateLimit(cClient *cache.Client, maxRequests int, window time.Duration, actionName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s:%s", actionName, clientIP)

		count, err := cClient.IncrAtomic(c.Request.Context(), key, window)
		if err != nil {
			// Fail-open on transient cache infrastructure errors to avoid blocking legitimate users
			c.Next()
			return
		}

		if count > int64(maxRequests) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":               "Batas permintaan terlampaui. Silakan coba beberapa saat lagi.",
				"action":              actionName,
				"retry_after_seconds": int(window.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
