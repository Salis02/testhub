package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"testhub/internal/cache"
	"testhub/internal/database"
	"testhub/internal/helpers"
	"testhub/internal/models"
	"testhub/internal/repository"
	"testhub/internal/validator"
)

type AdminHandler struct {
	db       *database.DB
	testRepo repository.TestRepository
	userRepo repository.UserRepository
	examRepo repository.ExamRepository
	cache    *cache.Client
}

func NewAdminHandler(db *database.DB, testRepo repository.TestRepository, userRepo repository.UserRepository, examRepo repository.ExamRepository, cache *cache.Client) *AdminHandler {
	return &AdminHandler{
		db:       db,
		testRepo: testRepo,
		userRepo: userRepo,
		examRepo: examRepo,
		cache:    cache,
	}
}

func (h *AdminHandler) invalidateCatalogCache() {
	if h.cache != nil {
		_ = h.cache.DeletePattern("tests:catalog:*")
	}
}

func (h *AdminHandler) checkTestOwnership(c *gin.Context, testID string) (*models.Test, bool) {
	test, err := h.testRepo.GetTestByID(c.Request.Context(), testID)
	if err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return nil, false
		}
		log.Printf("[AdminHandler.checkTestOwnership] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memverifikasi kepemilikan modul ujian."})
		return nil, false
	}

	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if roleStr == "creator" {
		userUID := ""
		if uid, exists := c.Get("user_id"); exists {
			if s, ok := uid.(string); ok {
				userUID = s
			}
		}
		if userUID == "" {
			if uid, exists := c.Get("userID"); exists {
				if s, ok := uid.(string); ok {
					userUID = s
				}
			}
		}
		if test.CreatorID == nil || *test.CreatorID != userUID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Anda hanya berwenang mengelola modul ujian buatan Anda sendiri"})
			return nil, false
		}
	}
	return test, true
}

// GetStats handles GET /api/admin/stats
func (h *AdminHandler) GetStats(c *gin.Context) {
	stats, err := h.testRepo.GetStats(c.Request.Context())
	if err != nil {
		log.Printf("[AdminHandler.GetStats] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat data statistik."})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ListTests handles GET /api/admin/tests
func (h *AdminHandler) ListTests(c *gin.Context) {
	tests, err := h.testRepo.ListTests(c.Request.Context(), false)
	if err != nil {
		log.Printf("[AdminHandler.ListTests] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar ujian."})
		return
	}

	c.JSON(http.StatusOK, tests)
}

// CreateTest handles POST /api/admin/tests
func (h *AdminHandler) CreateTest(c *gin.Context) {
	var req models.SaveTestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi permintaan gagal",
			"details": validator.FormatValidationErrors(err),
		})
		return
	}

	if relationalErrs := req.ValidateRelational(); len(relationalErrs) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi butir soal gagal",
			"details": relationalErrs,
		})
		return
	}

	userID, _ := c.Get("user_id")
	var creatorID *string
	if uid, ok := userID.(string); ok && uid != "" {
		creatorID = &uid
	}

	testID := fmt.Sprintf("test-%s-%d-%d", req.Category, time.Now().Unix(), time.Now().UnixNano()%100000)
	now := time.Now()

	maxViolations := req.MaxViolations
	if maxViolations <= 0 {
		maxViolations = 3
	}

	test := models.Test{
		ID:                     testID,
		CreatorID:              creatorID,
		Title:                  req.Title,
		Description:            req.Description,
		Category:               req.Category,
		DurationMinutes:        req.DurationMinutes,
		PassingScorePercentage: req.PassingScorePercentage,
		TotalQuestions:         len(req.Questions),
		PriceIDR:               req.PriceIDR,
		ShuffleQuestions:       req.ShuffleQuestions,
		ShuffleAnswers:         req.ShuffleAnswers,
		Published:              req.Published,
		RequireFullscreen:      req.RequireFullscreen,
		DetectTabSwitch:        req.DetectTabSwitch,
		BlockCopyPaste:         req.BlockCopyPaste,
		MaxViolations:          maxViolations,
		IsDeleted:              false,
		CreatedAt:              now,
		UpdatedAt:              now,
	}

	questions := req.ToDomainQuestions(testID)

	if err := h.testRepo.CreateTestTx(c.Request.Context(), &test, questions); err != nil {
		log.Printf("[AdminHandler.CreateTest] internal DB error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan modul ujian ke database."})
		return
	}

	h.invalidateCatalogCache()
	newValBytes, _ := json.Marshal(map[string]interface{}{
		"title":           test.Title,
		"category":        test.Category,
		"total_questions": test.TotalQuestions,
		"price_idr":       test.PriceIDR,
		"published":       test.Published,
	})
	helpers.LogAudit(c, h.testRepo, "create_test", "test", test.ID, "", string(newValBytes))
	c.JSON(http.StatusCreated, test)
}

// GetTest handles GET /api/admin/tests/:testId
func (h *AdminHandler) GetTest(c *gin.Context) {
	testID := c.Param("testId")

	test, questions, err := h.testRepo.GetTestWithQuestions(c.Request.Context(), testID, false)
	if err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return
		}
		log.Printf("[AdminHandler.GetTest] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat detail ujian."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"test":      test,
		"questions": questions,
	})
}

// UpdateTest handles PUT /api/admin/tests/:testId
func (h *AdminHandler) UpdateTest(c *gin.Context) {
	testID := c.Param("testId")

	existingTest, ok := h.checkTestOwnership(c, testID)
	if !ok {
		return
	}

	var req models.SaveTestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi permintaan gagal",
			"details": validator.FormatValidationErrors(err),
		})
		return
	}

	if relationalErrs := req.ValidateRelational(); len(relationalErrs) > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi butir soal gagal",
			"details": relationalErrs,
		})
		return
	}

	maxViolations := req.MaxViolations
	if maxViolations <= 0 {
		maxViolations = 3
	}

	now := time.Now()
	test := models.Test{
		ID:                     testID,
		CreatorID:              existingTest.CreatorID,
		Title:                  req.Title,
		Description:            req.Description,
		Category:               req.Category,
		DurationMinutes:        req.DurationMinutes,
		PassingScorePercentage: req.PassingScorePercentage,
		TotalQuestions:         len(req.Questions),
		PriceIDR:               req.PriceIDR,
		ShuffleQuestions:       req.ShuffleQuestions,
		ShuffleAnswers:         req.ShuffleAnswers,
		Published:              req.Published,
		RequireFullscreen:      req.RequireFullscreen,
		DetectTabSwitch:        req.DetectTabSwitch,
		BlockCopyPaste:         req.BlockCopyPaste,
		MaxViolations:          maxViolations,
		UpdatedAt:              now,
	}

	questions := req.ToDomainQuestions(testID)

	if err := h.testRepo.UpdateTestTx(c.Request.Context(), &test, questions); err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return
		}
		log.Printf("[AdminHandler.UpdateTest] internal DB error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui ujian."})
		return
	}

	h.invalidateCatalogCache()
	newValBytes, _ := json.Marshal(map[string]interface{}{
		"title":           req.Title,
		"category":        req.Category,
		"total_questions": len(req.Questions),
		"price_idr":       req.PriceIDR,
		"published":       req.Published,
	})
	helpers.LogAudit(c, h.testRepo, "update_test", "test", testID, "", string(newValBytes))

	updated, err := h.testRepo.GetTestByID(c.Request.Context(), testID)
	if err != nil {
		c.JSON(http.StatusOK, test)
		return
	}

	c.JSON(http.StatusOK, updated)
}

// TogglePublish handles POST/PATCH /api/admin/tests/:testId/toggle-publish and /api/admin/tests/:testId/publish
func (h *AdminHandler) TogglePublish(c *gin.Context) {
	testID := c.Param("testId")

	if _, ok := h.checkTestOwnership(c, testID); !ok {
		return
	}

	newStatus, err := h.testRepo.TogglePublish(c.Request.Context(), testID)
	if err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return
		}
		log.Printf("[AdminHandler.TogglePublish] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengubah status publikasi ujian."})
		return
	}

	h.invalidateCatalogCache()
	helpers.LogAudit(c, h.testRepo, "toggle_publish", "test", testID, "", fmt.Sprintf("published: %v", newStatus))
	c.JSON(http.StatusOK, gin.H{
		"published":    newStatus,
		"published_at": time.Now().Format(time.RFC3339),
	})
}

// DeleteTest handles DELETE /api/admin/tests/:testId
func (h *AdminHandler) DeleteTest(c *gin.Context) {
	testID := c.Param("testId")

	if _, ok := h.checkTestOwnership(c, testID); !ok {
		return
	}

	err := h.testRepo.DeleteTest(c.Request.Context(), testID)
	if err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return
		}
		log.Printf("[AdminHandler.DeleteTest] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus ujian."})
		return
	}

	h.invalidateCatalogCache()
	helpers.LogAudit(c, h.testRepo, "delete", "test", testID, "", "")
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetPendingEssays handles GET /api/admin/essays
func (h *AdminHandler) GetPendingEssays(c *gin.Context) {
	results, err := h.examRepo.GetPendingEssays(c.Request.Context())
	if err != nil {
		log.Printf("[AdminHandler.GetPendingEssays] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar jawaban esai."})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GradeEssay handles POST /api/admin/essays/:essayId/grade
func (h *AdminHandler) GradeEssay(c *gin.Context) {
	essayID := c.Param("essayId")

	var req models.GradeEssayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validasi permintaan gagal",
			"details": validator.FormatValidationErrors(err),
		})
		return
	}

	err := h.examRepo.GradeEssaySubmission(c.Request.Context(), essayID, float64(req.Score), req.Note)
	if err != nil {
		if errors.Is(err, repository.ErrEssayNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Jawaban esai tidak ditemukan"})
			return
		}
		log.Printf("[AdminHandler.GradeEssay] internal DB error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan penilaian esai."})
		return
	}

	helpers.LogAudit(c, h.testRepo, "grade_essay", "essay", essayID, "", fmt.Sprintf(`{"score": %d, "note": %q}`, req.Score, req.Note))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetAnalytics handles GET /api/admin/tests/:testId/analytics
func (h *AdminHandler) GetAnalytics(c *gin.Context) {
	testID := c.Param("testId")

	analytics, err := h.testRepo.GetAnalytics(c.Request.Context(), testID)
	if err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
			return
		}
		log.Printf("[AdminHandler.GetAnalytics] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat analitik ujian."})
		return
	}

	c.JSON(http.StatusOK, analytics)
}

// GetAuditLogs handles GET /api/admin/audit-logs
func (h *AdminHandler) GetAuditLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	logs, err := h.testRepo.GetAuditLogs(c.Request.Context(), limit, offset)
	if err != nil {
		log.Printf("[AdminHandler.GetAuditLogs] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat log audit."})
		return
	}

	c.JSON(http.StatusOK, logs)
}

// ListUsers handles GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	search := c.Query("search")
	role := c.Query("role")
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	users, total, err := h.userRepo.ListUsers(c.Request.Context(), search, role, status, limit, offset)
	if err != nil {
		log.Printf("[AdminHandler.ListUsers] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar pengguna."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users":  users,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ToggleUserStatus handles PATCH /api/admin/users/:userId/status
func (h *AdminHandler) ToggleUserStatus(c *gin.Context) {
	userID := c.Param("userId")
	var req models.UpdateUserStatusDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data status tidak valid."})
		return
	}

	if err := h.userRepo.UpdateUserStatus(c.Request.Context(), userID, req.IsActive); err != nil {
		log.Printf("[AdminHandler.ToggleUserStatus] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status pengguna."})
		return
	}

	helpers.LogAudit(c, h.testRepo, "toggle_user_status", "user", userID, "", fmt.Sprintf("is_active: %v", req.IsActive))
	c.JSON(http.StatusOK, gin.H{"success": true, "is_active": req.IsActive})
}

// UpdateUserRole handles PUT /api/admin/users/:userId/role
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	userID := c.Param("userId")
	var req models.UpdateUserRoleDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role harus salah satu dari: admin, creator, user."})
		return
	}

	if err := h.userRepo.UpdateUserRole(c.Request.Context(), userID, req.Role); err != nil {
		log.Printf("[AdminHandler.UpdateUserRole] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui role pengguna."})
		return
	}

	helpers.LogAudit(c, h.testRepo, "update_user_role", "user", userID, "", fmt.Sprintf("role: %s", req.Role))
	c.JSON(http.StatusOK, gin.H{"success": true, "role": req.Role})
}


