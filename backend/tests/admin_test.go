package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"testhub/internal/models"
)

func TestAdminEditTestFlow(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

	// 1. Create initial test
	isTrue := true
	isFalse := false
	createBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Tes Figural Awal",
		"description":              "Deskripsi Awal",
		"category":                 "iq",
		"duration_minutes":         30,
		"passing_score_percentage": 65,
		"published":                false,
		"questions": []models.TestQuestion{
			{
				QuestionText:    "Manakah gambar pola berikutnya?",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Options: []models.QuestionOption{
					{OptionLetter: "A", OptionText: "Pola Rotasi 90", IsCorrect: &isTrue},
					{OptionLetter: "B", OptionText: "Pola Rotasi 180", IsCorrect: &isFalse},
				},
			},
		},
	})

	reqCreate, _ := http.NewRequest("POST", "/api/admin/tests", bytes.NewBuffer(createBody))
	reqCreate.Header.Set("Content-Type", "application/json")
	reqCreate.Header.Set("Authorization", "Bearer "+token)
	wCreate := httptest.NewRecorder()
	router.ServeHTTP(wCreate, reqCreate)

	if wCreate.Code != http.StatusCreated {
		t.Fatalf("Create test failed with status %d: %s", wCreate.Code, wCreate.Body.String())
	}

	var createdTest models.Test
	_ = json.Unmarshal(wCreate.Body.Bytes(), &createdTest)
	testID := createdTest.ID

	// 2. Fetch test via GET /api/admin/tests/:testId
	reqGet, _ := http.NewRequest("GET", "/api/admin/tests/"+testID, nil)
	reqGet.Header.Set("Authorization", "Bearer "+token)
	wGet := httptest.NewRecorder()
	router.ServeHTTP(wGet, reqGet)

	if wGet.Code != http.StatusOK {
		t.Fatalf("Get test failed with status %d: %s", wGet.Code, wGet.Body.String())
	}

	var fetched struct {
		Test      models.Test           `json:"test"`
		Questions []models.TestQuestion `json:"questions"`
	}
	_ = json.Unmarshal(wGet.Body.Bytes(), &fetched)
	if len(fetched.Questions) != 1 {
		t.Fatalf("Expected 1 question, got %d", len(fetched.Questions))
	}
	if fetched.Questions[0].Options[0].IsCorrect == nil || !*fetched.Questions[0].Options[0].IsCorrect {
		t.Fatalf("Expected is_correct to be preserved for admin view")
	}

	// 3. Update test via PUT /api/admin/tests/:testId
	testMediaURL := "/uploads/questions/img_diagram_pola.png"
	updateBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Tes Figural CPNS (Updated)",
		"description":              "Deskripsi yang telah diperbarui",
		"category":                 "cpns",
		"duration_minutes":         45,
		"passing_score_percentage": 70,
		"published":                true,
		"questions": []models.TestQuestion{
			{
				QuestionText:    "Perhatikan gambar rotasi matriks berikut:",
				QuestionType:    "multiple_choice",
				MediaURL:        &testMediaURL,
				DifficultyLevel: "hard",
				Points:          10,
				Explanation:     "Pola bergerak searah jarum jam sebesar 45 derajat.",
				Options: []models.QuestionOption{
					{OptionLetter: "A", OptionText: "Gambar A", IsCorrect: &isFalse},
					{OptionLetter: "B", OptionText: "Gambar B", IsCorrect: &isTrue},
				},
			},
		},
	})

	reqUpdate, _ := http.NewRequest("PUT", "/api/admin/tests/"+testID, bytes.NewBuffer(updateBody))
	reqUpdate.Header.Set("Content-Type", "application/json")
	reqUpdate.Header.Set("Authorization", "Bearer "+token)
	wUpdate := httptest.NewRecorder()
	router.ServeHTTP(wUpdate, reqUpdate)

	if wUpdate.Code != http.StatusOK {
		t.Fatalf("Update test failed with status %d: %s", wUpdate.Code, wUpdate.Body.String())
	}

	// 4. Verify the updated test details
	reqVerify, _ := http.NewRequest("GET", "/api/admin/tests/"+testID, nil)
	reqVerify.Header.Set("Authorization", "Bearer "+token)
	wVerify := httptest.NewRecorder()
	router.ServeHTTP(wVerify, reqVerify)

	var verified struct {
		Test      models.Test           `json:"test"`
		Questions []models.TestQuestion `json:"questions"`
	}
	_ = json.Unmarshal(wVerify.Body.Bytes(), &verified)

	if verified.Test.Title != "Tes Figural CPNS (Updated)" {
		t.Errorf("Expected updated title 'Tes Figural CPNS (Updated)', got '%s'", verified.Test.Title)
	}
	if verified.Test.DurationMinutes != 45 {
		t.Errorf("Expected updated duration 45, got %d", verified.Test.DurationMinutes)
	}
	if verified.Test.PassingScorePercentage != 70 {
		t.Errorf("Expected updated passing score 70, got %d", verified.Test.PassingScorePercentage)
	}
	if !verified.Test.Published {
		t.Errorf("Expected test to be published")
	}
	if len(verified.Questions) != 1 {
		t.Fatalf("Expected 1 question, got %d", len(verified.Questions))
	}
	if verified.Questions[0].MediaURL == nil || *verified.Questions[0].MediaURL != testMediaURL {
		t.Errorf("Expected media_url '%s', got '%v'", testMediaURL, verified.Questions[0].MediaURL)
	}
	if verified.Questions[0].Points != 10 {
		t.Errorf("Expected points 10, got %d", verified.Questions[0].Points)
	}
}

func TestValidationRelationalFailures(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

	isTrue := true
	isFalse := false

	// Test 1: Category invalid
	badCatBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Valid Title Here",
		"category":                 "invalid_category_xyz",
		"duration_minutes":         30,
		"passing_score_percentage": 60,
		"questions": []models.QuestionDTO{
			{
				QuestionText:    "Pertanyaan valid minimal 5 char",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Options: []models.OptionDTO{
					{OptionLetter: "A", OptionText: "Opt A", IsCorrect: &isTrue},
					{OptionLetter: "B", OptionText: "Opt B", IsCorrect: &isFalse},
				},
			},
		},
	})
	req1, _ := http.NewRequest("POST", "/api/admin/tests", bytes.NewBuffer(badCatBody))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+token)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request for invalid category, got %d", w1.Code)
	}

	// Test 2: Multiple choice without correct option (0 correct)
	noCorrectBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Valid Title Here",
		"category":                 "cpns",
		"duration_minutes":         30,
		"passing_score_percentage": 60,
		"questions": []models.QuestionDTO{
			{
				QuestionText:    "Pertanyaan valid minimal 5 char",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Options: []models.OptionDTO{
					{OptionLetter: "A", OptionText: "Opt A", IsCorrect: &isFalse},
					{OptionLetter: "B", OptionText: "Opt B", IsCorrect: &isFalse},
				},
			},
		},
	})
	req2, _ := http.NewRequest("POST", "/api/admin/tests", bytes.NewBuffer(noCorrectBody))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request for question without correct answer, got %d", w2.Code)
	}

	// Test 3: Multiple choice with 2 correct options
	twoCorrectBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Valid Title Here",
		"category":                 "cpns",
		"duration_minutes":         30,
		"passing_score_percentage": 60,
		"questions": []models.QuestionDTO{
			{
				QuestionText:    "Pertanyaan valid minimal 5 char",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Options: []models.OptionDTO{
					{OptionLetter: "A", OptionText: "Opt A", IsCorrect: &isTrue},
					{OptionLetter: "B", OptionText: "Opt B", IsCorrect: &isTrue},
				},
			},
		},
	})
	req3, _ := http.NewRequest("POST", "/api/admin/tests", bytes.NewBuffer(twoCorrectBody))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("Authorization", "Bearer "+token)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)

	if w3.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request for question with 2 correct answers, got %d", w3.Code)
	}
}
