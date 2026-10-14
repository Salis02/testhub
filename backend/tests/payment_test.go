package tests

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"testhub/internal/models"
	"testhub/internal/services"
)

func TestMidtransProvider_SignatureVerification(t *testing.T) {
	serverKey := "Mid-server-test-key-mock"
	provider := services.NewMidtransProvider(serverKey, false)

	orderID := "order-" + time.Now().Format("20060102150405")
	statusCode := "200"
	grossAmount := "150000.00"

	// SHA512(order_id + status_code + gross_amount + ServerKey)
	input := orderID + statusCode + grossAmount + serverKey
	hasher := sha512.New()
	hasher.Write([]byte(input))
	validSignature := hex.EncodeToString(hasher.Sum(nil))

	// Test 1: Valid signature with settlement status
	validPayload := map[string]interface{}{
		"order_id":           orderID,
		"status_code":        statusCode,
		"gross_amount":       grossAmount,
		"signature_key":      validSignature,
		"transaction_status": "settlement",
		"payment_type":       "qris",
		"transaction_id":     "trx-12345",
	}
	bodyBytes, _ := json.Marshal(validPayload)

	result, err := provider.VerifyWebhook(context.Background(), bodyBytes)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}
	if !result.SignatureValid {
		t.Errorf("Expected signature to be valid, got invalid")
	}
	if result.TransactionStatus != "settled" {
		t.Errorf("Expected normalized status 'settled', got '%s'", result.TransactionStatus)
	}

	// Test 2: Invalid signature spoofing attempt
	invalidPayload := map[string]interface{}{
		"order_id":           orderID,
		"status_code":        statusCode,
		"gross_amount":       grossAmount,
		"signature_key":      "fraudulent_unmatched_signature_key_999",
		"transaction_status": "settlement",
		"payment_type":       "qris",
	}
	invalidBytes, _ := json.Marshal(invalidPayload)
	invResult, err := provider.VerifyWebhook(context.Background(), invalidBytes)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}
	if invResult.SignatureValid {
		t.Errorf("Expected signature to be REJECTED for spoofed payload, but it was marked valid")
	}
}

func TestPayment_CreateInvoiceAndWebhook_E2E(t *testing.T) {
	_, _, router := setupTestApp(t)

	// Step 1: Create an invoice for guest
	uniqueEmail := fmt.Sprintf("buyer-%d@example.com", time.Now().UnixNano())
	invoiceReq := models.CreateInvoiceDTO{
		TestID:    nil,
		PlanType:  "season_pass",
		UserEmail: uniqueEmail,
	}
	body, _ := json.Marshal(invoiceReq)

	req, _ := http.NewRequest("POST", "/api/payments/create-invoice", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated && w.Code != http.StatusOK {
		t.Fatalf("Expected status 200 or 201, got %d: %s", w.Code, w.Body.String())
	}

	var invoiceResp struct {
		OrderID   string  `json:"order_id"`
		Amount    float64 `json:"amount"`
		SnapToken string  `json:"snap_token"`
		Provider  string  `json:"provider"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &invoiceResp); err != nil {
		t.Fatalf("Failed to parse invoice response: %v", err)
	}

	if invoiceResp.OrderID == "" {
		t.Fatalf("Expected non-empty order_id")
	}

	// Step 2: Trigger Webhook Settlement
	webhookPayload := map[string]interface{}{
		"order_id":           invoiceResp.OrderID,
		"status_code":        "200",
		"gross_amount":       fmt.Sprintf("%.2f", invoiceResp.Amount),
		"signature_key":      "SIMULATED_GATEWAY_SETTLEMENT",
		"transaction_status": "settlement",
		"payment_type":       "qris",
		"transaction_id":     "trx-auto-test",
	}
	wbBytes, _ := json.Marshal(webhookPayload)

	reqWb, _ := http.NewRequest("POST", "/api/payments/webhook", bytes.NewBuffer(wbBytes))
	reqWb.Header.Set("Content-Type", "application/json")
	wWb := httptest.NewRecorder()
	router.ServeHTTP(wWb, reqWb)

	if wWb.Code != http.StatusOK {
		t.Fatalf("Expected status 200 on webhook, got %d: %s", wWb.Code, wWb.Body.String())
	}

	// Step 3: Check order status
	reqStatus, _ := http.NewRequest("GET", "/api/payments/status/"+invoiceResp.OrderID, nil)
	wStatus := httptest.NewRecorder()
	router.ServeHTTP(wStatus, reqStatus)

	if wStatus.Code != http.StatusOK {
		t.Fatalf("Expected status 200 on order status check, got %d: %s", wStatus.Code, wStatus.Body.String())
	}

	var orderStatusResp struct {
		Status string `json:"status"`
	}
	_ = json.Unmarshal(wStatus.Body.Bytes(), &orderStatusResp)
	if orderStatusResp.Status != "settled" {
		t.Errorf("Expected settled status, got %s", orderStatusResp.Status)
	}

	// Step 4: Test Idempotency (replay webhook)
	reqWb2, _ := http.NewRequest("POST", "/api/payments/webhook", bytes.NewBuffer(wbBytes))
	reqWb2.Header.Set("Content-Type", "application/json")
	wWb2 := httptest.NewRecorder()
	router.ServeHTTP(wWb2, reqWb2)

	if wWb2.Code != http.StatusOK {
		t.Fatalf("Expected idempotency status 200 on repeated webhook, got %d", wWb2.Code)
	}
}
