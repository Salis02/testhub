package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"testhub/internal/cache"
	"testhub/internal/database"
	"testhub/internal/models"
	"testhub/internal/services"
)

type PublicHandler struct {
	db    *database.DB
	cache *cache.Client
}

func NewPublicHandler(db *database.DB, cache *cache.Client) *PublicHandler {
	return &PublicHandler{db: db, cache: cache}
}

// ListTests handles GET /api/tests
func (h *PublicHandler) ListTests(c *gin.Context) {
	category := c.Query("category")
	query := c.Query("query")
	if query == "" {
		query = c.Query("search")
	}

	sqlQuery := "SELECT * FROM tests WHERE is_deleted = false AND published = true"
	var args []interface{}
	argIdx := 1

	if category != "" && category != "all" {
		sqlQuery += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}

	if query != "" {
		sqlQuery += fmt.Sprintf(" AND (LOWER(title) LIKE $%d OR LOWER(description) LIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+query+"%")
		argIdx++
	}

	sqlQuery += " ORDER BY created_at DESC"

	var tests []models.Test
	err := h.db.Select(&tests, sqlQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat daftar ujian: " + err.Error()})
		return
	}

	if tests == nil {
		tests = []models.Test{}
	}

	c.JSON(http.StatusOK, tests)
}

// GetTest handles GET /api/tests/:testId
func (h *PublicHandler) GetTest(c *gin.Context) {
	testID := c.Param("testId")

	var test models.Test
	err := h.db.Get(&test, "SELECT * FROM tests WHERE id = $1 AND is_deleted = false", testID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, test)
}

// StartTest handles POST /api/tests/:testId/start
func (h *PublicHandler) StartTest(c *gin.Context) {
	testID := c.Param("testId")

	var test models.Test
	err := h.db.Get(&test, "SELECT * FROM tests WHERE id = $1 AND is_deleted = false AND published = true", testID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan atau belum dipublikasikan"})
		return
	}

	sessionID := "sess-" + uuid.New().String()[:8] + "-" + fmt.Sprintf("%d", time.Now().Unix())
	startedAt := time.Now()
	expiresAt := startedAt.Add(24 * time.Hour)

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	session := models.TestSession{
		ID:        sessionID,
		TestID:    test.ID,
		IPAddress: &clientIP,
		UserAgent: &userAgent,
		StartedAt: startedAt,
		ExpiresAt: expiresAt,
		IsActive:  true,
		CreatedAt: startedAt,
	}

	insertSessionSQL := `
		INSERT INTO test_sessions (id, test_id, ip_address, user_agent, started_at, expires_at, is_active, created_at)
		VALUES (:id, :test_id, :ip_address, :user_agent, :started_at, :expires_at, :is_active, :created_at)
	`
	_, err = h.db.NamedExec(insertSessionSQL, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi ujian: " + err.Error()})
		return
	}

	// Cache session
	_ = h.cache.Set("session:"+sessionID, session, 24*time.Hour)

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

	c.JSON(http.StatusOK, resp)
}

// GetQuestions handles GET /api/sessions/:sessionId/questions
func (h *PublicHandler) GetQuestions(c *gin.Context) {
	sessionID := c.Param("sessionId")

	var session models.TestSession
	err := h.db.Get(&session, "SELECT * FROM test_sessions WHERE id = $1 AND is_active = true", sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian tidak valid atau telah kedaluwarsa"})
		return
	}

	var test models.Test
	err = h.db.Get(&test, "SELECT * FROM tests WHERE id = $1", session.TestID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	var questions []models.TestQuestion
	err = h.db.Select(&questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", test.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat soal: " + err.Error()})
		return
	}

	for i := range questions {
		var options []models.QuestionOption
		err = h.db.Select(&options, "SELECT id, question_id, option_letter, option_text FROM question_options WHERE question_id = $1 ORDER BY option_letter ASC", questions[i].ID)
		if err == nil {
			// Strip is_correct for examinee privacy and security
			for j := range options {
				options[j].IsCorrect = nil
			}
			questions[i].Options = options
		} else {
			questions[i].Options = []models.QuestionOption{}
		}
		// Strip explanation during test taking
		questions[i].Explanation = ""
	}

	testMeta := struct {
		ID                     string `json:"id"`
		Title                  string `json:"title"`
		Category               string `json:"category"`
		DurationMinutes        int    `json:"duration_minutes"`
		TotalQuestions         int    `json:"total_questions"`
		PassingScorePercentage int    `json:"passing_score_percentage"`
	}{
		ID:                     test.ID,
		Title:                  test.Title,
		Category:               test.Category,
		DurationMinutes:        test.DurationMinutes,
		TotalQuestions:         test.TotalQuestions,
		PassingScorePercentage: test.PassingScorePercentage,
	}

	c.JSON(http.StatusOK, gin.H{
		"test":      testMeta,
		"questions": questions,
	})
}

// GetSubmissions handles GET /api/sessions/:sessionId/submissions
func (h *PublicHandler) GetSubmissions(c *gin.Context) {
	sessionID := c.Param("sessionId")

	type SubRow struct {
		QuestionID          string    `db:"question_id"`
		UserAnswerOptionID  *string   `db:"user_answer_option_id"`
		UserAnswerText      *string   `db:"user_answer_text"`
		IsFlagged           bool      `db:"is_flagged"`
		SubmittedAt         time.Time `db:"submitted_at"`
	}

	var rows []SubRow
	err := h.db.Select(&rows, "SELECT question_id, user_answer_option_id, user_answer_text, is_flagged, submitted_at FROM test_submissions WHERE session_id = $1", sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat jawaban: " + err.Error()})
		return
	}

	result := make(map[string]models.UserSubmission)
	for _, r := range rows {
		result[r.QuestionID] = models.UserSubmission{
			QuestionID:       r.QuestionID,
			SelectedOptionID: r.UserAnswerOptionID,
			AnswerText:       r.UserAnswerText,
			IsFlagged:        r.IsFlagged,
			AnsweredAt:       r.SubmittedAt.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, result)
}

// SubmitAnswer handles POST /api/sessions/:sessionId/submit-answer and /api/sessions/:sessionId/questions/:questionId/submit
func (h *PublicHandler) SubmitAnswer(c *gin.Context) {
	sessionID := c.Param("sessionId")
	qIDParam := c.Param("questionId")

	var body struct {
		QuestionID       string  `json:"question_id"`
		OptionID         *string `json:"optionId"`
		SelectedOptionID *string `json:"selected_option_id"`
		AnswerText       *string `json:"answerText"`
		AnswerTextAlt    *string `json:"answer_text"`
		IsFlagged        *bool   `json:"isFlagged"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan tidak valid: " + err.Error()})
		return
	}

	questionID := body.QuestionID
	if questionID == "" {
		questionID = qIDParam
	}
	if questionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "question_id wajib disertakan"})
		return
	}

	var selectedOption *string
	if body.OptionID != nil {
		selectedOption = body.OptionID
	} else if body.SelectedOptionID != nil {
		selectedOption = body.SelectedOptionID
	}

	var answerText *string
	if body.AnswerText != nil {
		answerText = body.AnswerText
	} else if body.AnswerTextAlt != nil {
		answerText = body.AnswerTextAlt
	}

	isFlagged := false
	if body.IsFlagged != nil {
		isFlagged = *body.IsFlagged
	}

	// Verify session exists
	var session models.TestSession
	if err := h.db.Get(&session, "SELECT * FROM test_sessions WHERE id = $1 AND is_active = true", sessionID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian tidak valid"})
		return
	}

	// Check if multiple choice and calculate is_correct
	var isCorrect *bool
	var score *float64
	if selectedOption != nil {
		var opt models.QuestionOption
		err := h.db.Get(&opt, "SELECT is_correct FROM question_options WHERE id = $1", *selectedOption)
		if err == nil && opt.IsCorrect != nil {
			isCorrect = opt.IsCorrect
			if *opt.IsCorrect {
				sc := 5.0
				score = &sc
			} else {
				sc := 0.0
				score = &sc
			}
		}
	}

	// Upsert submission
	var existingID string
	err := h.db.Get(&existingID, "SELECT id FROM test_submissions WHERE session_id = $1 AND question_id = $2", sessionID, questionID)
	now := time.Now()

	if err == sql.ErrNoRows {
		subID := uuid.New().String()
		insertSQL := `
			INSERT INTO test_submissions (id, session_id, question_id, user_answer_text, user_answer_option_id, is_correct, score, is_flagged, submitted_at, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`
		_, err = h.db.Exec(insertSQL, subID, sessionID, questionID, answerText, selectedOption, isCorrect, score, isFlagged, now, now)
	} else {
		updateSQL := `
			UPDATE test_submissions
			SET user_answer_text = $1, user_answer_option_id = $2, is_correct = $3, score = $4, is_flagged = $5, submitted_at = $6
			WHERE session_id = $7 AND question_id = $8
		`
		_, err = h.db.Exec(updateSQL, answerText, selectedOption, isCorrect, score, isFlagged, now, sessionID, questionID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan jawaban: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"savedAt": now.Format(time.RFC3339),
	})
}

// FinishTest handles POST /api/sessions/:sessionId/finish
func (h *PublicHandler) FinishTest(c *gin.Context) {
	sessionID := c.Param("sessionId")

	var req models.FinishTestRequest
	_ = c.ShouldBindJSON(&req)

	var session models.TestSession
	if err := h.db.Get(&session, "SELECT * FROM test_sessions WHERE id = $1", sessionID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian tidak ditemukan"})
		return
	}

	var test models.Test
	if err := h.db.Get(&test, "SELECT * FROM tests WHERE id = $1", session.TestID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	// Get all questions with options
	var questions []models.TestQuestion
	if err := h.db.Select(&questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", test.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat soal: " + err.Error()})
		return
	}

	for i := range questions {
		var options []models.QuestionOption
		_ = h.db.Select(&options, "SELECT id, question_id, option_letter, option_text, is_correct FROM question_options WHERE question_id = $1", questions[i].ID)
		questions[i].Options = options
	}

	// Get all submissions for session
	type SubRow struct {
		QuestionID         string    `db:"question_id"`
		UserAnswerOptionID *string   `db:"user_answer_option_id"`
		UserAnswerText     *string   `db:"user_answer_text"`
		IsFlagged          bool      `db:"is_flagged"`
		SubmittedAt        time.Time `db:"submitted_at"`
	}

	var rows []SubRow
	_ = h.db.Select(&rows, "SELECT question_id, user_answer_option_id, user_answer_text, is_flagged, submitted_at FROM test_submissions WHERE session_id = $1", sessionID)

	submissions := make(map[string]models.UserSubmission)
	for _, r := range rows {
		submissions[r.QuestionID] = models.UserSubmission{
			QuestionID:       r.QuestionID,
			SelectedOptionID: r.UserAnswerOptionID,
			AnswerText:       r.UserAnswerText,
			IsFlagged:        r.IsFlagged,
			AnsweredAt:       r.SubmittedAt.Format(time.RFC3339),
		}
	}

	// Calculate score
	scoring := services.CalculateScore(questions, submissions, test.PassingScorePercentage)

	// Time spent
	timeSpent := req.TimeSpentSeconds
	if timeSpent <= 0 {
		timeSpent = int(time.Since(session.StartedAt).Seconds())
	}
	maxDurationSec := test.DurationMinutes * 60
	if timeSpent > maxDurationSec {
		timeSpent = maxDurationSec
	}

	// Mark session submitted
	now := time.Now()
	_, _ = h.db.Exec("UPDATE test_sessions SET submitted_at = $1, is_active = false WHERE id = $2", now, sessionID)

	resultID := "res-" + uuid.New().String()[:8]
	breakdownJSON, _ := json.Marshal(scoring.CategoryBreakdown)
	submissionsJSON, _ := json.Marshal(submissions)

	result := models.TestResult{
		ID:                     resultID,
		SessionID:              sessionID,
		TestID:                 test.ID,
		TestTitle:              test.Title,
		Category:               test.Category,
		TotalScore:             scoring.TotalScore,
		PercentageScore:        scoring.PercentageScore,
		Passing:                scoring.Passing,
		PassingScorePercentage: test.PassingScorePercentage,
		TimeSpentSeconds:       timeSpent,
		DurationSeconds:        maxDurationSec,
		QuestionsAnswered:      scoring.QuestionsAnswered,
		QuestionsCorrect:       scoring.QuestionsCorrect,
		TotalQuestions:         len(questions),
		Percentile:             scoring.Percentile,
		CategoryBreakdown:      scoring.CategoryBreakdown,
		Submissions:            submissions,
		SubmittedAt:            now,
		CreatedAt:              now,
	}

	insertResultSQL := `
		INSERT INTO test_results 
		(id, session_id, test_id, test_title, category, total_score, percentage_score, passing, passing_score_percentage,
		 time_spent_seconds, duration_seconds, questions_answered, questions_correct, total_questions, percentile,
		 category_breakdown, submissions, submitted_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
	`

	_, err := h.db.Exec(insertResultSQL,
		result.ID, result.SessionID, result.TestID, result.TestTitle, result.Category,
		result.TotalScore, result.PercentageScore, result.Passing, result.PassingScorePercentage,
		result.TimeSpentSeconds, result.DurationSeconds, result.QuestionsAnswered, result.QuestionsCorrect,
		result.TotalQuestions, result.Percentile, breakdownJSON, submissionsJSON, result.SubmittedAt, result.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan hasil tes: " + err.Error()})
		return
	}

	// Cache result
	_ = h.cache.Set("result:"+resultID, result, 7*24*time.Hour)

	c.JSON(http.StatusOK, result)
}

// GetResult handles GET /api/results/:resultId
func (h *PublicHandler) GetResult(c *gin.Context) {
	resultID := c.Param("resultId")

	type ResultRow struct {
		ID                     string    `db:"id"`
		SessionID              string    `db:"session_id"`
		TestID                 string    `db:"test_id"`
		TestTitle              string    `db:"test_title"`
		Category               string    `db:"category"`
		TotalScore             float64   `db:"total_score"`
		PercentageScore        float64   `db:"percentage_score"`
		Passing                bool      `db:"passing"`
		PassingScorePercentage int       `db:"passing_score_percentage"`
		TimeSpentSeconds       int       `db:"time_spent_seconds"`
		DurationSeconds        int       `db:"duration_seconds"`
		QuestionsAnswered      int       `db:"questions_answered"`
		QuestionsCorrect       int       `db:"questions_correct"`
		TotalQuestions         int       `db:"total_questions"`
		Percentile             int       `db:"percentile"`
		CategoryBreakdownJSON  []byte    `db:"category_breakdown"`
		SubmissionsJSON        []byte    `db:"submissions"`
		SubmittedAt            time.Time `db:"submitted_at"`
		CreatedAt              time.Time `db:"created_at"`
	}

	var row ResultRow
	err := h.db.Get(&row, "SELECT * FROM test_results WHERE id = $1", resultID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hasil ujian tidak ditemukan"})
		return
	}

	var breakdown []models.CategoryScore
	if len(row.CategoryBreakdownJSON) > 0 {
		_ = json.Unmarshal(row.CategoryBreakdownJSON, &breakdown)
	}

	var submissions map[string]models.UserSubmission
	if len(row.SubmissionsJSON) > 0 {
		_ = json.Unmarshal(row.SubmissionsJSON, &submissions)
	}

	result := models.TestResult{
		ID:                     row.ID,
		SessionID:              row.SessionID,
		TestID:                 row.TestID,
		TestTitle:              row.TestTitle,
		Category:               row.Category,
		TotalScore:             row.TotalScore,
		PercentageScore:        row.PercentageScore,
		Passing:                row.Passing,
		PassingScorePercentage: row.PassingScorePercentage,
		TimeSpentSeconds:       row.TimeSpentSeconds,
		DurationSeconds:        row.DurationSeconds,
		QuestionsAnswered:      row.QuestionsAnswered,
		QuestionsCorrect:       row.QuestionsCorrect,
		TotalQuestions:         row.TotalQuestions,
		Percentile:             row.Percentile,
		CategoryBreakdown:      breakdown,
		Submissions:            submissions,
		SubmittedAt:            row.SubmittedAt,
		CreatedAt:              row.CreatedAt,
	}

	// Get full questions with explanations and correct options for post-test review
	var questions []models.TestQuestion
	_ = h.db.Select(&questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", result.TestID)

	for i := range questions {
		var options []models.QuestionOption
		_ = h.db.Select(&options, "SELECT id, question_id, option_letter, option_text, is_correct FROM question_options WHERE question_id = $1 ORDER BY option_letter ASC", questions[i].ID)
		questions[i].Options = options
	}

	c.JSON(http.StatusOK, gin.H{
		"result":    result,
		"questions": questions,
	})
}
