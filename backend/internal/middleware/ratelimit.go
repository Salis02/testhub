package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"testhub/internal/cache"
)

func RateLimit(cClient *cache.Client, maxRequests int, window time.Duration, actionName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s:%s", actionName, clientIP)

		count, err := cClient.Incr(key)
		if err == nil && count == 1 {
			_ = cClient.Expire(key, window)
		}

		if count > int64(maxRequests) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded. Please try again later.",
				"action":  actionName,
				"retry_after_seconds": int(window.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
