package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"testhub/internal/database"
	"testhub/internal/models"
)

var (
	ErrTestNotFound = errors.New("ujian tidak ditemukan")
)

// TestRepository defines the contract for test data persistence
type TestRepository interface {
	CreateTestTx(ctx context.Context, test *models.Test, questions []models.TestQuestion) error
	UpdateTestTx(ctx context.Context, test *models.Test, questions []models.TestQuestion) error
	GetTestByID(ctx context.Context, testID string) (*models.Test, error)
	GetTestWithQuestions(ctx context.Context, testID string, hideAnswers bool) (*models.Test, []models.TestQuestion, error)
	ListTests(ctx context.Context, onlyPublished bool) ([]models.Test, error)
	TogglePublish(ctx context.Context, testID string) (bool, error)
	DeleteTest(ctx context.Context, testID string) error
	GetStats(ctx context.Context) (*models.AdminStats, error)
	GetAnalytics(ctx context.Context, testID string) (*models.TestAnalytics, error)
	RecordAuditLog(ctx context.Context, log *models.AdminAuditLog) error
	GetAuditLogs(ctx context.Context, limit, offset int) ([]models.AdminAuditLog, error)
}

// PostgresTestRepository implements TestRepository using PostgreSQL and sqlx
type PostgresTestRepository struct {
	db *database.DB
}

func NewPostgresTestRepository(db *database.DB) *PostgresTestRepository {
	return &PostgresTestRepository{db: db}
}

// CreateTestTx inserts a new test with its questions and options in an atomic transaction
func (r *PostgresTestRepository) CreateTestTx(ctx context.Context, test *models.Test, questions []models.TestQuestion) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("memulai transaksi create test: %w", err)
	}
	defer tx.Rollback()

	insertTestSQL := `
		INSERT INTO tests (id, creator_id, title, description, category, duration_minutes, passing_score_percentage, total_questions, price_idr, shuffle_questions, shuffle_answers, published, is_deleted, created_at, updated_at)
		VALUES (:id, :creator_id, :title, :description, :category, :duration_minutes, :passing_score_percentage, :total_questions, :price_idr, :shuffle_questions, :shuffle_answers, :published, :is_deleted, :created_at, :updated_at)
	`
	_, err = tx.NamedExecContext(ctx, insertTestSQL, test)
	if err != nil {
		return fmt.Errorf("insert tests: %w", err)
	}

	for idx, q := range questions {
		now := time.Now()
		insertQuestionSQL := `
			INSERT INTO test_questions (id, test_id, question_number, question_text, question_type, media_url, difficulty_level, explanation, points, is_deleted, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10)
		`
		_, err = tx.ExecContext(ctx, insertQuestionSQL, q.ID, test.ID, idx+1, q.QuestionText, q.QuestionType, q.MediaURL, q.DifficultyLevel, q.Explanation, q.Points, now)
		if err != nil {
			return fmt.Errorf("insert question %s: %w", q.ID, err)
		}

		for _, opt := range q.Options {
			isCorrect := false
			if opt.IsCorrect != nil {
				isCorrect = *opt.IsCorrect
			}
			insertOptSQL := `
				INSERT INTO question_options (id, question_id, option_text, option_letter, is_correct, created_at)
				VALUES ($1, $2, $3, $4, $5, $6)
			`
			_, err = tx.ExecContext(ctx, insertOptSQL, opt.ID, q.ID, opt.OptionText, opt.OptionLetter, isCorrect, now)
			if err != nil {
				return fmt.Errorf("insert option %s: %w", opt.ID, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit create test: %w", err)
	}

	return nil
}

// UpdateTestTx atomically updates test metadata and replaces its questions and options
func (r *PostgresTestRepository) UpdateTestTx(ctx context.Context, test *models.Test, questions []models.TestQuestion) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("memulai transaksi update test: %w", err)
	}
	defer tx.Rollback()

	updateTestSQL := `
		UPDATE tests 
		SET title = $1, description = $2, category = $3, duration_minutes = $4,
		    passing_score_percentage = $5, total_questions = $6, price_idr = $7,
		    shuffle_questions = $8, shuffle_answers = $9, published = $10, updated_at = $11
		WHERE id = $12 AND is_deleted = false
	`
	res, err := tx.ExecContext(ctx, updateTestSQL,
		test.Title, test.Description, test.Category, test.DurationMinutes,
		test.PassingScorePercentage, test.TotalQuestions, test.PriceIDR, test.ShuffleQuestions,
		test.ShuffleAnswers, test.Published, test.UpdatedAt, test.ID,
	)
	if err != nil {
		return fmt.Errorf("update tests: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil || rows == 0 {
		return ErrTestNotFound
	}

	if questions != nil {
		// Clean existing questions (CASCADE deletes question_options automatically)
		_, err = tx.ExecContext(ctx, "DELETE FROM test_questions WHERE test_id = $1", test.ID)
		if err != nil {
			return fmt.Errorf("delete old questions: %w", err)
		}

		now := time.Now()
		for idx, q := range questions {
			insertQuestionSQL := `
				INSERT INTO test_questions (id, test_id, question_number, question_text, question_type, media_url, difficulty_level, explanation, points, is_deleted, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10)
			`
			_, err = tx.ExecContext(ctx, insertQuestionSQL, q.ID, test.ID, idx+1, q.QuestionText, q.QuestionType, q.MediaURL, q.DifficultyLevel, q.Explanation, q.Points, now)
			if err != nil {
				return fmt.Errorf("insert updated question %s: %w", q.ID, err)
			}

			for _, opt := range q.Options {
				isCorrect := false
				if opt.IsCorrect != nil {
					isCorrect = *opt.IsCorrect
				}
				insertOptSQL := `
					INSERT INTO question_options (id, question_id, option_text, option_letter, is_correct, created_at)
					VALUES ($1, $2, $3, $4, $5, $6)
				`
				_, err = tx.ExecContext(ctx, insertOptSQL, opt.ID, q.ID, opt.OptionText, opt.OptionLetter, isCorrect, now)
				if err != nil {
					return fmt.Errorf("insert updated option %s: %w", opt.ID, err)
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit update test: %w", err)
	}

	return nil
}

// GetTestByID returns the test metadata by ID
func (r *PostgresTestRepository) GetTestByID(ctx context.Context, testID string) (*models.Test, error) {
	var test models.Test
	err := r.db.GetContext(ctx, &test, "SELECT * FROM tests WHERE id = $1 AND is_deleted = false", testID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTestNotFound
		}
		return nil, err
	}
	return &test, nil
}

// GetTestWithQuestions returns the test metadata with all questions and options
func (r *PostgresTestRepository) GetTestWithQuestions(ctx context.Context, testID string, hideAnswers bool) (*models.Test, []models.TestQuestion, error) {
	test, err := r.GetTestByID(ctx, testID)
	if err != nil {
		return nil, nil, err
	}

	var questions []models.TestQuestion
	err = r.db.SelectContext(ctx, &questions, "SELECT * FROM test_questions WHERE test_id = $1 AND is_deleted = false ORDER BY question_number ASC", testID)
	if err != nil {
		return nil, nil, fmt.Errorf("select questions: %w", err)
	}

	for i := range questions {
		var options []models.QuestionOption
		err = r.db.SelectContext(ctx, &options, "SELECT id, question_id, option_letter, option_text, is_correct FROM question_options WHERE question_id = $1 ORDER BY option_letter ASC", questions[i].ID)
		if err == nil {
			if hideAnswers {
				for j := range options {
					options[j].IsCorrect = nil
				}
				questions[i].Explanation = ""
			}
			questions[i].Options = options
		} else {
			questions[i].Options = []models.QuestionOption{}
		}
	}

	return test, questions, nil
}

// ListTests returns all non-deleted tests, optionally filtered to published ones only
func (r *PostgresTestRepository) ListTests(ctx context.Context, onlyPublished bool) ([]models.Test, error) {
	var tests []models.Test
	var err error
	if onlyPublished {
		err = r.db.SelectContext(ctx, &tests, "SELECT * FROM tests WHERE is_deleted = false AND published = true ORDER BY created_at DESC")
	} else {
		err = r.db.SelectContext(ctx, &tests, "SELECT * FROM tests WHERE is_deleted = false ORDER BY created_at DESC")
	}
	if err != nil {
		return nil, err
	}
	if tests == nil {
		tests = []models.Test{}
	}
	return tests, nil
}

// TogglePublish inverts the published state of a test
func (r *PostgresTestRepository) TogglePublish(ctx context.Context, testID string) (bool, error) {
	var current bool
	err := r.db.GetContext(ctx, &current, "SELECT published FROM tests WHERE id = $1 AND is_deleted = false", testID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, ErrTestNotFound
		}
		return false, err
	}

	newStatus := !current
	_, err = r.db.ExecContext(ctx, "UPDATE tests SET published = $1, updated_at = $2 WHERE id = $3", newStatus, time.Now(), testID)
	if err != nil {
		return false, err
	}

	return newStatus, nil
}

// DeleteTest soft-deletes a test
func (r *PostgresTestRepository) DeleteTest(ctx context.Context, testID string) error {
	res, err := r.db.ExecContext(ctx, "UPDATE tests SET is_deleted = true, updated_at = $1 WHERE id = $2 AND is_deleted = false", time.Now(), testID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil || rows == 0 {
		return ErrTestNotFound
	}
	return nil
}

// GetStats returns aggregated platform metrics for the admin dashboard
func (r *PostgresTestRepository) GetStats(ctx context.Context) (*models.AdminStats, error) {
	var totalTests, publishedTests, totalSessions, totalCompletions int
	var avgScore sql.NullFloat64

	_ = r.db.GetContext(ctx, &totalTests, "SELECT COUNT(*) FROM tests WHERE is_deleted = false")
	_ = r.db.GetContext(ctx, &publishedTests, "SELECT COUNT(*) FROM tests WHERE is_deleted = false AND published = true")
	_ = r.db.GetContext(ctx, &totalSessions, "SELECT COUNT(*) FROM test_sessions")
	_ = r.db.GetContext(ctx, &totalCompletions, "SELECT COUNT(*) FROM test_results")
	_ = r.db.GetContext(ctx, &avgScore, "SELECT AVG(percentage_score) FROM test_results")

	var pendingEssays int
	_ = r.db.GetContext(ctx, &pendingEssays, `
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

	return &models.AdminStats{
		TotalTests:               totalTests,
		PublishedTests:           publishedTests,
		TotalSessions:            totalSessions,
		TotalCompletions:         totalCompletions,
		CompletionRatePercentage: completionRate,
		AverageScorePercentage:   averageScoreInt,
		PendingEssays:            pendingEssays,
	}, nil
}

// GetAnalytics calculates analytics metrics for a specific test
func (r *PostgresTestRepository) GetAnalytics(ctx context.Context, testID string) (*models.TestAnalytics, error) {
	test, err := r.GetTestByID(ctx, testID)
	if err != nil {
		return nil, err
	}

	var totalSubmissions int
	var avgScore sql.NullFloat64
	var passingCount int

	_ = r.db.GetContext(ctx, &totalSubmissions, "SELECT COUNT(*) FROM test_results WHERE test_id = $1", testID)
	_ = r.db.GetContext(ctx, &avgScore, "SELECT AVG(percentage_score) FROM test_results WHERE test_id = $1", testID)
	_ = r.db.GetContext(ctx, &passingCount, "SELECT COUNT(*) FROM test_results WHERE test_id = $1 AND passing = true", testID)

	passingRate := 0.0
	if totalSubmissions > 0 {
		passingRate = float64(passingCount) / float64(totalSubmissions) * 100.0
	}

	avgScoreVal := 0.0
	if avgScore.Valid {
		avgScoreVal = avgScore.Float64
	}

	return &models.TestAnalytics{
		TestID:           test.ID,
		TestTitle:        test.Title,
		TotalSubmissions: totalSubmissions,
		AverageScore:     avgScoreVal,
		PassingRate:      passingRate,
	}, nil
}

// RecordAuditLog inserts an audit log record
func (r *PostgresTestRepository) RecordAuditLog(ctx context.Context, item *models.AdminAuditLog) error {
	if item.ID == "" {
		item.ID = fmt.Sprintf("audit-%d", time.Now().UnixNano())
	}
	if item.CreatedAt.IsZero() {
		item.CreatedAt = time.Now()
	}
	query := `
		INSERT INTO admin_audit_log (id, admin_id, action, resource_type, resource_id, old_value, new_value, ip_address, created_at)
		VALUES (:id, :admin_id, :action, :resource_type, :resource_id, :old_value, :new_value, :ip_address, :created_at)
	`
	_, err := r.db.NamedExecContext(ctx, query, item)
	return err
}

// GetAuditLogs retrieves audit logs with admin user details
func (r *PostgresTestRepository) GetAuditLogs(ctx context.Context, limit, offset int) ([]models.AdminAuditLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			a.id, 
			a.admin_id, 
			COALESCE(u.email, '') AS admin_email,
			a.action, 
			a.resource_type, 
			a.resource_id, 
			a.old_value::text AS old_value, 
			a.new_value::text AS new_value, 
			a.ip_address, 
			a.created_at
		FROM admin_audit_log a
		LEFT JOIN users u ON a.admin_id = u.id
		ORDER BY a.created_at DESC
		LIMIT $1 OFFSET $2
	`
	var logs []models.AdminAuditLog
	err := r.db.SelectContext(ctx, &logs, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("mengambil audit logs: %w", err)
	}
	if logs == nil {
		logs = []models.AdminAuditLog{}
	}
	return logs, nil
}
