package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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

func TestAdminPendingEssaysAndGrading(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

	// 1. Create test with essay question
	testBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Essay Test " + time.Now().Format("150405"),
		"category":                 "custom",
		"duration_minutes":         30,
		"passing_score_percentage": 50,
		"published":                true,
		"questions": []models.QuestionDTO{
			{
				QuestionText:    "Jelaskan pendapat Anda mengenai integrasi AI pada pendidikan!",
				QuestionType:    "essay",
				DifficultyLevel: "medium",
				Points:          10,
			},
		},
	})
	req, _ := http.NewRequest("POST", "/api/admin/tests", bytes.NewBuffer(testBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("Failed to create essay test: %s", w.Body.String())
	}
	var createdTest models.Test
	_ = json.Unmarshal(w.Body.Bytes(), &createdTest)

	// 2. Start test session
	startReq, _ := http.NewRequest("POST", fmt.Sprintf("/api/tests/%s/start", createdTest.ID), nil)
	startReq.Header.Set("Authorization", "Bearer "+token)
	startW := httptest.NewRecorder()
	router.ServeHTTP(startW, startReq)
	if startW.Code != http.StatusOK {
		t.Fatalf("Failed to start exam session: %s", startW.Body.String())
	}
	var sessionResp models.TestSessionResponse
	_ = json.Unmarshal(startW.Body.Bytes(), &sessionResp)

	// 3. Get session question to know question ID
	qReq, _ := http.NewRequest("GET", fmt.Sprintf("/api/sessions/%s/questions", sessionResp.SessionID), nil)
	qW := httptest.NewRecorder()
	router.ServeHTTP(qW, qReq)
	var qData struct {
		Questions []models.TestQuestion `json:"questions"`
	}
	_ = json.Unmarshal(qW.Body.Bytes(), &qData)
	if len(qData.Questions) == 0 {
		t.Fatalf("No questions returned for session")
	}
	questionID := qData.Questions[0].ID

	// 4. Submit essay answer
	answerText := "Integrasi AI sangat membantu mempersonalisasi pembelajaran siswa."
	subBody, _ := json.Marshal(models.SubmitAnswerDTO{
		QuestionID: questionID,
		AnswerText: &answerText,
	})
	subReq, _ := http.NewRequest("POST", fmt.Sprintf("/api/sessions/%s/submit-answer", sessionResp.SessionID), bytes.NewBuffer(subBody))
	subReq.Header.Set("Content-Type", "application/json")
	subW := httptest.NewRecorder()
	router.ServeHTTP(subW, subReq)
	if subW.Code != http.StatusOK {
		t.Fatalf("Submit answer failed: %s", subW.Body.String())
	}

	// 5. Admin lists pending essays
	essaysReq, _ := http.NewRequest("GET", "/api/admin/essays", nil)
	essaysReq.Header.Set("Authorization", "Bearer "+token)
	essaysW := httptest.NewRecorder()
	router.ServeHTTP(essaysW, essaysReq)
	if essaysW.Code != http.StatusOK {
		t.Fatalf("Failed to get pending essays: %s", essaysW.Body.String())
	}
	var essayList []models.EssaySubmission
	_ = json.Unmarshal(essaysW.Body.Bytes(), &essayList)
	if len(essayList) == 0 {
		t.Fatalf("Expected at least 1 essay in pending list")
	}

	// Find the essay we just submitted
	var targetEssayID string
	for _, e := range essayList {
		if e.SessionID == sessionResp.SessionID {
			targetEssayID = e.ID
			break
		}
	}
	if targetEssayID == "" {
		t.Fatalf("Could not find submitted essay in pending list")
	}

	// 6. Admin grades the essay
	gradeBody, _ := json.Marshal(models.GradeEssayRequest{
		Score: 9,
		Note:  "Argumen sangat jelas dan terstruktur.",
	})
	gradeReq, _ := http.NewRequest("POST", fmt.Sprintf("/api/admin/essays/%s/grade", targetEssayID), bytes.NewBuffer(gradeBody))
	gradeReq.Header.Set("Content-Type", "application/json")
	gradeReq.Header.Set("Authorization", "Bearer "+token)
	gradeW := httptest.NewRecorder()
	router.ServeHTTP(gradeW, gradeReq)
	if gradeW.Code != http.StatusOK {
		t.Fatalf("Failed to grade essay: %s", gradeW.Body.String())
	}
}

