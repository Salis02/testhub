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
	token := getAdminToken(t, router)

	aiBody, _ := json.Marshal(models.AIGenerateRequest{
		Category:   "cpns",
		Subject:    "Tes Wawasan Kebangsaan",
		Difficulty: "medium",
		Count:      3,
	})

	// 1. Verify unauthenticated call is rejected with 401
	unauthReq, _ := http.NewRequest("POST", "/api/ai/generate-questions", bytes.NewBuffer(aiBody))
	unauthReq.Header.Set("Content-Type", "application/json")
	unauthW := httptest.NewRecorder()
	router.ServeHTTP(unauthW, unauthReq)
	if unauthW.Code != http.StatusUnauthorized {
		t.Fatalf("Expected 401 for unauthenticated AI generation, got %d", unauthW.Code)
	}

	// 2. Authenticated call succeeds
	req, _ := http.NewRequest("POST", "/api/ai/generate-questions", bytes.NewBuffer(aiBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
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

func TestAIStreamGenerator(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

	aiBody, _ := json.Marshal(models.AIGenerateRequest{
		Category:   "cpns",
		Subject:    "Tes Karakteristik Pribadi",
		Difficulty: "medium",
		Count:      7, // Expects 2 chunks: 5 + 2
	})

	req, _ := http.NewRequest("POST", "/api/ai/stream-generate-questions", bytes.NewBuffer(aiBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("AI stream generate failed with status %d: %s", w.Code, w.Body.String())
	}

	bodyStr := w.Body.String()
	if !bytes.Contains(w.Body.Bytes(), []byte("event: init")) {
		t.Errorf("Expected event: init in SSE stream")
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("event: chunk")) {
		t.Errorf("Expected event: chunk in SSE stream")
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("event: done")) {
		t.Errorf("Expected event: done in SSE stream")
	}
	_ = bodyStr
}

func TestAIEssayAutoGrader(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

	gradeBody, _ := json.Marshal(models.AIEssayGradeRequest{
		EssayID:        "essay-test-001",
		QuestionText:   "Jelaskan pilar-pilar utama dalam tata kelola pemerintahan yang baik (Good Governance)!",
		UserAnswerText: "Pilar utama Good Governance mencakup transparansi, akuntabilitas, partisipasi publik, efisiensi, dan supremasi hukum.",
		ReferenceKey:   "Akuntabilitas, Transparansi, Partisipasi, Rule of Law",
	})

	req, _ := http.NewRequest("POST", "/api/ai/grade-essay", bytes.NewBuffer(gradeBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
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
