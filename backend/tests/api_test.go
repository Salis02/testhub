package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/handlers"
	"testhub/internal/models"
	"testhub/internal/repository"
)

func setupTestApp(t *testing.T) (*database.DB, *handlers.PublicHandler, http.Handler) {
	cfg := config.LoadConfig()
	cfg.DBName = "testhub"
	cfg.Environment = "test"

	db, err := database.New(cfg)
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	_ = db.RunMigrations("../migrations")

	cacheClient := cache.New(cfg.RedisURL, cfg.RedisPassword)
	router := handlers.SetupRouter(db, cacheClient, cfg)
	examRepo := repository.NewPostgresExamRepository(db)
	subRepo := repository.NewPostgresSubscriptionRepository(db)
	testRepo := repository.NewPostgresTestRepository(db)

	return db, handlers.NewPublicHandler(examRepo, subRepo, testRepo, cacheClient), router
}

func TestHealthCheck(t *testing.T) {
	_, _, router := setupTestApp(t)

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

func TestAuthFlow(t *testing.T) {
	_, _, router := setupTestApp(t)

	uniqueEmail := "test-" + time.Now().Format("20060102150405.000") + "@example.com"
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    uniqueEmail,
		Password: "SecurePassword123!",
		FullName: "Test User",
		Role:     "creator",
	})

	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Register failed with status %d: %s", w.Code, w.Body.String())
	}

	var authResp models.AuthResponse
	_ = json.Unmarshal(w.Body.Bytes(), &authResp)
	if authResp.Token == "" {
		t.Errorf("Expected token to be returned")
	}

	// Test Login
	loginBody, _ := json.Marshal(models.LoginRequest{
		Email:    uniqueEmail,
		Password: "SecurePassword123!",
	})
	reqLogin, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(loginBody))
	reqLogin.Header.Set("Content-Type", "application/json")
	wLogin := httptest.NewRecorder()
	router.ServeHTTP(wLogin, reqLogin)

	if wLogin.Code != http.StatusOK {
		t.Fatalf("Login failed with status %d: %s", wLogin.Code, wLogin.Body.String())
	}
}

func TestTestTakingFlow(t *testing.T) {
	_, _, router := setupTestApp(t)

	// 1. List tests
	req, _ := http.NewRequest("GET", "/api/tests", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("List tests failed: %d", w.Code)
	}

	var tests []models.Test
	_ = json.Unmarshal(w.Body.Bytes(), &tests)
	if len(tests) == 0 {
		t.Skip("No tests seeded yet, skipping test taking flow")
	}

	var testID string
	for _, tItem := range tests {
		if tItem.PriceIDR == 0 {
			testID = tItem.ID
			break
		}
	}
	if testID == "" {
		t.Skip("No free tests found, skipping test taking flow")
	}

	// 2. Start test
	reqStart, _ := http.NewRequest("POST", "/api/tests/"+testID+"/start", nil)
	reqStart.Header.Set("X-Forwarded-For", fmt.Sprintf("192.0.2.%d", time.Now().UnixNano()%250+1))
	wStart := httptest.NewRecorder()
	router.ServeHTTP(wStart, reqStart)

	if wStart.Code != http.StatusOK {
		t.Fatalf("Start test failed: %d: %s", wStart.Code, wStart.Body.String())
	}

	var sessionResp models.TestSessionResponse
	_ = json.Unmarshal(wStart.Body.Bytes(), &sessionResp)
	if sessionResp.SessionID == "" {
		t.Fatalf("Expected session_id to be returned")
	}

	sessionID := sessionResp.SessionID

	// 3. Get questions
	reqQ, _ := http.NewRequest("GET", "/api/sessions/"+sessionID+"/questions", nil)
	wQ := httptest.NewRecorder()
	router.ServeHTTP(wQ, reqQ)

	if wQ.Code != http.StatusOK {
		t.Fatalf("Get questions failed: %d", wQ.Code)
	}

	var qResp struct {
		Questions []models.TestQuestion `json:"questions"`
	}
	_ = json.Unmarshal(wQ.Body.Bytes(), &qResp)

	// Verify questions are safe (is_correct is hidden)
	for _, q := range qResp.Questions {
		for _, opt := range q.Options {
			if opt.IsCorrect != nil {
				t.Errorf("Security risk: is_correct should be nil for examinee!")
			}
		}
	}

	// 4. Submit answer if questions exist
	if len(qResp.Questions) > 0 {
		firstQ := qResp.Questions[0]
		var optID *string
		if len(firstQ.Options) > 0 {
			optID = &firstQ.Options[0].ID
		}

		subBody, _ := json.Marshal(map[string]interface{}{
			"question_id": firstQ.ID,
			"optionId":    optID,
		})

		reqSub, _ := http.NewRequest("POST", "/api/sessions/"+sessionID+"/submit-answer", bytes.NewBuffer(subBody))
		reqSub.Header.Set("Content-Type", "application/json")
		wSub := httptest.NewRecorder()
		router.ServeHTTP(wSub, reqSub)

		if wSub.Code != http.StatusOK {
			t.Fatalf("Submit answer failed: %d", wSub.Code)
		}
	}

	// 5. Finish test
	finishBody, _ := json.Marshal(models.FinishTestRequest{TimeSpentSeconds: 60})
	reqFinish, _ := http.NewRequest("POST", "/api/sessions/"+sessionID+"/finish", bytes.NewBuffer(finishBody))
	reqFinish.Header.Set("Content-Type", "application/json")
	wFinish := httptest.NewRecorder()
	router.ServeHTTP(wFinish, reqFinish)

	if wFinish.Code != http.StatusOK {
		t.Fatalf("Finish test failed: %d: %s", wFinish.Code, wFinish.Body.String())
	}

	var result models.TestResult
	_ = json.Unmarshal(wFinish.Body.Bytes(), &result)
	if result.ID == "" {
		t.Fatalf("Expected result.id")
	}

	if len(qResp.Questions) > 0 {
		firstQ := qResp.Questions[0]
		sub, hasSub := result.Submissions[firstQ.ID]
		if !hasSub || sub.SelectedOptionID == nil || *sub.SelectedOptionID != firstQ.Options[0].ID {
			t.Errorf("Expected submission to retain selected_option_id, got %+v", sub)
		}
	}

	// 6. Get Result
	reqRes, _ := http.NewRequest("GET", "/api/results/"+result.ID, nil)
	wRes := httptest.NewRecorder()
	router.ServeHTTP(wRes, reqRes)

	if wRes.Code != http.StatusOK {
		t.Fatalf("Get result failed: %d", wRes.Code)
	}
}

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

func TestMediaUploadFlow(t *testing.T) {
	_, _, router := setupTestApp(t)

	// 1. Register admin to get token
	adminEmail := "media-admin-" + time.Now().Format("20060102150405.000") + "@example.com"
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    adminEmail,
		Password: "Password123!",
		FullName: "Media Admin",
		Role:     "admin",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	token := authResp.Token

	// 2. Upload valid 1x1 PNG image
	pngBytes := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
		0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
		0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "diagram_soal.png")
	if err != nil {
		t.Fatalf("Failed to create form file: %v", err)
	}
	_, _ = part.Write(pngBytes)
	_ = writer.Close()

	reqUpload, _ := http.NewRequest("POST", "/api/admin/upload-media", body)
	reqUpload.Header.Set("Content-Type", writer.FormDataContentType())
	reqUpload.Header.Set("Authorization", "Bearer "+token)
	wUpload := httptest.NewRecorder()
	router.ServeHTTP(wUpload, reqUpload)

	if wUpload.Code != http.StatusCreated {
		t.Fatalf("Upload media failed with status %d: %s", wUpload.Code, wUpload.Body.String())
	}

	var uploadResp struct {
		URL string `json:"url"`
	}
	_ = json.Unmarshal(wUpload.Body.Bytes(), &uploadResp)
	if uploadResp.URL == "" {
		t.Fatalf("Expected url in upload response")
	}

	// 3. Test static file serving of the uploaded media
	reqStatic, _ := http.NewRequest("GET", uploadResp.URL, nil)
	wStatic := httptest.NewRecorder()
	router.ServeHTTP(wStatic, reqStatic)

	if wStatic.Code != http.StatusOK {
		t.Fatalf("Failed to serve static uploaded media from %s: status %d", uploadResp.URL, wStatic.Code)
	}

	// 4. Test upload invalid file (plain text script)
	invalidBody := &bytes.Buffer{}
	invalidWriter := multipart.NewWriter(invalidBody)
	invalidPart, _ := invalidWriter.CreateFormFile("file", "exploit.jpg")
	_, _ = invalidPart.Write([]byte("<?php echo 'malicious script'; ?>"))
	_ = invalidWriter.Close()

	reqInvalid, _ := http.NewRequest("POST", "/api/admin/upload-media", invalidBody)
	reqInvalid.Header.Set("Content-Type", invalidWriter.FormDataContentType())
	reqInvalid.Header.Set("Authorization", "Bearer "+token)
	wInvalid := httptest.NewRecorder()
	router.ServeHTTP(wInvalid, reqInvalid)

	if wInvalid.Code != http.StatusBadRequest {
		t.Fatalf("Expected malicious file to be rejected with 400, got: %d", wInvalid.Code)
	}
}

func TestAdminEditTestFlow(t *testing.T) {
	_, _, router := setupTestApp(t)

	// 1. Register admin
	adminEmail := "edit-admin-" + time.Now().Format("20060102150405.000") + "@example.com"
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    adminEmail,
		Password: "Password123!",
		FullName: "Edit Admin",
		Role:     "admin",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	token := authResp.Token

	// 2. Create initial test
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

	// 3. Fetch test via GET /api/admin/tests/:testId
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

	// 4. Update test via PUT /api/admin/tests/:testId (with updated title, duration, and question with media_url)
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

	// 5. Verify the updated test details
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

	// Register admin to get token
	adminEmail := "val-admin-" + time.Now().Format("20060102150405.000") + "@example.com"
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    adminEmail,
		Password: "Password123!",
		FullName: "Validation Admin",
		Role:     "admin",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	token := authResp.Token

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

func TestRateLimiterAtomicIncr(t *testing.T) {
	cfg := config.LoadConfig()
	client := cache.New(cfg.RedisURL, cfg.RedisPassword)
	defer client.Close()

	ctx := context.Background()
	testKey := fmt.Sprintf("test_rl_%d", time.Now().UnixNano())

	// First hit
	c1, err := client.IncrAtomic(ctx, testKey, 1*time.Second)
	if err != nil {
		t.Fatalf("IncrAtomic failed: %v", err)
	}
	if c1 != 1 {
		t.Errorf("Expected count 1 on first hit, got %d", c1)
	}

	// Second hit within window
	c2, err := client.IncrAtomic(ctx, testKey, 1*time.Second)
	if err != nil {
		t.Fatalf("IncrAtomic failed: %v", err)
	}
	if c2 != 2 {
		t.Errorf("Expected count 2 on second hit, got %d", c2)
	}

	// Wait for window to expire
	time.Sleep(1100 * time.Millisecond)

	// Hit after window expiration should reset to 1
	c3, err := client.IncrAtomic(ctx, testKey, 1*time.Second)
	if err != nil {
		t.Fatalf("IncrAtomic failed: %v", err)
	}
	if c3 != 1 {
		t.Errorf("Expected count 1 after window reset, got %d", c3)
	}
}

func getAdminToken(t *testing.T, router http.Handler) string {
	uniqueEmail := fmt.Sprintf("admin-%d-%d@testhub.id", time.Now().UnixNano(), time.Now().Unix())
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    uniqueEmail,
		Password: "SecurePassword123!",
		FullName: "System Administrator",
		Role:     "admin",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	return authResp.Token
}

func TestPaywallAndSubscriptionFlow(t *testing.T) {
	db, _, router := setupTestApp(t)
	adminToken := getAdminToken(t, router)

	// 1. Create a Paid Test with price_idr = 25000
	paidTestTitle := "Tryout Akbar Berbayar SKD CPNS 2026"
	price := 25000.0
	trueVal := true
	falseVal := false
	createBody, _ := json.Marshal(models.SaveTestDTO{
		Title:                  paidTestTitle,
		Description:            "Ujian berbayar dengan paywall otomatis",
		Category:               "cpns",
		DurationMinutes:        90,
		PassingScorePercentage: 70,
		PriceIDR:               price,
		Published:              true,
		Questions: []models.QuestionDTO{
			{
				QuestionNumber:  1,
				QuestionType:    "multiple_choice",
				QuestionText:    "Apa ibu kota Nusantara?",
				DifficultyLevel: "medium",
				Points:          5,
				Options: []models.OptionDTO{
					{OptionLetter: "A", OptionText: "Penajam Paser Utara", IsCorrect: &trueVal},
					{OptionLetter: "B", OptionText: "Jakarta", IsCorrect: &falseVal},
				},
			},
		},
	})

	req, _ := http.NewRequest("POST", "/api/admin/tests", bytes.NewBuffer(createBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Failed to create paid test: %d: %s", w.Code, w.Body.String())
	}

	var created models.Test
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	testID := created.ID

	// 2. An examinee tries to start the test without paying -> Expect HTTP 402 Payment Required
	userEmail := "examinee-student@example.com"
	startReq, _ := http.NewRequest("POST", "/api/tests/"+testID+"/start", bytes.NewBuffer([]byte(fmt.Sprintf(`{"email":"%s"}`, userEmail))))
	startReq.Header.Set("Content-Type", "application/json")
	startReq.Header.Set("X-User-Email", userEmail)
	startReq.Header.Set("X-Forwarded-For", fmt.Sprintf("198.51.100.%d", time.Now().UnixNano()%200+10))
	wStart := httptest.NewRecorder()
	router.ServeHTTP(wStart, startReq)

	if wStart.Code != http.StatusPaymentRequired {
		t.Fatalf("Expected HTTP 402 Payment Required for unpaid test, got %d: %s", wStart.Code, wStart.Body.String())
	}

	// 3. User creates an invoice via POST /api/payments/create-invoice
	invReqBody, _ := json.Marshal(models.CreateInvoiceDTO{
		UserEmail: userEmail,
		PlanType:  "per_test",
		TestID:    &testID,
	})
	invReq, _ := http.NewRequest("POST", "/api/payments/create-invoice", bytes.NewBuffer(invReqBody))
	invReq.Header.Set("Content-Type", "application/json")
	wInv := httptest.NewRecorder()
	router.ServeHTTP(wInv, invReq)

	if wInv.Code != http.StatusCreated {
		t.Fatalf("Failed to create invoice: %d: %s", wInv.Code, wInv.Body.String())
	}

	var invResp map[string]interface{}
	_ = json.Unmarshal(wInv.Body.Bytes(), &invResp)
	orderID := invResp["order_id"].(string)

	// 4. Check Order status -> pending
	statusReq, _ := http.NewRequest("GET", "/api/payments/status/"+orderID, nil)
	wStatus := httptest.NewRecorder()
	router.ServeHTTP(wStatus, statusReq)
	if wStatus.Code != http.StatusOK {
		t.Fatalf("Failed to get order status: %d", wStatus.Code)
	}

	// 5. Payment Webhook settlement occurs
	webhookBody, _ := json.Marshal(models.PaymentWebhookDTO{
		OrderID:           orderID,
		TransactionStatus: "settlement",
		SignatureKey:      "TEST_SIGNATURE_KEY_123",
	})
	webReq, _ := http.NewRequest("POST", "/api/payments/webhook", bytes.NewBuffer(webhookBody))
	webReq.Header.Set("Content-Type", "application/json")
	wWeb := httptest.NewRecorder()
	router.ServeHTTP(wWeb, webReq)

	if wWeb.Code != http.StatusOK {
		t.Fatalf("Webhook failed with status %d: %s", wWeb.Code, wWeb.Body.String())
	}

	// 6. Examinee now starts the test -> Expect HTTP 200 OK (Paywall unlocked!)
	startReq2, _ := http.NewRequest("POST", "/api/tests/"+testID+"/start", bytes.NewBuffer([]byte(fmt.Sprintf(`{"email":"%s"}`, userEmail))))
	startReq2.Header.Set("Content-Type", "application/json")
	startReq2.Header.Set("X-User-Email", userEmail)
	startReq2.Header.Set("X-Forwarded-For", fmt.Sprintf("198.51.100.%d", time.Now().UnixNano()%200+11))
	wStart2 := httptest.NewRecorder()
	router.ServeHTTP(wStart2, startReq2)

	if wStart2.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 after payment settlement, got %d: %s", wStart2.Code, wStart2.Body.String())
	}

	_ = db
}

func TestAdminManualGrantAndSubscriptions(t *testing.T) {
	_, _, router := setupTestApp(t)
	adminToken := getAdminToken(t, router)

	// Admin manually grants a season pass
	manualEmail := "b2b-student-vip@bimbel.id"
	grantBody, _ := json.Marshal(models.ManualGrantSubscriptionDTO{
		UserIdentifier: manualEmail,
		PlanType:       "season_pass",
		ValidDays:      60,
		ReasonNotes:    "B2B Bimbel Mitra Agreement #9921",
	})

	req, _ := http.NewRequest("POST", "/api/admin/subscriptions/manual-grant", bytes.NewBuffer(grantBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created for manual grant, got %d: %s", w.Code, w.Body.String())
	}

	// Admin lists subscriptions
	listReq, _ := http.NewRequest("GET", "/api/admin/subscriptions?search="+manualEmail, nil)
	listReq.Header.Set("Authorization", "Bearer "+adminToken)
	wList := httptest.NewRecorder()
	router.ServeHTTP(wList, listReq)

	if wList.Code != http.StatusOK {
		t.Fatalf("Expected 200 for listing subscriptions, got %d", wList.Code)
	}
}

func TestLeaderboardAndCertificates(t *testing.T) {
	_, publicHandler, router := setupTestApp(t)

	// 1. Check leaderboard endpoint returns empty array or rankings without crashing
	req, _ := http.NewRequest("GET", "/api/tests/test-123-dummy/leaderboard", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 for leaderboard endpoint, got %d", w.Code)
	}

	_ = publicHandler
}

func TestAdminAuditLogFlow(t *testing.T) {
	_, _, router := setupTestApp(t)

	adminEmail := "audit-admin-" + time.Now().Format("20060102150405.000") + "@example.com"
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    adminEmail,
		Password: "Password123!",
		FullName: "Audit Inspector Admin",
		Role:     "admin",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	token := authResp.Token

	// 1. Create a test to trigger "create_test" audit log
	isTrue := true
	isFalse := false
	createBody, _ := json.Marshal(map[string]interface{}{
		"title":                    "Audit Verification Test",
		"description":              "Checking audit logs persistence",
		"category":                 "iq",
		"duration_minutes":         20,
		"passing_score_percentage": 70,
		"published":                false,
		"questions": []models.TestQuestion{
			{
				QuestionText:    "Pertanyaan audit test?",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "easy",
				Points:          10,
				Options: []models.QuestionOption{
					{OptionLetter: "A", OptionText: "Jawaban A", IsCorrect: &isTrue},
					{OptionLetter: "B", OptionText: "Jawaban B", IsCorrect: &isFalse},
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

	// 2. Toggle publish to trigger "publish_test" audit log
	reqToggle, _ := http.NewRequest("POST", fmt.Sprintf("/api/admin/tests/%s/toggle-publish", createdTest.ID), nil)
	reqToggle.Header.Set("Authorization", "Bearer "+token)
	wToggle := httptest.NewRecorder()
	router.ServeHTTP(wToggle, reqToggle)

	if wToggle.Code != http.StatusOK {
		t.Fatalf("Toggle publish failed with status %d: %s", wToggle.Code, wToggle.Body.String())
	}

	// 3. Create a payment invoice to trigger "payment_invoice_created" audit log
	invBody, _ := json.Marshal(map[string]interface{}{
		"user_email": "payer-" + time.Now().Format("150405") + "@example.com",
		"plan_type":  "season_pass",
	})
	reqInv, _ := http.NewRequest("POST", "/api/payments/create-invoice", bytes.NewBuffer(invBody))
	reqInv.Header.Set("Content-Type", "application/json")
	reqInv.Header.Set("Authorization", "Bearer "+token)
	wInv := httptest.NewRecorder()
	router.ServeHTTP(wInv, reqInv)

	if wInv.Code != http.StatusCreated {
		t.Fatalf("Create invoice failed with status %d: %s", wInv.Code, wInv.Body.String())
	}

	// 4. Generate AI questions to trigger "ai_generate_success" audit log
	aiReqBody, _ := json.Marshal(map[string]interface{}{
		"category":   "sbmptn",
		"subject":    "Matematika",
		"difficulty": "medium",
		"count":      2,
	})
	reqAI, _ := http.NewRequest("POST", "/api/ai/generate-questions", bytes.NewBuffer(aiReqBody))
	reqAI.Header.Set("Content-Type", "application/json")
	wAI := httptest.NewRecorder()
	router.ServeHTTP(wAI, reqAI)

	if wAI.Code != http.StatusOK {
		t.Fatalf("AI generate questions failed with status %d: %s", wAI.Code, wAI.Body.String())
	}

	// Wait 150ms for background goroutines to persist audit logs
	time.Sleep(150 * time.Millisecond)

	// 5. Fetch audit logs via GET /api/admin/audit-logs
	reqLogs, _ := http.NewRequest("GET", "/api/admin/audit-logs?limit=100", nil)
	reqLogs.Header.Set("Authorization", "Bearer "+token)
	wLogs := httptest.NewRecorder()
	router.ServeHTTP(wLogs, reqLogs)

	if wLogs.Code != http.StatusOK {
		t.Fatalf("Fetch audit logs failed with status %d: %s", wLogs.Code, wLogs.Body.String())
	}

	var logs []models.AdminAuditLog
	if err := json.Unmarshal(wLogs.Body.Bytes(), &logs); err != nil {
		t.Fatalf("Failed to parse audit logs response: %v", err)
	}

	if len(logs) == 0 {
		t.Fatalf("Expected audit logs to not be empty, got 0 logs. Response: %s", wLogs.Body.String())
	}

	foundCreate := false
	foundPublish := false
	foundPayment := false
	foundAI := false

	for _, l := range logs {
		if l.Action == "create_test" && l.ResourceID != nil && *l.ResourceID == createdTest.ID {
			foundCreate = true
		}
		if l.Action == "toggle_publish" && l.ResourceID != nil && *l.ResourceID == createdTest.ID {
			foundPublish = true
		}
		if l.Action == "payment_invoice_created" {
			foundPayment = true
		}
		if l.Action == "ai_generate_success" {
			foundAI = true
		}
	}

	if !foundCreate {
		t.Errorf("Expected create_test audit log for test %s, but wasn't found", createdTest.ID)
	}
	if !foundPublish {
		t.Errorf("Expected toggle_publish audit log for test %s, but wasn't found", createdTest.ID)
	}
	if !foundPayment {
		t.Errorf("Expected payment_invoice_created audit log, but wasn't found")
	}
	if !foundAI {
		t.Errorf("Expected ai_generate_success audit log, but wasn't found")
	}
}

func TestPublicStats_AndCatalogEnrichment_E2E(t *testing.T) {
	_, _, router := setupTestApp(t)

	// 1. Check GET /api/public/stats
	req, _ := http.NewRequest("GET", "/api/public/stats", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK from /api/public/stats, got %d: %s", w.Code, w.Body.String())
	}

	var stats models.PublicStats
	if err := json.Unmarshal(w.Body.Bytes(), &stats); err != nil {
		t.Fatalf("Failed to parse public stats JSON: %v", err)
	}

	// 2. Check alias GET /api/public/live-stats
	reqLive, _ := http.NewRequest("GET", "/api/public/live-stats", nil)
	wLive := httptest.NewRecorder()
	router.ServeHTTP(wLive, reqLive)

	if wLive.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK from /api/public/live-stats, got %d", wLive.Code)
	}

	// 3. Check GET /api/tests returns enriched tests with social metrics
	reqTests, _ := http.NewRequest("GET", "/api/tests", nil)
	wTests := httptest.NewRecorder()
	router.ServeHTTP(wTests, reqTests)

	if wTests.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK from /api/tests, got %d", wTests.Code)
	}

	var tests []models.Test
	if err := json.Unmarshal(wTests.Body.Bytes(), &tests); err != nil {
		t.Fatalf("Failed to parse tests JSON: %v", err)
	}
}


