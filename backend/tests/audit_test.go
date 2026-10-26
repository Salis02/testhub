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

func TestAdminAuditLogFlow(t *testing.T) {
	_, _, router := setupTestApp(t)
	token := getAdminToken(t, router)

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

	// 2. Toggle publish to trigger "toggle_publish" audit log
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
	reqInv.Header.Set("X-Forwarded-For", fmt.Sprintf("10.3.%d.%d", (time.Now().UnixNano()/1000)%250+1, time.Now().UnixNano()%250+1))
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
	reqAI.Header.Set("Authorization", "Bearer "+token)
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
