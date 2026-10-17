package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"testhub/internal/helpers"
	"testhub/internal/models"
	"testhub/internal/repository"
	"testhub/internal/services"
)

type AIHandler struct {
	aiService *services.AIAgentService
	testRepo  repository.TestRepository
}

func NewAIHandler(aiService *services.AIAgentService, testRepo repository.TestRepository) *AIHandler {
	return &AIHandler{
		aiService: aiService,
		testRepo:  testRepo,
	}
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
		helpers.LogAudit(c, h.testRepo, "ai_generate_failed", "ai_agent", req.Category, "", fmt.Sprintf(`{"error": %q, "category": %q, "subject": %q, "difficulty": %q, "count": %d}`, err.Error(), req.Category, req.Subject, req.Difficulty, req.Count))
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	helpers.LogAudit(c, h.testRepo, "ai_generate_success", "ai_agent", req.Category, "", fmt.Sprintf(`{"category": %q, "subject": %q, "questions_generated": %d, "difficulty": %q}`, req.Category, req.Subject, len(questions), req.Difficulty))
	c.JSON(http.StatusOK, questions)
}

// GradeEssay handles POST /api/admin/essays/ai-grade and POST /api/ai/grade-essay
func (h *AIHandler) GradeEssay(c *gin.Context) {
	var req models.AIEssayGradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan evaluasi esai tidak valid: " + err.Error()})
		return
	}

	res, err := h.aiService.GradeEssay(c.Request.Context(), req)
	if err != nil {
		helpers.LogAudit(c, h.testRepo, "ai_grade_essay_failed", "ai_agent", req.EssayID, "", fmt.Sprintf(`{"error": %q, "essay_id": %q}`, err.Error(), req.EssayID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	helpers.LogAudit(c, h.testRepo, "ai_grade_essay_success", "ai_agent", req.EssayID, "", fmt.Sprintf(`{"score": %d, "provider": %q, "feedback": %q}`, res.SuggestedScore, res.Provider, res.FeedbackNote))
	c.JSON(http.StatusOK, res)
}
