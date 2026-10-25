package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"testhub/internal/cache"
	"testhub/internal/helpers"
	"testhub/internal/models"
	"testhub/internal/repository"
)

// PublicHandler handles all examinee test-taking and public interactions
type PublicHandler struct {
	examRepo repository.ExamRepository
	subRepo  repository.SubscriptionRepository
	testRepo repository.TestRepository
	cache    *cache.Client
}

func NewPublicHandler(
	examRepo repository.ExamRepository,
	subRepo repository.SubscriptionRepository,
	testRepo repository.TestRepository,
	cache *cache.Client,
) *PublicHandler {
	return &PublicHandler{
		examRepo: examRepo,
		subRepo:  subRepo,
		testRepo: testRepo,
		cache:    cache,
	}
}

// ListTests handles GET /api/tests
func (h *PublicHandler) ListTests(c *gin.Context) {
	category := c.Query("category")
	query := c.Query("query")
	if query == "" {
		query = c.Query("search")
	}

	cacheKey := fmt.Sprintf("tests:catalog:%s", category)
	if query == "" && h.cache != nil {
		var cachedTests []models.Test
		if err := h.cache.Get(cacheKey, &cachedTests); err == nil && len(cachedTests) > 0 {
			c.JSON(http.StatusOK, cachedTests)
			return
		}
	}

	tests, err := h.examRepo.ListPublicTests(c.Request.Context(), category, query)
	if err != nil {
		log.Printf("[PublicHandler.ListTests] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar modul ujian."})
		return
	}

	if query == "" && h.cache != nil && len(tests) > 0 {
		_ = h.cache.Set(cacheKey, tests, 5*time.Minute)
	}

	c.JSON(http.StatusOK, tests)
}

// GetTest handles GET /api/tests/:testId
func (h *PublicHandler) GetTest(c *gin.Context) {
	testID := c.Param("testId")

	test, err := h.examRepo.GetPublicTest(c.Request.Context(), testID)
	if err != nil {
		if errors.Is(err, repository.ErrTestNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan atau belum dipublikasikan"})
			return
		}
		log.Printf("[PublicHandler.GetTest] internal error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data modul ujian."})
		return
	}

	c.JSON(http.StatusOK, test)
}

// StartTest handles POST /api/tests/:testId/start
func (h *PublicHandler) StartTest(c *gin.Context) {
	testID := c.Param("testId")

	test, err := h.testRepo.GetTestByID(c.Request.Context(), testID)
	if err != nil || !test.Published {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan atau belum dipublikasikan"})
		return
	}

	// Resolve user role and identifier from JWT context, headers, query, or body DTO
	userRole := ""
	if rVal, exists := c.Get("role"); exists {
		if r, ok := rVal.(string); ok {
			userRole = r
		}
	}

	userIdentifier := ""
	if emailVal, exists := c.Get("email"); exists {
		if s, ok := emailVal.(string); ok && s != "" {
			userIdentifier = s
		}
	}
	if userIdentifier == "" {
		userIdentifier = c.GetHeader("X-User-Email")
	}

	var startDTO models.StartSessionDTO
	if err := c.ShouldBindJSON(&startDTO); err == nil && startDTO.Email != "" && userIdentifier == "" {
		userIdentifier = startDTO.Email
	}

	// Paywall Enforcement: Cek akses langganan jika modul ujian berbayar
	if test.PriceIDR > 0 {
		hasAccess := false

		// Admin & Creator role automatically bypass paywall for preview, testing, and grading
		if userRole == "admin" || userRole == "creator" {
			hasAccess = true
		} else if userIdentifier != "" && h.subRepo != nil {
			var errAccess error
			hasAccess, errAccess = h.subRepo.HasActiveAccess(c.Request.Context(), userIdentifier, test.ID)
			if errAccess != nil {
				log.Printf("[PublicHandler.StartTest] Subscription access error: %v", errAccess)
			}
		}

		if !hasAccess {
			helpers.LogAudit(c, h.testRepo, "test_paywall_blocked", "test", test.ID, "", fmt.Sprintf(`{"user": %q, "price_idr": %.0f}`, userIdentifier, test.PriceIDR))
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":     "Modul ujian ini berbayar. Silakan selesaikan pembayaran invoice terlebih dahulu.",
				"paywall":   true,
				"test_id":   test.ID,
				"title":     test.Title,
				"price_idr": test.PriceIDR,
			})
			return
		}
	}

	durationMins := test.DurationMinutes
	if durationMins <= 0 {
		durationMins = 60
	}
	sessionID := "sess-" + uuid.New().String()[:8] + "-" + fmt.Sprintf("%d", time.Now().Unix())
	startedAt := time.Now()
	// Allow duration plus 20 minutes buffer for pre-exam modal briefing, clock skew, and network latency
	expiresAt := startedAt.Add(time.Duration(durationMins)*time.Minute + 20*time.Minute)

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	var userIDPtr *string
	if uidVal, exists := c.Get("user_id"); exists {
		if uidStr, ok := uidVal.(string); ok && uidStr != "" {
			userIDPtr = &uidStr
		}
	}

	session := models.TestSession{
		ID:        sessionID,
		TestID:    test.ID,
		UserID:    userIDPtr,
		IPAddress: &clientIP,
		UserAgent: &userAgent,
		StartedAt: startedAt,
		ExpiresAt: expiresAt,
		IsActive:  true,
		CreatedAt: startedAt,
	}

	if err := h.examRepo.CreateSession(c.Request.Context(), &session); err != nil {
		log.Printf("[PublicHandler.StartTest] create session error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai sesi ujian baru."})
		return
	}

	// Cache session for fast access
	_ = h.cache.Set("session:"+sessionID, session, 24*time.Hour)
	helpers.LogAudit(c, h.testRepo, "test_session_started", "test_session", session.ID, "", fmt.Sprintf(`{"test_id": %q, "user": %q}`, test.ID, userIdentifier))

	resp := models.TestSessionResponse{
		SessionID: sessionID,
		StartedAt: startedAt.Format(time.RFC3339),
		ExpiresAt: expiresAt.Format(time.RFC3339),
	}
	resp.Test.ID = test.ID
	resp.Test.Title = test.Title
	resp.Test.Category = test.Category
	resp.Test.DurationMinutes = test.DurationMinutes
	resp.Test.TotalQuestions = test.TotalQuestions
	resp.Test.PassingScorePercentage = test.PassingScorePercentage
	resp.Test.RequireFullscreen = test.RequireFullscreen
	resp.Test.DetectTabSwitch = test.DetectTabSwitch
	resp.Test.BlockCopyPaste = test.BlockCopyPaste
	resp.Test.MaxViolations = test.MaxViolations

	c.JSON(http.StatusOK, resp)
}

// GetQuestions handles GET /api/sessions/:sessionId/questions
func (h *PublicHandler) GetQuestions(c *gin.Context) {
	sessionID := c.Param("sessionId")

	test, questions, err := h.examRepo.GetSessionQuestions(c.Request.Context(), sessionID)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian tidak valid atau telah kadaluarsa"})
			return
		}
		log.Printf("[PublicHandler.GetQuestions] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar soal ujian."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":       sessionID,
		"questions":        questions,
		"duration_minutes": test.DurationMinutes,
		"test": gin.H{
			"id":                       test.ID,
			"title":                    test.Title,
			"description":              test.Description,
			"category":                 test.Category,
			"duration_minutes":         test.DurationMinutes,
			"total_questions":          test.TotalQuestions,
			"passing_score_percentage": test.PassingScorePercentage,
			"published":                test.Published,
			"require_fullscreen":      test.RequireFullscreen,
			"detect_tab_switch":        test.DetectTabSwitch,
			"block_copy_paste":         test.BlockCopyPaste,
			"max_violations":          test.MaxViolations,
		},
	})
}

// GetSubmissions handles GET /api/sessions/:sessionId/submissions
func (h *PublicHandler) GetSubmissions(c *gin.Context) {
	sessionID := c.Param("sessionId")

	submissions, err := h.examRepo.GetSubmissionsBySession(c.Request.Context(), sessionID)
	if err != nil {
		log.Printf("[PublicHandler.GetSubmissions] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat lembar jawaban peserta."})
		return
	}

	c.JSON(http.StatusOK, submissions)
}

// SubmitAnswer handles POST /api/sessions/:sessionId/submit-answer and questions/:questionId/submit
func (h *PublicHandler) SubmitAnswer(c *gin.Context) {
	sessionID := c.Param("sessionId")
	questionID := c.Param("questionId")

	var body models.SubmitAnswerDTO
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format payload jawaban tidak valid"})
		return
	}

	if questionID == "" {
		questionID = body.GetQuestionID()
	}
	if questionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "question_id wajib disertakan"})
		return
	}

	selectedOption := body.GetSelectedOption()
	answerText := body.GetAnswerText()
	isFlagged := body.GetIsFlagged()

	savedAt, err := h.examRepo.SaveSubmission(c.Request.Context(), sessionID, questionID, selectedOption, answerText, isFlagged)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) || errors.Is(err, repository.ErrSessionInactive) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian tidak valid atau telah diselesaikan"})
			return
		}
		log.Printf("[PublicHandler.SubmitAnswer] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan jawaban butir soal."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"savedAt": savedAt.Format(time.RFC3339),
	})
}

// FinishTest handles POST /api/sessions/:sessionId/finish
func (h *PublicHandler) FinishTest(c *gin.Context) {
	sessionID := c.Param("sessionId")

	var req models.FinishTestRequest
	_ = c.ShouldBindJSON(&req)

	result, err := h.examRepo.FinishExamTx(c.Request.Context(), sessionID, req.TimeSpentSeconds)
	if err != nil {
		if errors.Is(err, repository.ErrSessionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian tidak ditemukan"})
			return
		}
		log.Printf("[PublicHandler.FinishTest] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses penilaian akhir ujian."})
		return
	}

	// Cache result for rapid lookup
	_ = h.cache.Set("result:"+result.ID, result, 7*24*time.Hour)

	// Push score to Redis leaderboard ZSET (key "leaderboard:" + testID)
	_ = h.cache.ZAdd("leaderboard:"+result.TestID, result.PercentageScore, result.SessionID)
	helpers.LogAudit(c, h.testRepo, "test_exam_completed", "test_result", result.ID, "", fmt.Sprintf(`{"test_id": %q, "session_id": %q, "total_score": %.2f, "percentage": %.2f, "passing": %v}`, result.TestID, result.SessionID, result.TotalScore, result.PercentageScore, result.Passing))

	c.JSON(http.StatusOK, result)
}

// GetResult handles GET /api/results/:resultId
func (h *PublicHandler) GetResult(c *gin.Context) {
	resultID := c.Param("resultId")

	result, questions, err := h.examRepo.GetResultByID(c.Request.Context(), resultID)
	if err != nil {
		if errors.Is(err, repository.ErrResultNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Hasil ujian tidak ditemukan"})
			return
		}
		log.Printf("[PublicHandler.GetResult] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat hasil ujian."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"result":    result,
		"questions": questions,
	})
}

// GetLeaderboard handles GET /api/tests/:testId/leaderboard
func (h *PublicHandler) GetLeaderboard(c *gin.Context) {
	testID := c.Param("testId")

	entries, err := h.examRepo.GetLeaderboard(c.Request.Context(), testID, 50)
	if err != nil {
		log.Printf("[PublicHandler.GetLeaderboard] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat papan peringkat ujian."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"test_id":     testID,
		"leaderboard": entries,
		"total":       len(entries),
	})
}

// GetCertificate handles GET /api/results/:resultId/certificate
func (h *PublicHandler) GetCertificate(c *gin.Context) {
	resultID := c.Param("resultId")

	cert, err := h.examRepo.GetCertificate(c.Request.Context(), resultID)
	if err != nil {
		if errors.Is(err, repository.ErrResultNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Hasil ujian tidak ditemukan"})
			return
		}
		log.Printf("[PublicHandler.GetCertificate] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menerbitkan sertifikat kelulusan."})
		return
	}

	c.JSON(http.StatusOK, cert)
}

// VerifyCertificate handles GET /api/verify/certificate/:certificateId
func (h *PublicHandler) VerifyCertificate(c *gin.Context) {
	certID := c.Param("certificateId")
	resultID := strings.TrimPrefix(certID, "CERT-")

	cert, err := h.examRepo.GetCertificate(c.Request.Context(), resultID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"valid": false,
			"error": "Sertifikat tidak ditemukan atau tidak valid",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":                    true,
		"certificate_id":           cert.CertificateID,
		"result_id":                cert.ResultID,
		"test_title":               cert.TestTitle,
		"category":                 cert.Category,
		"percentage_score":         cert.PercentageScore,
		"passing":                  cert.Passing,
		"passing_score_percentage": cert.PassingScorePercentage,
		"issued_at":                cert.IssuedAt.Format(time.RFC3339),
		"status":                   "VERIFIED_AUTHENTIC",
		"issuer":                   cert.Issuer,
	})
}

// GetPublicStats handles GET /api/public/stats and GET /api/public/live-stats (FE-HP-01, BE-HP-01)
func (h *PublicHandler) GetPublicStats(c *gin.Context) {
	cacheKey := "public:stats"
	if h.cache != nil {
		var cached models.PublicStats
		if err := h.cache.Get(cacheKey, &cached); err == nil {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	stats, err := h.examRepo.GetPublicStats(c.Request.Context())
	if err != nil {
		log.Printf("[PublicHandler.GetPublicStats] error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil statistik publik"})
		return
	}

	if h.cache != nil {
		_ = h.cache.Set(cacheKey, stats, 30*time.Second) // 30s TTL
	}

	c.JSON(http.StatusOK, stats)
}
