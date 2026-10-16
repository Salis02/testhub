package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"testhub/internal/models"
	"testhub/internal/services"
)

type AIHandler struct {
	aiService *services.AIAgentService
}

func NewAIHandler(aiService *services.AIAgentService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

// GenerateQuestions handles POST /api/ai/generate-questions
func (h *AIHandler) GenerateQuestions(c *gin.Context) {
	var req models.AIGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan tidak valid: " + err.Error()})
		return
	}

	questions, err := h.aiService.GenerateQuestions(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, questions)
}

// GradeEssay handles POST /api/ai/grade-essay
func (h *AIHandler) GradeEssay(c *gin.Context) {
	var req models.AIEssayGradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan evaluasi esai tidak valid: " + err.Error()})
		return
	}

	res, err := h.aiService.GradeEssay(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

