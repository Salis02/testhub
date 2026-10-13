package models

import (
	"fmt"
)

// OptionDTO represents an answer option in request payloads
type OptionDTO struct {
	ID           string `json:"id,omitempty"`
	OptionLetter string `json:"option_letter" binding:"required,oneof=A B C D E"`
	OptionText   string `json:"option_text" binding:"required,min=1"`
	IsCorrect    *bool  `json:"is_correct"`
}

// QuestionDTO represents a question in create/update test requests
type QuestionDTO struct {
	ID              string      `json:"id,omitempty"`
	QuestionNumber  int         `json:"question_number"`
	QuestionText    string      `json:"question_text" binding:"required,min=5"`
	QuestionType    string      `json:"question_type" binding:"required,oneof=multiple_choice essay matching"`
	MediaURL        *string     `json:"media_url,omitempty"`
	DifficultyLevel string      `json:"difficulty_level" binding:"required,oneof=easy medium hard"`
	Points          int         `json:"points" binding:"required,min=1,max=100"`
	Explanation     string      `json:"explanation"`
	Options         []OptionDTO `json:"options"`
}

// SaveTestDTO is the centralized DTO for creating and updating tests
type SaveTestDTO struct {
	Title                  string        `json:"title" binding:"required,min=4,max=150"`
	Description            string        `json:"description"`
	Category               string        `json:"category" binding:"required,oneof=cpns sbmptn iq custom"`
	DurationMinutes        int           `json:"duration_minutes" binding:"required,min=5,max=300"`
	PassingScorePercentage int           `json:"passing_score_percentage" binding:"required,min=1,max=100"`
	PriceIDR               float64       `json:"price_idr"`
	ShuffleQuestions       bool          `json:"shuffle_questions"`
	ShuffleAnswers         bool          `json:"shuffle_answers"`
	Published              bool          `json:"published"`
	Questions              []QuestionDTO `json:"questions" binding:"required,min=1,dive"`
}

// ValidateRelational performs deep domain validation that struct tags cannot express alone
func (dto *SaveTestDTO) ValidateRelational() map[string]string {
	errs := make(map[string]string)

	for i, q := range dto.Questions {
		if q.QuestionType == "multiple_choice" {
			if len(q.Options) < 2 {
				errs[fmt.Sprintf("questions[%d].options", i)] = "Soal pilihan ganda harus memiliki minimal 2 pilihan jawaban"
				continue
			}

			correctCount := 0
			for _, opt := range q.Options {
				if opt.IsCorrect != nil && *opt.IsCorrect {
					correctCount++
				}
			}

			if correctCount != 1 {
				errs[fmt.Sprintf("questions[%d].options", i)] = "Tepat harus ada 1 kunci jawaban yang ditandai benar"
			}
		}
	}

	return errs
}

// ToDomain converts DTO to domain models for database persistence
func (dto *SaveTestDTO) ToDomainQuestions(testID string) []TestQuestion {
	var questions []TestQuestion

	for idx, q := range dto.Questions {
		qID := fmt.Sprintf("q-%s-%d", testID, idx+1)
		if q.ID != "" {
			qID = q.ID
		}

		diff := q.DifficultyLevel
		if diff == "" {
			diff = "medium"
		}
		pts := q.Points
		if pts <= 0 {
			pts = 5
		}

		var options []QuestionOption
		for _, opt := range q.Options {
			optID := fmt.Sprintf("opt-%s-%s", qID, opt.OptionLetter)
			if opt.ID != "" {
				optID = opt.ID
			}

			isCorrect := false
			if opt.IsCorrect != nil {
				isCorrect = *opt.IsCorrect
			}

			options = append(options, QuestionOption{
				ID:           optID,
				QuestionID:   qID,
				OptionLetter: opt.OptionLetter,
				OptionText:   opt.OptionText,
				IsCorrect:    &isCorrect,
			})
		}

		questions = append(questions, TestQuestion{
			ID:              qID,
			TestID:          testID,
			QuestionNumber:  idx + 1,
			QuestionText:    q.QuestionText,
			QuestionType:    q.QuestionType,
			MediaURL:        q.MediaURL,
			DifficultyLevel: diff,
			Explanation:     q.Explanation,
			Points:          pts,
			Options:         options,
		})
	}

	return questions
}

// CreateInvoiceDTO represents payload to generate payment invoice / QRIS token
type CreateInvoiceDTO struct {
	TestID    *string `json:"test_id"`
	PlanType  string  `json:"plan_type" binding:"required,oneof=per_test season_pass"`
	UserEmail string  `json:"user_email" binding:"required,email"`
}

// ManualGrantSubscriptionDTO represents admin manual override payload
type ManualGrantSubscriptionDTO struct {
	UserIdentifier string  `json:"user_identifier" binding:"required"`
	TestID         *string `json:"test_id"`
	PlanType       string  `json:"plan_type" binding:"required,oneof=per_test season_pass lifetime institution"`
	ValidDays      int     `json:"valid_days" binding:"required,min=1,max=3650"`
	ReasonNotes    string  `json:"reason_notes" binding:"required,min=3"`
}

// UpdateSubscriptionStatusDTO represents admin payload to change status or extend expiry
type UpdateSubscriptionStatusDTO struct {
	Status     string  `json:"status" binding:"required,oneof=active suspended expired revoked"`
	ExtendDays int     `json:"extend_days"`
	AdminNotes *string `json:"admin_notes"`
}

// PaymentWebhookDTO represents incoming webhook notification from Midtrans/Xendit/simulator
type PaymentWebhookDTO struct {
	OrderID           string `json:"order_id" binding:"required"`
	TransactionStatus string `json:"transaction_status" binding:"required"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	StatusCode        string `json:"status_code"`
}

// StartSessionDTO represents payload when examinee starts an exam session
type StartSessionDTO struct {
	Email string `json:"email" binding:"omitempty,email"`
}

// SubmitAnswerDTO represents sanitized payload when examinee submits an answer
type SubmitAnswerDTO struct {
	QuestionID       string  `json:"question_id"`
	OptionID         *string `json:"option_id"`
	SelectedOptionID *string `json:"selected_option_id"`
	AnswerText       *string `json:"answer_text"`
	AnswerTextAlt    *string `json:"answer"`
	IsFlagged        *bool   `json:"is_flagged"`
}

