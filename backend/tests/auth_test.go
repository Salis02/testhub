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

	uniqueIP := fmt.Sprintf("10.1.%d.%d", (time.Now().UnixNano()/1000)%250+1, time.Now().UnixNano()%250+1)
	uniqueEmail := "test-" + time.Now().Format("20060102150405.000") + "@example.com"
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    uniqueEmail,
		Password: "SecurePassword123!",
		FullName: "Test User",
		Role:     "creator",
	})

	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Forwarded-For", uniqueIP)
	req.RemoteAddr = uniqueIP + ":12345"
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
	reqLogin.Header.Set("X-Forwarded-For", uniqueIP)
	reqLogin.RemoteAddr = uniqueIP + ":12345"
	wLogin := httptest.NewRecorder()
	router.ServeHTTP(wLogin, reqLogin)

	if wLogin.Code != http.StatusOK {
		t.Fatalf("Login failed with status %d: %s", wLogin.Code, wLogin.Body.String())
	}
}
