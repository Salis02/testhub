package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"testhub/internal/models"
)

func TestAIGenerator(t *testing.T) {
	_, _, router := setupTestApp(t)

	aiBody, _ := json.Marshal(models.AIGenerateRequest{
		Category:   "cpns",
		Subject:    "Tes Wawasan Kebangsaan",
		Difficulty: "medium",
		Count:      3,
	})

	req, _ := http.NewRequest("POST", "/api/ai/generate-questions", bytes.NewBuffer(aiBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("AI generate questions failed with status %d: %s", w.Code, w.Body.String())
	}

	var questions []models.TestQuestion
	_ = json.Unmarshal(w.Body.Bytes(), &questions)
	if len(questions) != 3 {
		t.Errorf("Expected 3 questions, got %d", len(questions))
	}
}

func TestAIEssayAutoGrader(t *testing.T) {
	_, _, router := setupTestApp(t)

	gradeBody, _ := json.Marshal(models.AIEssayGradeRequest{
		EssayID:        "essay-test-001",
		QuestionText:   "Jelaskan pilar-pilar utama dalam tata kelola pemerintahan yang baik (Good Governance)!",
		UserAnswerText: "Pilar utama Good Governance mencakup transparansi, akuntabilitas, partisipasi publik, efisiensi, dan supremasi hukum.",
		ReferenceKey:   "Akuntabilitas, Transparansi, Partisipasi, Rule of Law",
	})

	req, _ := http.NewRequest("POST", "/api/ai/grade-essay", bytes.NewBuffer(gradeBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("AI essay grading failed with status %d: %s", w.Code, w.Body.String())
	}

	var gradeResp models.AIEssayGradeResponse
	_ = json.Unmarshal(w.Body.Bytes(), &gradeResp)

	if gradeResp.SuggestedScore <= 0 {
		t.Errorf("Expected suggested score > 0, got %d", gradeResp.SuggestedScore)
	}
	if gradeResp.FeedbackNote == "" {
		t.Errorf("Expected feedback note from AI auto-grader")
	}
}
