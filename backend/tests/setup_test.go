package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
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

// setupTestApp initializes test database, Redis/memory cache, repositories, and router
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

// getAdminToken is a shared helper to register and return a JWT bearer token for admin operations
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
	ip := fmt.Sprintf("10.0.%d.%d", (time.Now().UnixNano()/1000)%250+1, time.Now().UnixNano()%250+1)
	reqReg.Header.Set("X-Forwarded-For", ip)
	reqReg.RemoteAddr = ip + ":12345"
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	return authResp.Token
}

// getUserToken registers a standard user and returns their JWT bearer token
func getUserToken(t *testing.T, router http.Handler, email string) string {
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    email,
		Password: "SecurePassword123!",
		FullName: "Test User",
		Role:     "user",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	ip := fmt.Sprintf("10.0.%d.%d", (time.Now().UnixNano()/1000)%250+1, time.Now().UnixNano()%250+1)
	reqReg.Header.Set("X-Forwarded-For", ip)
	reqReg.RemoteAddr = ip + ":12345"
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	return authResp.Token
}

// getCreatorToken registers a creator user and returns their JWT bearer token
func getCreatorToken(t *testing.T, router http.Handler) string {
	uniqueEmail := fmt.Sprintf("creator-%d-%d@testhub.id", time.Now().UnixNano(), time.Now().Unix())
	regBody, _ := json.Marshal(models.RegisterRequest{
		Email:    uniqueEmail,
		Password: "SecurePassword123!",
		FullName: "Creator Instructor",
		Role:     "creator",
	})
	reqReg, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(regBody))
	reqReg.Header.Set("Content-Type", "application/json")
	ip := fmt.Sprintf("10.0.%d.%d", (time.Now().UnixNano()/1000)%250+1, time.Now().UnixNano()%250+1)
	reqReg.Header.Set("X-Forwarded-For", ip)
	reqReg.RemoteAddr = ip + ":12345"
	wReg := httptest.NewRecorder()
	router.ServeHTTP(wReg, reqReg)

	var authResp models.AuthResponse
	_ = json.Unmarshal(wReg.Body.Bytes(), &authResp)
	return authResp.Token
}
