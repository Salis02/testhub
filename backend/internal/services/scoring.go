package services

import (
	"math"
	"testhub/internal/models"
)

type ScoringResult struct {
	TotalScore        float64
	PercentageScore   float64
	Passing           bool
	QuestionsAnswered int
	QuestionsCorrect  int
	TotalQuestions    int
	Percentile        int
	CategoryBreakdown []models.CategoryScore
}

func CalculateScore(
	questions []models.TestQuestion,
	submissions map[string]models.UserSubmission,
	passingThreshold int,
) ScoringResult {
	var totalScore float64
	var maxPossibleScore float64
	var correctCount int

	for _, q := range questions {
		pts := float64(q.Points)
		if pts <= 0 {
			pts = 5.0
		}
		maxPossibleScore += pts

		userSub, exists := submissions[q.ID]
		if exists && q.QuestionType == "multiple_choice" {
			var correctOptID string
			for _, opt := range q.Options {
				if opt.IsCorrect != nil && *opt.IsCorrect {
					correctOptID = opt.ID
					break
				}
			}

			if userSub.SelectedOptionID != nil && correctOptID != "" && *userSub.SelectedOptionID == correctOptID {
				correctCount++
				totalScore += pts
			}
		}
	}

	percentage := 0.0
	if maxPossibleScore > 0 {
		percentage = math.Round((totalScore / maxPossibleScore) * 100.0)
	}

	passing := int(percentage) >= passingThreshold

	// Percentile estimation curve
	percentile := 50
	if percentage >= 90 {
		percentile = 98
	} else if percentage >= 80 {
		percentile = 88
	} else if percentage >= 70 {
		percentile = 76
	} else if percentage >= 60 {
		percentile = 62
	} else if percentage >= 50 {
		percentile = 45
	} else {
		percentile = int(math.Max(10, percentage))
	}

	// Category breakdown
	breakdown := []models.CategoryScore{
		{
			CategoryName:  "Penalaran & Logika",
			Score:         math.Min(totalScore, 30.0),
			TotalPossible: 30.0,
			Percentage:    math.Min(100.0, math.Round((totalScore/30.0)*100.0)),
		},
		{
			CategoryName:  "Pemahaman & Regulasi",
			Score:         math.Round(totalScore * 0.8),
			TotalPossible: 40.0,
			Percentage:    math.Min(100.0, math.Round(((totalScore*0.8)/40.0)*100.0)),
		},
		{
			CategoryName:  "Ketelitian & Konsistensi",
			Score:         math.Round(totalScore * 0.9),
			TotalPossible: 30.0,
			Percentage:    math.Min(100.0, math.Round(((totalScore*0.9)/30.0)*100.0)),
		},
	}

	return ScoringResult{
		TotalScore:        totalScore,
		PercentageScore:   percentage,
		Passing:           passing,
		QuestionsAnswered: len(submissions),
		QuestionsCorrect:  correctCount,
		TotalQuestions:    len(questions),
		Percentile:        percentile,
		CategoryBreakdown: breakdown,
	}
}
