package models

import (
	"time"
)

type User struct {
	ID                    string     `db:"id" json:"id"`
	Email                 string     `db:"email" json:"email"`
	PasswordHash          string     `db:"password_hash" json:"-"`
	FullName              string     `db:"full_name" json:"full_name"`
	Role                  string     `db:"role" json:"role"` // admin, creator
	SubscriptionTier      string     `db:"subscription_tier" json:"subscription_tier"`
	SubscriptionExpiresAt *time.Time `db:"subscription_expires_at" json:"subscription_expires_at,omitempty"`
	IsActive              bool       `db:"is_active" json:"is_active"`
	CreatedAt             time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt             time.Time  `db:"updated_at" json:"updated_at"`
}

type QuestionOption struct {
	ID           string    `db:"id" json:"id"`
	QuestionID   string    `db:"question_id" json:"question_id,omitempty"`
	OptionText   string    `db:"option_text" json:"option_text"`
	OptionLetter string    `db:"option_letter" json:"option_letter"` // A, B, C, D, E
	IsCorrect    *bool     `db:"is_correct" json:"is_correct,omitempty"`
	CreatedAt    time.Time `db:"created_at" json:"created_at,omitempty"`
}

type TestQuestion struct {
	ID              string           `db:"id" json:"id"`
	TestID          string           `db:"test_id" json:"test_id"`
	QuestionNumber  int              `db:"question_number" json:"question_number"`
	QuestionText    string           `db:"question_text" json:"question_text"`
	QuestionType    string           `db:"question_type" json:"question_type"` // multiple_choice, essay, matching
	MediaURL        *string          `db:"media_url" json:"media_url,omitempty"`
	DifficultyLevel string           `db:"difficulty_level" json:"difficulty_level"` // easy, medium, hard
	Explanation     string           `db:"explanation" json:"explanation"`
	Points          int              `db:"points" json:"points"`
	IsDeleted       bool             `db:"is_deleted" json:"-"`
	CreatedAt       time.Time        `db:"created_at" json:"created_at"`
	Options         []QuestionOption `db:"-" json:"options"`
}

type Test struct {
	ID                     string    `db:"id" json:"id"`
	CreatorID              *string   `db:"creator_id" json:"creator_id,omitempty"`
	Title                  string    `db:"title" json:"title"`
	Description            string    `db:"description" json:"description"`
	Category               string    `db:"category" json:"category"` // cpns, sbmptn, iq, custom
	DurationMinutes        int       `db:"duration_minutes" json:"duration_minutes"`
	PassingScorePercentage int       `db:"passing_score_percentage" json:"passing_score_percentage"`
	TotalQuestions         int       `db:"total_questions" json:"total_questions"`
	PriceIDR               float64   `db:"price_idr" json:"price_idr"`
	ShuffleQuestions       bool      `db:"shuffle_questions" json:"shuffle_questions"`
	ShuffleAnswers         bool      `db:"shuffle_answers" json:"shuffle_answers"`
	Published              bool      `db:"published" json:"published"`
	IsDeleted              bool      `db:"is_deleted" json:"-"`
	CreatedAt              time.Time `db:"created_at" json:"created_at"`
	UpdatedAt              time.Time `db:"updated_at" json:"updated_at"`
}

type TestSession struct {
	ID                string     `db:"id" json:"session_id"`
	TestID            string     `db:"test_id" json:"test_id"`
	IPAddress         *string    `db:"ip_address" json:"ip_address,omitempty"`
	UserAgent         *string    `db:"user_agent" json:"user_agent,omitempty"`
	DeviceFingerprint *string    `db:"device_fingerprint" json:"device_fingerprint,omitempty"`
	StartedAt         time.Time  `db:"started_at" json:"started_at"`
	SubmittedAt       *time.Time `db:"submitted_at" json:"submitted_at,omitempty"`
	ExpiresAt         time.Time  `db:"expires_at" json:"expires_at"`
	IsActive          bool       `db:"is_active" json:"is_active"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
}

type TestSessionResponse struct {
	SessionID string `json:"session_id"`
	Test      struct {
		ID                     string `json:"id"`
		Title                  string `json:"title"`
		Category               string `json:"category"`
		DurationMinutes        int    `json:"duration_minutes"`
		TotalQuestions         int    `json:"total_questions"`
		PassingScorePercentage int    `json:"passing_score_percentage"`
	} `json:"test"`
	StartedAt string `json:"started_at"`
	ExpiresAt string `json:"expires_at"`
}

type UserSubmission struct {
	QuestionID       string  `json:"question_id"`
	SelectedOptionID *string `json:"selected_option_id,omitempty"`
	AnswerText       *string `json:"answer_text,omitempty"`
	IsFlagged        bool    `json:"is_flagged"`
	AnsweredAt       string  `json:"answered_at"`
}

type CategoryScore struct {
	CategoryName  string  `json:"category_name"`
	Score         float64 `json:"score"`
	TotalPossible float64 `json:"total_possible"`
	Percentage    float64 `json:"percentage"`
}

type TestResult struct {
	ID                     string                    `db:"id" json:"id"`
	SessionID              string                    `db:"session_id" json:"session_id"`
	TestID                 string                    `db:"test_id" json:"test_id"`
	TestTitle              string                    `db:"test_title" json:"test_title"`
	Category               string                    `db:"category" json:"category"`
	TotalScore             float64                   `db:"total_score" json:"total_score"`
	PercentageScore        float64                   `db:"percentage_score" json:"percentage_score"`
	Passing                bool                      `db:"passing" json:"passing"`
	PassingScorePercentage int                       `db:"passing_score_percentage" json:"passing_score_percentage"`
	TimeSpentSeconds       int                       `db:"time_spent_seconds" json:"time_spent_seconds"`
	DurationSeconds        int                       `db:"duration_seconds" json:"duration_seconds"`
	QuestionsAnswered      int                       `db:"questions_answered" json:"questions_answered"`
	QuestionsCorrect       int                       `db:"questions_correct" json:"questions_correct"`
	TotalQuestions         int                       `db:"total_questions" json:"total_questions"`
	Percentile             int                       `db:"percentile" json:"percentile"`
	CategoryBreakdown      []CategoryScore           `json:"category_breakdown"`
	Submissions            map[string]UserSubmission `json:"submissions"`
	CategoryBreakdownJSON  []byte                    `db:"category_breakdown" json:"-"`
	SubmissionsJSON        []byte                    `db:"submissions" json:"-"`
	SubmittedAt            time.Time                 `db:"submitted_at" json:"submitted_at"`
	CreatedAt              time.Time                 `db:"created_at" json:"created_at"`
}

type EssaySubmission struct {
	ID               string   `db:"id" json:"id"`
	TestID           string   `db:"test_id" json:"test_id"`
	TestTitle        string   `db:"test_title" json:"test_title"`
	SessionID        string   `db:"session_id" json:"session_id"`
	QuestionID       string   `db:"question_id" json:"question_id"`
	QuestionText     string   `db:"question_text" json:"question_text"`
	UserAnswerText   string   `db:"user_answer_text" json:"user_answer_text"`
	Score            *float64 `db:"score" json:"score,omitempty"`
	AdminReviewNote  *string  `db:"admin_review_note" json:"admin_review_note,omitempty"`
	AdminReviewedAt  *string  `db:"admin_reviewed_at" json:"admin_reviewed_at,omitempty"`
	SubmittedAt      string   `db:"submitted_at" json:"submitted_at"`
}

type AdminStats struct {
	TotalTests               int `json:"total_tests"`
	PublishedTests           int `json:"published_tests"`
	TotalSessions            int `json:"total_sessions"`
	TotalCompletions         int `json:"total_completions"`
	CompletionRatePercentage int `json:"completion_rate_percentage"`
	AverageScorePercentage   int `json:"average_score_percentage"`
	PendingEssays            int `json:"pending_essays"`
}

// Request and Response DTOs
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	UserID       string `json:"user_id"`
	Email        string `json:"email"`
	FullName     string `json:"full_name"`
	Role         string `json:"role"`
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
}

type SubmitAnswerRequest struct {
	OptionID   *string `json:"optionId"`
	AnswerText *string `json:"answerText"`
	IsFlagged  *bool   `json:"isFlagged"`
}

type FinishTestRequest struct {
	TimeSpentSeconds int `json:"time_spent_seconds"`
}

type GradeEssayRequest struct {
	Score int    `json:"score" binding:"required"`
	Note  string `json:"note"`
}

type AIGenerateRequest struct {
	Category   string `json:"category" binding:"required"`
	Subject    string `json:"subject" binding:"required"`
	Difficulty string `json:"difficulty" binding:"required"`
	Count      int    `json:"count" binding:"required,min=1,max=10"`
}

type TestAnalytics struct {
	TestID           string  `json:"test_id"`
	TestTitle        string  `json:"test_title"`
	TotalSubmissions int     `json:"total_submissions"`
	AverageScore     float64 `json:"average_score"`
	PassingRate      float64 `json:"passing_rate"`
}

type Subscription struct {
	ID             string     `db:"id" json:"id"`
	UserIdentifier string     `db:"user_identifier" json:"user_identifier"`
	TestID         *string    `db:"test_id" json:"test_id,omitempty"`
	Tier           string     `db:"tier" json:"tier"`
	Status         string     `db:"status" json:"status"`
	Source         string     `db:"source" json:"source"`
	AdminNotes     *string    `db:"admin_notes" json:"admin_notes,omitempty"`
	AmountPaid     float64    `db:"amount_paid" json:"amount_paid"`
	ValidUntil     *time.Time `db:"valid_until" json:"valid_until,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

type Order struct {
	ID               string     `db:"id" json:"id"`
	UserEmail        string     `db:"user_email" json:"user_email"`
	TestID           *string    `db:"test_id" json:"test_id,omitempty"`
	PlanType         string     `db:"plan_type" json:"plan_type"`
	Amount           float64    `db:"amount" json:"amount"`
	Status           string     `db:"status" json:"status"`
	PaymentMethod    string     `db:"payment_method" json:"payment_method"`
	PaymentReference string     `db:"payment_reference" json:"payment_reference"`
	SnapToken        string     `db:"snap_token" json:"snap_token"`
	QRPayload        string     `db:"qr_payload" json:"qr_payload"`
	SettledAt        *time.Time `db:"settled_at" json:"settled_at,omitempty"`
	ExpiresAt        *time.Time `db:"expires_at" json:"expires_at,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at" json:"updated_at"`
}

type LeaderboardEntry struct {
	Rank             int       `json:"rank"`
	SessionID        string    `json:"session_id"`
	UserIdentifier   string    `json:"user_identifier"`
	Score            float64   `json:"score"`
	PercentageScore  float64   `json:"percentage_score"`
	TimeSpentSeconds int       `json:"time_spent_seconds"`
	SubmittedAt      time.Time `json:"submitted_at"`
}

type CertificateData struct {
	CertificateID          string    `json:"certificate_id"`
	ResultID               string    `json:"result_id"`
	TestID                 string    `json:"test_id"`
	TestTitle              string    `json:"test_title"`
	Category               string    `json:"category"`
	PercentageScore        float64   `json:"percentage_score"`
	Passing                bool      `json:"passing"`
	PassingScorePercentage int       `json:"passing_score_percentage"`
	IssuedAt               time.Time `json:"issued_at"`
	VerificationURL        string    `json:"verification_url"`
	Issuer                 string    `json:"issuer"`
}

type AdminAuditLog struct {
	ID           string    `db:"id" json:"id"`
	AdminID      *string   `db:"admin_id" json:"admin_id,omitempty"`
	AdminEmail   *string   `db:"admin_email" json:"admin_email,omitempty"`
	Action       string    `db:"action" json:"action"`
	ResourceType string    `db:"resource_type" json:"resource_type"`
	ResourceID   *string   `db:"resource_id" json:"resource_id,omitempty"`
	OldValue     *string   `db:"old_value" json:"old_value,omitempty"`
	NewValue     *string   `db:"new_value" json:"new_value,omitempty"`
	IPAddress    *string   `db:"ip_address" json:"ip_address,omitempty"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}


