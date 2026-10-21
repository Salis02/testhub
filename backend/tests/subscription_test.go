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
