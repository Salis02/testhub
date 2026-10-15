package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"testhub/internal/database"
	"testhub/internal/models"
	"testhub/internal/services"
)

type testResultRow struct {
	ID                     string    `db:"id"`
	SessionID              string    `db:"session_id"`
	TestID                 string    `db:"test_id"`
	UserID                 *string   `db:"user_id"`
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

func (row *testResultRow) toModel() *models.TestResult {
	var breakdown []models.CategoryScore
	if len(row.CategoryBreakdownJSON) > 0 {
		_ = json.Unmarshal(row.CategoryBreakdownJSON, &breakdown)
	}
	var submissions map[string]models.UserSubmission
	if len(row.SubmissionsJSON) > 0 {
		_ = json.Unmarshal(row.SubmissionsJSON, &submissions)
	}
	return &models.TestResult{
		ID:                     row.ID,
		SessionID:              row.SessionID,
		TestID:                 row.TestID,
		UserID:                 row.UserID,
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
}

var (
	ErrSessionNotFound = errors.New("sesi ujian tidak ditemukan")
	ErrSessionInactive = errors.New("sesi ujian sudah selesai atau tidak aktif")
	ErrResultNotFound  = errors.New("hasil ujian tidak ditemukan")
)

// ExamRepository defines the contract for examinee test taking, scoring, and certification
type ExamRepository interface {
	ListPublicTests(ctx context.Context, category string, query string) ([]models.Test, error)
	GetPublicTest(ctx context.Context, testID string) (*models.Test, error)
	CreateSession(ctx context.Context, session *models.TestSession) error
	GetSessionByID(ctx context.Context, sessionID string) (*models.TestSession, error)
	GetSessionQuestions(ctx context.Context, sessionID string) (*models.Test, []models.TestQuestion, error)
	GetSubmissionsBySession(ctx context.Context, sessionID string) (map[string]models.UserSubmission, error)
	SaveSubmission(ctx context.Context, sessionID string, questionID string, optionID *string, answerText *string, isFlagged bool) (*time.Time, error)
	FinishExamTx(ctx context.Context, sessionID string, timeSpentSeconds int) (*models.TestResult, error)
	GetResultByID(ctx context.Context, resultID string) (*models.TestResult, []models.TestQuestion, error)
	GetLeaderboard(ctx context.Context, testID string, limit int) ([]models.LeaderboardEntry, error)
	GetCertificate(ctx context.Context, resultID string) (*models.CertificateData, error)
	GetUserExamHistory(ctx context.Context, userID string, limit, offset int) ([]models.UserExamHistoryItem, int, error)
	GetUserExamStats(ctx context.Context, userID string) (*models.UserExamStats, error)
}

type PostgresExamRepository struct {
	db *database.DB
}

func NewPostgresExamRepository(db *database.DB) *PostgresExamRepository {
	return &PostgresExamRepository{db: db}
}

// ListPublicTests retrieves active and published tests with optional category and search filters
func (r *PostgresExamRepository) ListPublicTests(ctx context.Context, category string, query string) ([]models.Test, error) {
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
		args = append(args, "%"+strings.ToLower(query)+"%")
		argIdx++
	}

	sqlQuery += " ORDER BY created_at DESC"

	var tests []models.Test
	err := r.db.SelectContext(ctx, &tests, sqlQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("list public tests: %w", err)
	}

	if tests == nil {
		tests = []models.Test{}
	}
	return tests, nil
}

// GetPublicTest retrieves a published test by ID
func (r *PostgresExamRepository) GetPublicTest(ctx context.Context, testID string) (*models.Test, error) {
	var test models.Test
	err := r.db.GetContext(ctx, &test, "SELECT * FROM tests WHERE id = $1 AND is_deleted = false AND published = true", testID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTestNotFound
		}
		return nil, fmt.Errorf("get public test %s: %w", testID, err)
	}
	return &test, nil
}

// CreateSession persists a new exam session
func (r *PostgresExamRepository) CreateSession(ctx context.Context, session *models.TestSession) error {
	query := `
		INSERT INTO test_sessions (id, test_id, user_id, ip_address, user_agent, started_at, expires_at, is_active, created_at)
		VALUES (:id, :test_id, :user_id, :ip_address, :user_agent, :started_at, :expires_at, :is_active, :created_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, session)
	if err != nil {
		return fmt.Errorf("create test session: %w", err)
	}
	return nil
}

// GetSessionByID retrieves a session by its ID
func (r *PostgresExamRepository) GetSessionByID(ctx context.Context, sessionID string) (*models.TestSession, error) {
	var session models.TestSession
	err := r.db.GetContext(ctx, &session, "SELECT * FROM test_sessions WHERE id = $1", sessionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("get session %s: %w", sessionID, err)
	}
	return &session, nil
}

// attachBatchOptions loads all question options in a single batch query (Anti N+1)
func (r *PostgresExamRepository) attachBatchOptions(ctx context.Context, tx *sqlx.Tx, questions []models.TestQuestion, includeCorrect bool) error {
	if len(questions) == 0 {
		return nil
	}
	questionIDs := make([]string, len(questions))
	for i, q := range questions {
		questionIDs[i] = q.ID
	}

	var query string
	if includeCorrect {
		query = "SELECT id, question_id, option_letter, option_text, is_correct FROM question_options WHERE question_id IN (?) ORDER BY option_letter ASC"
	} else {
		query = "SELECT id, question_id, option_letter, option_text FROM question_options WHERE question_id IN (?) ORDER BY option_letter ASC"
	}

	inQuery, args, err := sqlx.In(query, questionIDs)
	if err != nil {
		return fmt.Errorf("build batch options query: %w", err)
	}

	var allOptions []models.QuestionOption
	if tx != nil {
		inQuery = tx.Rebind(inQuery)
		err = tx.SelectContext(ctx, &allOptions, inQuery, args...)
	} else {
		inQuery = r.db.Rebind(inQuery)
		err = r.db.SelectContext(ctx, &allOptions, inQuery, args...)
	}
	if err != nil {
		return fmt.Errorf("select batch options: %w", err)
	}

	optionsByQ := make(map[string][]models.QuestionOption)
	for _, opt := range allOptions {
		if !includeCorrect {
			opt.IsCorrect = nil
		}
		optionsByQ[opt.QuestionID] = append(optionsByQ[opt.QuestionID], opt)
	}

	for i := range questions {
		questions[i].Options = optionsByQ[questions[i].ID]
	}
	return nil
}

// GetSessionQuestions fetches sanitized questions and options for exam taking (strips correct answers)
func (r *PostgresExamRepository) GetSessionQuestions(ctx context.Context, sessionID string) (*models.Test, []models.TestQuestion, error) {
	session, err := r.GetSessionByID(ctx, sessionID)
	if err != nil {
		return nil, nil, err
	}

	var test models.Test
	err = r.db.GetContext(ctx, &test, "SELECT * FROM tests WHERE id = $1", session.TestID)
	if err != nil {
		return nil, nil, fmt.Errorf("get test for session %s: %w", sessionID, err)
	}

	var questions []models.TestQuestion
	err = r.db.SelectContext(ctx, &questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", test.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("select questions for test %s: %w", test.ID, err)
	}

	for i := range questions {
		questions[i].Explanation = "" // Strip explanation during test taking
	}

	if err := r.attachBatchOptions(ctx, nil, questions, false); err != nil {
		return nil, nil, fmt.Errorf("attach options for test %s: %w", test.ID, err)
	}

	return &test, questions, nil
}

// GetSubmissionsBySession returns all saved examinee submissions mapped by question ID
func (r *PostgresExamRepository) GetSubmissionsBySession(ctx context.Context, sessionID string) (map[string]models.UserSubmission, error) {
	type subRow struct {
		QuestionID         string    `db:"question_id"`
		UserAnswerOptionID *string   `db:"user_answer_option_id"`
		UserAnswerText     *string   `db:"user_answer_text"`
		IsFlagged          bool      `db:"is_flagged"`
		SubmittedAt        time.Time `db:"submitted_at"`
	}

	var rows []subRow
	query := "SELECT question_id, user_answer_option_id, user_answer_text, is_flagged, submitted_at FROM test_submissions WHERE session_id = $1"
	err := r.db.SelectContext(ctx, &rows, query, sessionID)
	if err != nil {
		return nil, fmt.Errorf("select submissions for session %s: %w", sessionID, err)
	}

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
	return submissions, nil
}

// SaveSubmission atomically upserts an examinee submission and calculates points if multiple choice
func (r *PostgresExamRepository) SaveSubmission(ctx context.Context, sessionID string, questionID string, optionID *string, answerText *string, isFlagged bool) (*time.Time, error) {
	session, err := r.GetSessionByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if !session.IsActive {
		return nil, ErrSessionInactive
	}

	var isCorrect *bool
	var score *float64
	if optionID != nil && *optionID != "" {
		var opt struct {
			IsCorrect *bool `db:"is_correct"`
			Points    int   `db:"points"`
		}
		query := `
			SELECT qo.is_correct, tq.points 
			FROM question_options qo
			JOIN test_questions tq ON tq.id = qo.question_id
			WHERE qo.id = $1
		`
		err := r.db.GetContext(ctx, &opt, query, *optionID)
		if err == nil && opt.IsCorrect != nil {
			isCorrect = opt.IsCorrect
			pts := float64(opt.Points)
			if pts <= 0 {
				pts = 5.0
			}
			if *opt.IsCorrect {
				score = &pts
			} else {
				sc := 0.0
				score = &sc
			}
		}
	}

	var existingID string
	err = r.db.GetContext(ctx, &existingID, "SELECT id FROM test_submissions WHERE session_id = $1 AND question_id = $2", sessionID, questionID)
	now := time.Now()

	if err != nil && errors.Is(err, sql.ErrNoRows) {
		subID := uuid.New().String()
		insertSQL := `
			INSERT INTO test_submissions (id, session_id, question_id, user_answer_text, user_answer_option_id, is_correct, score, is_flagged, submitted_at, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`
		_, err = r.db.ExecContext(ctx, insertSQL, subID, sessionID, questionID, answerText, optionID, isCorrect, score, isFlagged, now, now)
	} else if err == nil {
		updateSQL := `
			UPDATE test_submissions
			SET user_answer_text = $1, user_answer_option_id = $2, is_correct = $3, score = $4, is_flagged = $5, submitted_at = $6
			WHERE session_id = $7 AND question_id = $8
		`
		_, err = r.db.ExecContext(ctx, updateSQL, answerText, optionID, isCorrect, score, isFlagged, now, sessionID, questionID)
	}

	if err != nil {
		return nil, fmt.Errorf("upsert submission for session %s question %s: %w", sessionID, questionID, err)
	}

	return &now, nil
}

// FinishExamTx atomically evaluates submissions, locks session, and stores test_results
func (r *PostgresExamRepository) FinishExamTx(ctx context.Context, sessionID string, timeSpentSeconds int) (*models.TestResult, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin finish exam transaction: %w", err)
	}
	defer tx.Rollback()

	var session models.TestSession
	err = tx.GetContext(ctx, &session, "SELECT * FROM test_sessions WHERE id = $1 FOR UPDATE", sessionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("get session for finish: %w", err)
	}

	// Idempotency: if session was already finished/inactive, return existing test_result immediately
	if session.SubmittedAt != nil || !session.IsActive {
		var existingRow testResultRow
		err = tx.GetContext(ctx, &existingRow, "SELECT * FROM test_results WHERE session_id = $1", sessionID)
		if err == nil {
			return existingRow.toModel(), nil
		}
	}

	var test models.Test
	err = tx.GetContext(ctx, &test, "SELECT * FROM tests WHERE id = $1", session.TestID)
	if err != nil {
		return nil, fmt.Errorf("get test %s: %w", session.TestID, err)
	}

	var questions []models.TestQuestion
	err = tx.SelectContext(ctx, &questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", test.ID)
	if err != nil {
		return nil, fmt.Errorf("select questions for finish: %w", err)
	}

	if err := r.attachBatchOptions(ctx, tx, questions, true); err != nil {
		return nil, fmt.Errorf("attach batch options for finish: %w", err)
	}

	type subRow struct {
		QuestionID         string    `db:"question_id"`
		UserAnswerOptionID *string   `db:"user_answer_option_id"`
		UserAnswerText     *string   `db:"user_answer_text"`
		IsFlagged          bool      `db:"is_flagged"`
		SubmittedAt        time.Time `db:"submitted_at"`
	}

	var rows []subRow
	err = tx.SelectContext(ctx, &rows, "SELECT question_id, user_answer_option_id, user_answer_text, is_flagged, submitted_at FROM test_submissions WHERE session_id = $1", sessionID)
	if err != nil {
		return nil, fmt.Errorf("select submissions for finish: %w", err)
	}

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

	scoring := services.CalculateScore(questions, submissions, test.PassingScorePercentage)

	timeSpent := timeSpentSeconds
	if timeSpent <= 0 {
		timeSpent = int(time.Since(session.StartedAt).Seconds())
	}
	maxDurationSec := test.DurationMinutes * 60
	if timeSpent > maxDurationSec {
		timeSpent = maxDurationSec
	}

	now := time.Now()
	_, err = tx.ExecContext(ctx, "UPDATE test_sessions SET submitted_at = $1, is_active = false WHERE id = $2", now, sessionID)
	if err != nil {
		return nil, fmt.Errorf("update session status: %w", err)
	}

	resultID := "res-" + uuid.New().String()[:8]
	breakdownJSON, _ := json.Marshal(scoring.CategoryBreakdown)
	submissionsJSON, _ := json.Marshal(submissions)

	result := models.TestResult{
		ID:                     resultID,
		SessionID:              sessionID,
		TestID:                 test.ID,
		TestTitle:              test.Title,
		Category:               test.Category,
		UserID:                 session.UserID,
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
		(id, session_id, test_id, user_id, test_title, category, total_score, percentage_score, passing, passing_score_percentage,
		 time_spent_seconds, duration_seconds, questions_answered, questions_correct, total_questions, percentile,
		 category_breakdown, submissions, submitted_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
	`
	_, err = tx.ExecContext(ctx, insertResultSQL,
		result.ID, result.SessionID, result.TestID, result.UserID, result.TestTitle, result.Category,
		result.TotalScore, result.PercentageScore, result.Passing, result.PassingScorePercentage,
		result.TimeSpentSeconds, result.DurationSeconds, result.QuestionsAnswered, result.QuestionsCorrect,
		result.TotalQuestions, result.Percentile, breakdownJSON, submissionsJSON, result.SubmittedAt, result.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert test_results: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit finish exam transaction: %w", err)
	}

	return &result, nil
}

// GetResultByID retrieves test result and full questions with explanations for review
func (r *PostgresExamRepository) GetResultByID(ctx context.Context, resultID string) (*models.TestResult, []models.TestQuestion, error) {
	var row testResultRow
	err := r.db.GetContext(ctx, &row, "SELECT * FROM test_results WHERE id = $1", resultID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil, ErrResultNotFound
		}
		return nil, nil, fmt.Errorf("get test result %s: %w", resultID, err)
	}

	result := row.toModel()

	var questions []models.TestQuestion
	_ = r.db.SelectContext(ctx, &questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", result.TestID)
	_ = r.attachBatchOptions(ctx, nil, questions, true)

	return result, questions, nil
}

// GetLeaderboard retrieves top 50 participants for a test
func (r *PostgresExamRepository) GetLeaderboard(ctx context.Context, testID string, limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT 
			session_id,
			total_score,
			percentage_score,
			passing,
			time_spent_seconds,
			submitted_at
		FROM test_results
		WHERE test_id = $1
		ORDER BY percentage_score DESC, time_spent_seconds ASC, submitted_at ASC
		LIMIT $2
	`
	type leaderboardRow struct {
		SessionID        string    `db:"session_id"`
		TotalScore       float64   `db:"total_score"`
		PercentageScore  float64   `db:"percentage_score"`
		Passing          bool      `db:"passing"`
		TimeSpentSeconds int       `db:"time_spent_seconds"`
		SubmittedAt      time.Time `db:"submitted_at"`
	}

	var rows []leaderboardRow
	err := r.db.SelectContext(ctx, &rows, query, testID, limit)
	if err != nil {
		return nil, fmt.Errorf("select leaderboard for test %s: %w", testID, err)
	}

	var entries []models.LeaderboardEntry
	for i, row := range rows {
		displayName := fmt.Sprintf("Peserta #%d", i+1)
		if len(row.SessionID) > 8 {
			displayName = fmt.Sprintf("Peserta %s", row.SessionID[len(row.SessionID)-4:])
		}

		entries = append(entries, models.LeaderboardEntry{
			Rank:             i + 1,
			SessionID:        row.SessionID,
			UserIdentifier:   displayName,
			Score:            row.TotalScore,
			PercentageScore:  row.PercentageScore,
			TimeSpentSeconds: row.TimeSpentSeconds,
			SubmittedAt:      row.SubmittedAt,
		})
	}

	if entries == nil {
		entries = []models.LeaderboardEntry{}
	}
	return entries, nil
}

// GetCertificate returns official verification certificate data for an exam result
func (r *PostgresExamRepository) GetCertificate(ctx context.Context, resultID string) (*models.CertificateData, error) {
	var row struct {
		ID                     string    `db:"id"`
		TestID                 string    `db:"test_id"`
		TestTitle              string    `db:"test_title"`
		Category               string    `db:"category"`
		PercentageScore        float64   `db:"percentage_score"`
		Passing                bool      `db:"passing"`
		PassingScorePercentage int       `db:"passing_score_percentage"`
		SubmittedAt            time.Time `db:"submitted_at"`
	}

	err := r.db.GetContext(ctx, &row, "SELECT id, test_id, test_title, category, percentage_score, passing, passing_score_percentage, submitted_at FROM test_results WHERE id = $1", resultID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrResultNotFound
		}
		return nil, fmt.Errorf("get certificate row %s: %w", resultID, err)
	}

	certID := fmt.Sprintf("CERT-%s", row.ID)
	data := models.CertificateData{
		CertificateID:          certID,
		ResultID:               row.ID,
		TestID:                 row.TestID,
		TestTitle:              row.TestTitle,
		Category:               row.Category,
		PercentageScore:        row.PercentageScore,
		Passing:                row.Passing,
		PassingScorePercentage: row.PassingScorePercentage,
		IssuedAt:               row.SubmittedAt,
		VerificationURL:        fmt.Sprintf("/api/verify/certificate/%s", certID),
		Issuer:                 "TestHub Assessment Cloud",
	}
	return &data, nil
}

// GetUserExamHistory returns paginated exam results for a logged-in user
func (r *PostgresExamRepository) GetUserExamHistory(ctx context.Context, userID string, limit, offset int) ([]models.UserExamHistoryItem, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	countQuery := "SELECT COUNT(*) FROM test_results WHERE user_id = $1"
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("count user exam history: %w", err)
	}

	query := `
		SELECT 
			id AS result_id,
			session_id,
			test_id,
			test_title,
			category,
			total_score,
			percentage_score,
			passing,
			passing_score_percentage,
			time_spent_seconds,
			total_questions,
			questions_correct,
			submitted_at
		FROM test_results
		WHERE user_id = $1
		ORDER BY submitted_at DESC
		LIMIT $2 OFFSET $3
	`
	var items []models.UserExamHistoryItem
	err = r.db.SelectContext(ctx, &items, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("select user exam history: %w", err)
	}
	if items == nil {
		items = []models.UserExamHistoryItem{}
	}

	return items, total, nil
}

// GetUserExamStats returns aggregated performance metrics for a user
func (r *PostgresExamRepository) GetUserExamStats(ctx context.Context, userID string) (*models.UserExamStats, error) {
	query := `
		SELECT 
			COUNT(*) AS total_exams_taken,
			COUNT(CASE WHEN passing = true THEN 1 END) AS total_passed,
			COALESCE(AVG(percentage_score), 0) AS average_score,
			COALESCE(MAX(percentage_score), 0) AS highest_score
		FROM test_results
		WHERE user_id = $1
	`
	var stats struct {
		TotalExamsTaken int     `db:"total_exams_taken"`
		TotalPassed     int     `db:"total_passed"`
		AverageScore    float64 `db:"average_score"`
		HighestScore    float64 `db:"highest_score"`
	}

	err := r.db.GetContext(ctx, &stats, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get user exam stats: %w", err)
	}

	return &models.UserExamStats{
		TotalExamsTaken: stats.TotalExamsTaken,
		TotalPassed:     stats.TotalPassed,
		AverageScore:    stats.AverageScore,
		HighestScore:    stats.HighestScore,
	}, nil
}

