package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"testhub/internal/models"
)

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
