package middleware

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

type logEntry struct {
	Timestamp  string `json:"timestamp"`
	Status     int    `json:"status"`
	LatencyMs  int64  `json:"latency_ms"`
	ClientIP   string `json:"client_ip"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	ErrorMessage string `json:"error,omitempty"`
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		if raw != "" {
			path = path + "?" + raw
		}

		entry := logEntry{
			Timestamp:  time.Now().Format(time.RFC3339),
			Status:     c.Writer.Status(),
			LatencyMs:  time.Since(start).Milliseconds(),
			ClientIP:   c.ClientIP(),
			Method:     c.Request.Method,
			Path:       path,
			ErrorMessage: c.Errors.ByType(gin.ErrorTypePrivate).String(),
		}

		bytes, _ := json.Marshal(entry)
		fmt.Println(string(bytes))
	}
}
