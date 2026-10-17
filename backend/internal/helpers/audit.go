package helpers

import (
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"testhub/internal/models"
	"testhub/internal/repository"
)

// LogAudit records an audit log entry asynchronously.
// It extracts the authenticated user ID and client IP from context (if available),
// applies safe context timeouts, and safely isolates logging failures from blocking HTTP requests.
func LogAudit(c *gin.Context, repo repository.TestRepository, action, resourceType, resourceID, oldValue, newValue string) {
	LogAuditWithActor(c, repo, nil, action, resourceType, resourceID, oldValue, newValue)
}

// LogAuditWithActor records an audit log with an explicitly designated actor ID (or falls back to context user_id).
func LogAuditWithActor(c *gin.Context, repo repository.TestRepository, explicitActorID *string, action, resourceType, resourceID, oldValue, newValue string) {
	if repo == nil {
		return
	}

	var actorID *string = explicitActorID
	var ipPtr *string

	if c != nil {
		if actorID == nil {
			if uid, exists := c.Get("user_id"); exists {
				if s, ok := uid.(string); ok && s != "" {
					actorID = &s
				}
			}
		}
		ip := c.ClientIP()
		if ip != "" {
			ipPtr = &ip
		}
	}

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
		AdminID:      actorID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resID,
		OldValue:     oldVal,
		NewValue:     newVal,
		IPAddress:    ipPtr,
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
