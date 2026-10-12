package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"testhub/internal/cache"
	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/handlers"
	"testhub/internal/models"
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

	return db, handlers.NewPublicHandler(db, cacheClient), router
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

	testID := tests[0].ID

	// 2. Start test
	reqStart, _ := http.NewRequest("POST", "/api/tests/"+testID+"/start", nil)
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
