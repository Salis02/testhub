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
