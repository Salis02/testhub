package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"testhub/internal/repository"
)

type UserHandler struct {
	examRepo repository.ExamRepository
}

func NewUserHandler(examRepo repository.ExamRepository) *UserHandler {
	return &UserHandler{examRepo: examRepo}
}

// GetExamHistory handles GET /api/user/history
func (h *UserHandler) GetExamHistory(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Autentikasi diperlukan."})
		return
	}
	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ID pengguna tidak valid."})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit <= 0 {
		limit = 20
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	items, total, err := h.examRepo.GetUserExamHistory(c.Request.Context(), userID, limit, offset)
	if err != nil {
		log.Printf("[UserHandler.GetExamHistory] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat ujian."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"history": items,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetExamStats handles GET /api/user/stats
func (h *UserHandler) GetExamStats(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Autentikasi diperlukan."})
		return
	}
	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "ID pengguna tidak valid."})
		return
	}

	stats, err := h.examRepo.GetUserExamStats(c.Request.Context(), userID)
	if err != nil {
		log.Printf("[UserHandler.GetExamStats] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat analitik performa."})
		return
	}

	c.JSON(http.StatusOK, stats)
}
