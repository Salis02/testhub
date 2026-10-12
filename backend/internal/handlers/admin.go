package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"testhub/internal/database"
	"testhub/internal/models"
)

type AdminHandler struct {
	db *database.DB
}

func NewAdminHandler(db *database.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// GetStats handles GET /api/admin/stats
func (h *AdminHandler) GetStats(c *gin.Context) {
	var totalTests, publishedTests, totalSessions, totalCompletions int
	var avgScore sql.NullFloat64

	_ = h.db.Get(&totalTests, "SELECT COUNT(*) FROM tests WHERE is_deleted = false")
	_ = h.db.Get(&publishedTests, "SELECT COUNT(*) FROM tests WHERE is_deleted = false AND published = true")
	_ = h.db.Get(&totalSessions, "SELECT COUNT(*) FROM test_sessions")
	_ = h.db.Get(&totalCompletions, "SELECT COUNT(*) FROM test_results")
	_ = h.db.Get(&avgScore, "SELECT AVG(percentage_score) FROM test_results")

	var pendingEssays int
	_ = h.db.Get(&pendingEssays, `
		SELECT COUNT(*) FROM test_submissions ts
		JOIN test_questions tq ON ts.question_id = tq.id
		WHERE tq.question_type = 'essay' AND ts.score IS NULL
	`)

	completionRate := 0
	if totalSessions > 0 {
		completionRate = int(float64(totalCompletions) / float64(totalSessions) * 100.0)
	}

	averageScoreInt := 0
	if avgScore.Valid {
		averageScoreInt = int(avgScore.Float64)
	}

	c.JSON(http.StatusOK, models.AdminStats{
		TotalTests:               totalTests,
		PublishedTests:           publishedTests,
		TotalSessions:            totalSessions,
		TotalCompletions:         totalCompletions,
		CompletionRatePercentage: completionRate,
		AverageScorePercentage:   averageScoreInt,
		PendingEssays:            pendingEssays,
	})
}

// ListTests handles GET /api/admin/tests
func (h *AdminHandler) ListTests(c *gin.Context) {
	var tests []models.Test
	err := h.db.Select(&tests, "SELECT * FROM tests WHERE is_deleted = false ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat tes: " + err.Error()})
		return
	}
	if tests == nil {
		tests = []models.Test{}
	}
	c.JSON(http.StatusOK, tests)
}

// CreateTest handles POST /api/admin/tests
func (h *AdminHandler) CreateTest(c *gin.Context) {
	var req struct {
		Title                  string                `json:"title" binding:"required"`
		Description            string                `json:"description"`
		Category               string                `json:"category" binding:"required"`
		DurationMinutes        int                   `json:"duration_minutes" binding:"required"`
		PassingScorePercentage int                   `json:"passing_score_percentage"`
		ShuffleQuestions       bool                  `json:"shuffle_questions"`
		ShuffleAnswers         bool                  `json:"shuffle_answers"`
		Published              bool                  `json:"published"`
		Questions              []models.TestQuestion `json:"questions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan tidak valid: " + err.Error()})
		return
	}

	userID, _ := c.Get("user_id")
	var creatorID *string
	if uid, ok := userID.(string); ok && uid != "" {
		creatorID = &uid
	}

	testID := fmt.Sprintf("test-%s-%d", req.Category, time.Now().Unix())
	now := time.Now()

	passing := req.PassingScorePercentage
	if passing <= 0 {
		passing = 60
	}

	totalQuestions := len(req.Questions)

	test := models.Test{
		ID:                     testID,
		CreatorID:              creatorID,
		Title:                  req.Title,
		Description:            req.Description,
		Category:               req.Category,
		DurationMinutes:        req.DurationMinutes,
		PassingScorePercentage: passing,
		TotalQuestions:         totalQuestions,
		ShuffleQuestions:       req.ShuffleQuestions,
		ShuffleAnswers:         req.ShuffleAnswers,
		Published:              req.Published,
		IsDeleted:              false,
		CreatedAt:              now,
		UpdatedAt:              now,
	}

	tx, err := h.db.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
		return
	}
	defer tx.Rollback()

	insertTestSQL := `
		INSERT INTO tests (id, creator_id, title, description, category, duration_minutes, passing_score_percentage, total_questions, shuffle_questions, shuffle_answers, published, is_deleted, created_at, updated_at)
		VALUES (:id, :creator_id, :title, :description, :category, :duration_minutes, :passing_score_percentage, :total_questions, :shuffle_questions, :shuffle_answers, :published, :is_deleted, :created_at, :updated_at)
	`
	_, err = tx.NamedExec(insertTestSQL, test)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan tes: " + err.Error()})
		return
	}

	for idx, q := range req.Questions {
		qID := fmt.Sprintf("q-%s-%d", testID, idx+1)
		pts := q.Points
		if pts <= 0 {
			pts = 5
		}
		diff := q.DifficultyLevel
		if diff == "" {
			diff = "medium"
		}
		qType := q.QuestionType
		if qType == "" {
			qType = "multiple_choice"
		}

		insertQuestionSQL := `
			INSERT INTO test_questions (id, test_id, question_number, question_text, question_type, difficulty_level, explanation, points, is_deleted, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)
		`
		_, err = tx.Exec(insertQuestionSQL, qID, testID, idx+1, q.QuestionText, qType, diff, q.Explanation, pts, now)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan soal: " + err.Error()})
			return
		}

		for _, opt := range q.Options {
			optID := fmt.Sprintf("opt-%s-%s", qID, opt.OptionLetter)
			isCorrect := false
			if opt.IsCorrect != nil {
				isCorrect = *opt.IsCorrect
			}
			insertOptSQL := `
				INSERT INTO question_options (id, question_id, option_text, option_letter, is_correct, created_at)
				VALUES ($1, $2, $3, $4, $5, $6)
			`
			_, err = tx.Exec(insertOptSQL, optID, qID, opt.OptionText, opt.OptionLetter, isCorrect, now)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan opsi: " + err.Error()})
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengonfirmasi transaksi"})
		return
	}

	c.JSON(http.StatusCreated, test)
}

// TogglePublish handles POST/PATCH /api/admin/tests/:testId/toggle-publish and /api/admin/tests/:testId/publish
func (h *AdminHandler) TogglePublish(c *gin.Context) {
	testID := c.Param("testId")

	var current bool
	err := h.db.Get(&current, "SELECT published FROM tests WHERE id = $1 AND is_deleted = false", testID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	newStatus := !current
	_, err = h.db.Exec("UPDATE tests SET published = $1, updated_at = $2 WHERE id = $3", newStatus, time.Now(), testID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengubah status publikasi: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"published":    newStatus,
		"published_at": time.Now().Format(time.RFC3339),
	})
}

// DeleteTest handles DELETE /api/admin/tests/:testId
func (h *AdminHandler) DeleteTest(c *gin.Context) {
	testID := c.Param("testId")

	_, err := h.db.Exec("UPDATE tests SET is_deleted = true, updated_at = $1 WHERE id = $2", time.Now(), testID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus ujian: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetPendingEssays handles GET /api/admin/essays
func (h *AdminHandler) GetPendingEssays(c *gin.Context) {
	type EssayRow struct {
		ID              string    `db:"id"`
		TestID          string    `db:"test_id"`
		TestTitle       string    `db:"test_title"`
		SessionID       string    `db:"session_id"`
		QuestionID      string    `db:"question_id"`
		QuestionText    string    `db:"question_text"`
		UserAnswerText  string    `db:"user_answer_text"`
		Score           *float64  `db:"score"`
		AdminReviewNote *string   `db:"admin_review_note"`
		AdminReviewedAt *string   `db:"admin_reviewed_at"`
		SubmittedAt     time.Time `db:"submitted_at"`
	}

	query := `
		SELECT 
			ts.id,
			t.id AS test_id,
			t.title AS test_title,
			ts.session_id,
			ts.question_id,
			tq.question_text,
			COALESCE(ts.user_answer_text, '') AS user_answer_text,
			ts.score,
			ts.admin_review_note,
			TO_CHAR(ts.admin_reviewed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS admin_reviewed_at,
			ts.submitted_at
		FROM test_submissions ts
		JOIN test_questions tq ON ts.question_id = tq.id
		JOIN tests t ON tq.test_id = t.id
		WHERE tq.question_type = 'essay'
		ORDER BY ts.submitted_at DESC
	`

	var rows []EssayRow
	err := h.db.Select(&rows, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat esai: " + err.Error()})
		return
	}

	var results []models.EssaySubmission
	for _, r := range rows {
		results = append(results, models.EssaySubmission{
			ID:              r.ID,
			TestID:          r.TestID,
			TestTitle:       r.TestTitle,
			SessionID:       r.SessionID,
			QuestionID:      r.QuestionID,
			QuestionText:    r.QuestionText,
			UserAnswerText:  r.UserAnswerText,
			Score:           r.Score,
			AdminReviewNote: r.AdminReviewNote,
			AdminReviewedAt: r.AdminReviewedAt,
			SubmittedAt:     r.SubmittedAt.Format(time.RFC3339),
		})
	}

	if results == nil {
		results = []models.EssaySubmission{}
	}

	c.JSON(http.StatusOK, results)
}

// GradeEssay handles POST /api/admin/essays/:essayId/grade
func (h *AdminHandler) GradeEssay(c *gin.Context) {
	essayID := c.Param("essayId")

	var req models.GradeEssayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan tidak valid: " + err.Error()})
		return
	}

	now := time.Now()
	scoreFloat := float64(req.Score)

	updateSQL := `
		UPDATE test_submissions
		SET score = $1, admin_review_note = $2, admin_reviewed_at = $3
		WHERE id = $4
	`
	res, err := h.db.Exec(updateSQL, scoreFloat, req.Note, now, essayID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menilai esai: " + err.Error()})
		return
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Esai tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetAnalytics handles GET /api/admin/tests/:testId/analytics
func (h *AdminHandler) GetAnalytics(c *gin.Context) {
	testID := c.Param("testId")

	var test models.Test
	if err := h.db.Get(&test, "SELECT * FROM tests WHERE id = $1", testID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	var totalSubmissions int
	var avgScore sql.NullFloat64
	var passingCount int

	_ = h.db.Get(&totalSubmissions, "SELECT COUNT(*) FROM test_results WHERE test_id = $1", testID)
	_ = h.db.Get(&avgScore, "SELECT AVG(percentage_score) FROM test_results WHERE test_id = $1", testID)
	_ = h.db.Get(&passingCount, "SELECT COUNT(*) FROM test_results WHERE test_id = $1 AND passing = true", testID)

	passingRate := 0.0
	if totalSubmissions > 0 {
		passingRate = float64(passingCount) / float64(totalSubmissions) * 100.0
	}

	c.JSON(http.StatusOK, gin.H{
		"test_id":           test.ID,
		"test_title":        test.Title,
		"total_submissions": totalSubmissions,
		"average_score":     avgScore.Float64,
		"passing_rate":      passingRate,
	})
}
