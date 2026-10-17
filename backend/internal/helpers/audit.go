package helpers

import (
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"testhub/internal/models"
	"testhub/internal/repository"
)

// LogAudit records an administrative audit log entry asynchronously.
// It extracts the authenticated admin ID, client IP, applies safe context timeouts,
// and ensures consistent auditing across all application modules without code duplication.
func LogAudit(c *gin.Context, repo repository.TestRepository, action, resourceType, resourceID, oldValue, newValue string) {
	if repo == nil {
		return
	}

	var adminID *string
	if uid, exists := c.Get("user_id"); exists {
		if s, ok := uid.(string); ok && s != "" {
			adminID = &s
		}
	}
	ip := c.ClientIP()
	var resID *string
	if resourceID != "" {
		resID = &resourceID
	}
	var oldVal *string
	if oldValue != "" {
		oldVal = &oldValue
	}
	var newVal *string
	if newValue != "" {
		newVal = &newValue
	}

	entry := &models.AdminAuditLog{
		AdminID:      adminID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resID,
		OldValue:     oldVal,
		NewValue:     newVal,
		IPAddress:    &ip,
		CreatedAt:    time.Now(),
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := repo.RecordAuditLog(ctx, entry); err != nil {
			log.Printf("[helpers.LogAudit] Warning: Failed to record audit log (%s on %s): %v", action, resourceType, err)
		}
	}()
}
