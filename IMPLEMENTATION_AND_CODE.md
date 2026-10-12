# 💻 IMPLEMENTATION GUIDE & STARTER CODE
## Backend (Go) & Development Roadmap

---

## 1. IMPLEMENTATION STATUS & CHECKLIST

### ✅ Phase 1: MVP (Completed & Verified)

#### Backend Setup
- [x] Initialize Go project with `go.mod` (Go 1.22+)
- [x] Setup PostgreSQL connection pool (`sqlx` + `lib/pq` with max conns/idle pooling)
- [x] Setup Redis client (`go-redis/v9` with transparent in-memory fallback)
- [x] Create database schema & migrations (`migrations/001_init.sql`)
- [x] Setup logging (Structured JSON logging middleware)
- [x] Create project structure (Clean architecture: `cmd/`, `internal/config`, `internal/database`, `internal/cache`, `internal/models`, `internal/middleware`, `internal/services`, `internal/handlers`)

#### API Endpoints (Core & Priority)
- [x] `POST /api/tests/:testId/start` (start non-auth anonymous test session)
- [x] `GET /api/sessions/:sessionId/questions` (get safe test questions, stripped of answers)
- [x] `GET /api/sessions/:sessionId/submissions` (get session draft answers)
- [x] `POST /api/sessions/:sessionId/submit-answer` (auto-save/submit answer)
- [x] `POST /api/sessions/:sessionId/finish` (finish test, auto-grading, calculate percentiles)
- [x] `GET /api/results/:resultId` (view comprehensive results & post-test reviews)
- [x] `POST /api/auth/register` (admin/creator registration with bcrypt)
- [x] `POST /api/auth/login` (admin/creator login with JWT token issuance)
- [x] `GET /api/auth/me` (admin/creator profile validation)
- [x] `GET /health` (server health check endpoint)

#### Core Features
- [x] Session management (anonymous UUID sessions with 24h expiration)
- [x] Auto-grading (multiple choice instant scoring)
- [x] Formula-based score calculation (percentage, passing status, percentile estimation)
- [x] Category performance evaluation (Penalaran, Pemahaman, Ketelitian)
- [x] AI Question Generator (`POST /api/ai/generate-questions`)
- [x] Rate limiting middleware per IP & session (anti-DDoS/spam protection)
- [x] Database seed command (`cmd/seed/main.go`) with realistic CPNS, SBMPTN, IQ, and BUMN questions

#### Frontend (React + Bun)
- [x] Project setup (Vite + React 19 + TypeScript + Tailwind CSS)
- [x] Test taking form (non-auth session flow, media image rendering)
- [x] Answer submission UI with flag questions
- [x] Results display with percentile & category breakdown
- [x] Admin login portal dengan Role-Based Access Control (RBAC) & ProtectedRoute
- [x] Test management (create, publish toggle, delete)
- [x] **Edit Modul Ujian & Soal (`PUT /api/admin/tests/:testId` via `TestEditorModal.tsx`)**
- [x] **Unggah Media Gambar Soal (`POST /api/admin/upload-media` via `MediaUploader.tsx`)**
- [x] **Universal Toast & Confirmation Modal (`useToast`, `useConfirm` - DRY, anti-browser popups)**
- [x] **AI Question Generator Modal (`AIAssistantModal.tsx`) dengan Dynamic Progressing & Skeleton Loader**
- [x] Dashboard (stats overview & essay review queue)
- [x] API client (`frontend/src/services/api.ts`) integrated with Go backend via proxy
- [x] Static uploads proxy (`/uploads` -> backend `http://localhost:8000`)

#### Testing & QA
- [x] Integration & unit test suite in `backend/tests/api_test.go` (100% Passing)
- [x] Frontend build & type-checking (`bun run build` - 100% Passing, 0 errors)
  - `TestHealthCheck` (PASS)
  - `TestAuthFlow` (PASS)
  - `TestTestTakingFlow` (PASS)
  - `TestAIGenerator` (PASS)

#### DevOps & Orchestration
- [x] Root `Makefile` with targets (`setup`, `dev`, `test`, `migrate`, `seed`, `build-backend`, `build-frontend`)
- [x] Multi-stage `Dockerfile` for Go backend
- [x] `docker-compose.yml` (development) & `docker-compose.prod.yml` (production)
- [x] Nginx reverse proxy configuration (`nginx/nginx.conf`)
- [x] Automation shell scripts in `scripts/` (`init-db.sh`, `health-check.sh`, `backup.sh`, `deploy.sh`)

#### Production Hardening & Reliability (Completed)
- [x] **Graceful Shutdown**: `http.Server` dengan OS signal trap (`SIGINT`, `SIGTERM`) dan timeout 10 detik agar request ujian/grading yang sedang aktif tidak terputus paksa.
- [x] **Context Propagation & Upstream Abort**: Request AI (`POST /api/ai/generate-questions`) meneruskan `c.Request.Context()` ke upstream HTTP request Gemini/Groq sehingga jika user menutup tab/membatalkan request (`AbortController`), pemanggilan LLM langsung berhenti untuk menghemat kuota gratis.
- [x] **Robust Auto-Migrations**: Fallback deteksi multi-path (`migrations`, `backend/migrations`, `../migrations`) sehingga server dapat dijalankan dari direktori manapun tanpa error path.
- [x] **Production Gin Mode**: Otomatis mengaktifkan `gin.SetMode(gin.ReleaseMode)` ketika `ENVIRONMENT=production`.

---

### ✅ Phase 2: Enhancement (Core Implemented)

#### Endpoints
- [x] `GET /api/tests` (browse published tests with category & keyword filters)
- [x] `GET /api/tests/:testId` (get test details)
- [x] `GET /api/admin/tests` (list all tests including drafts)
- [x] `GET /api/admin/tests/:testId` (get complete test details with correct answers & media for editing)
- [x] `PUT /api/admin/tests/:testId` (atomic update of test metadata, questions with `media_url`, and options)
- [x] `POST /api/admin/upload-media` (upload question images max 2MB, magic-byte sniffing, secure UUID naming)
- [x] `DELETE /api/admin/media` (safely delete uploaded media by URL)
- [x] `GET /uploads/*` (static media serving with HTTP caching)
- [x] `POST /api/admin/tests/:testId/toggle-publish` (toggle publish state)
- [x] `DELETE /api/admin/tests/:testId` (soft-delete test)
- [x] `GET /api/admin/tests/:testId/analytics` (analytics per test: submissions, avg score, passing rate)
- [x] `GET /api/admin/essays` (pending essay submissions review queue)
- [x] `POST /api/admin/essays/:essayId/grade` (manual review & score grading)

#### Next Roadmap Features
- [ ] Email notification service (goroutine queue for test completion receipts)
- [ ] Adaptive testing mode (adjust question difficulty based on consecutive answers)
- [ ] Export result certificate / score report as PDF
- [ ] Stripe / Midtrans payment webhook integration (Monetization Phase 3)

---

## 2. DEVELOPER EXTENSION GUIDE (HOW TO ADD NEW FEATURES)

Dokumentasi ini dibuat agar AI Agent dan Developer dapat menambahkan fitur baru dengan standar Clean Architecture yang konsisten:

### 2.1 Menambahkan Tabel / Kolom Database Baru
1. Buat file migrasi SQL baru di `backend/migrations/`, contoh: `002_add_certificates.sql`.
2. Format penamaan menggunakan urutan numerik: `001_init.sql`, `002_xxx.sql`.
3. Jalankan migrasi:
   ```bash
   make migrate
   # atau: cd backend && go run cmd/migrate/main.go
   ```
4. `database.RunMigrations` akan otomatis mengeksekusi file `.sql` secara alfabetis/numerik.

### 2.2 Menambahkan Model Domain Baru
1. Buka [backend/internal/models/models.go](file:///home/sans/coding/quiz_app/backend/internal/models/models.go).
2. Definisikan struct database dan struct request/response DTO.
3. **Penting:** Kolom database yang bersifat `NULL` **wajib** menggunakan pointer (contoh: `*string`, `*float64`, `*time.Time`) agar `sqlx` tidak mengalami `converting NULL to string is unsupported`.
4. Tambahkan tag `db:"column_name"` dan `json:"field_name"`.

### 2.3 Menambahkan Service / Logika Bisnis Baru
1. Buat file baru di `backend/internal/services/` (contoh: `certificate.go` atau `analytics.go`).
2. Pastikan service bersifat pure/testable tanpa dependensi HTTP `gin.Context`.
3. Tulis unit test untuk service di `backend/tests/`.

### 2.4 Menambahkan Handler HTTP & Endpoint Baru
1. Tambahkan fungsi handler di `backend/internal/handlers/` (misal: `public.go` untuk endpoint peserta, `admin.go` untuk endpoint berautentikasi, atau file handler baru).
2. Binding request menggunakan `c.ShouldBindJSON(&req)`.
3. Validasi error dan kembalikan respon standar JSON:
   ```go
   c.JSON(http.StatusOK, data)
   // atau jika error:
   c.JSON(http.StatusBadRequest, gin.H{"error": "Pesan error"})
   ```

### 2.5 Mendaftarkan Rute & Middleware
1. Buka [backend/internal/handlers/routes.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go).
2. Tambahkan rute pada router group yang sesuai:
   - Jika publik: masukkan ke group `api.Group("/tests")` atau `api.Group("/sessions")`.
   - Jika perlu rate limiting: tambahkan `middleware.RateLimit(cacheClient, maxReq, window, "action_name")`.
   - Jika admin: masukkan ke group `api.Group("/admin")` (otomatis dilindungi `AuthRequired` & `RequireAdmin`).

### 2.6 Menguji Fitur Baru
1. Tambahkan skenario pengujian di [backend/tests/api_test.go](file:///home/sans/coding/quiz_app/backend/tests/api_test.go).
2. Jalankan test:
   ```bash
   make test
   # atau: cd backend && go test ./tests -v
   ```

### 2.7 Menghubungkan ke Frontend React
1. Tambahkan method pada objek `api` di [frontend/src/services/api.ts](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts).
2. Gunakan `fetch('/api/...')` dengan fallback gracefully ke local state.
3. Jalankan `npm run build` di direktori `frontend/` untuk memastikan kesesuaian tipe TypeScript.

---

## 2. GO BACKEND STARTER CODE

### 2.1 Project Structure

```go
// backend/main.go
package main

import (
    "fmt"
    "log"
    "os"
    
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    
    "testhub/internal/config"
    "testhub/internal/database"
    "testhub/internal/handlers"
    "testhub/internal/middleware"
    "testhub/internal/cache"
)

func main() {
    // Load env
    godotenv.Load()
    
    // Config
    cfg := config.LoadConfig()
    
    // Database
    db, err := database.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    
    // Cache
    cacheClient := cache.New(cfg.RedisURL)
    
    // Router
    router := gin.Default()
    
    // Middleware
    router.Use(middleware.Logger())
    router.Use(middleware.CORS())
    router.Use(middleware.ErrorHandler())
    
    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })
    
    // Public routes (non-auth)
    public := router.Group("/api")
    handlers.RegisterPublicRoutes(public, db, cacheClient)
    
    // Protected routes (admin)
    protected := router.Group("/api")
    protected.Use(middleware.AuthRequired())
    handlers.RegisterAdminRoutes(protected, db, cacheClient)
    
    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8000"
    }
    
    log.Printf("Starting server on port %s", port)
    router.Run(":" + port)
}
```

### 2.2 Config Module

```go
// internal/config/config.go
package config

import (
    "os"
    "strconv"
    "time"
)

type Config struct {
    // Database
    DBHost     string
    DBPort     int
    DBUser     string
    DBPassword string
    DBName     string
    DBPoolSize int
    
    // Redis
    RedisURL string
    
    // JWT
    JWTSecret string
    JWTExpiry time.Duration
    
    // Server
    Port        string
    Environment string
    LogLevel    string
    
    // Features
    RateLimitRequests int
    RateLimitWindow   time.Duration
}

func LoadConfig() *Config {
    return &Config{
        DBHost:            getEnv("DB_HOST", "localhost"),
        DBPort:            getEnvInt("DB_PORT", 5432),
        DBUser:            getEnv("DB_USER", "user"),
        DBPassword:        getEnv("DB_PASSWORD", "password"),
        DBName:            getEnv("DB_NAME", "testhub"),
        DBPoolSize:        getEnvInt("DB_POOL_SIZE", 20),
        RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
        JWTSecret:         getEnv("JWT_SECRET", "secret"),
        JWTExpiry:         15 * time.Minute,
        Port:              getEnv("PORT", "8000"),
        Environment:       getEnv("ENVIRONMENT", "development"),
        LogLevel:          getEnv("LOG_LEVEL", "debug"),
        RateLimitRequests: getEnvInt("RATE_LIMIT_REQUESTS", 100),
        RateLimitWindow:   time.Minute,
    }
}

func getEnv(key, defaultVal string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
    valStr := os.Getenv(key)
    if val, err := strconv.Atoi(valStr); err == nil {
        return val
    }
    return defaultVal
}
```

### 2.3 Database Module

```go
// internal/database/db.go
package database

import (
    "fmt"
    "time"
    
    "github.com/jmoiron/sqlx"
    _ "github.com/lib/pq"
    
    "testhub/internal/config"
)

type DB struct {
    *sqlx.DB
}

func New(cfg *config.Config) (*DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
        cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
    )
    
    db, err := sqlx.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }
    
    // Connection pool settings
    db.SetMaxOpenConns(cfg.DBPoolSize)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)
    
    // Test connection
    if err := db.Ping(); err != nil {
        return nil, err
    }
    
    return &DB{db}, nil
}
```

### 2.4 Models

```go
// internal/models/test.go
package models

import (
    "time"
    
    "github.com/google/uuid"
)

// Test represents an exam/test
type Test struct {
    ID                   uuid.UUID `db:"id"`
    CreatorID            uuid.UUID `db:"creator_id"`
    Title                string    `db:"title"`
    Description          string    `db:"description"`
    Category             string    `db:"category"` // cpns, sbmptn, iq, custom
    DurationMinutes      int       `db:"duration_minutes"`
    PassingScorePercent  int       `db:"passing_score_percentage"`
    TotalQuestions       int       `db:"total_questions"`
    ShuffleQuestions     bool      `db:"shuffle_questions"`
    ShuffleAnswers       bool      `db:"shuffle_answers"`
    Published            bool      `db:"published"`
    CreatedAt            time.Time `db:"created_at"`
    UpdatedAt            time.Time `db:"updated_at"`
}

// TestQuestion represents a single question
type TestQuestion struct {
    ID              uuid.UUID `db:"id"`
    TestID          uuid.UUID `db:"test_id"`
    QuestionNumber  int       `db:"question_number"`
    QuestionText    string    `db:"question_text"`
    QuestionType    string    `db:"question_type"` // multiple_choice, essay, matching
    MediaURL        *string   `db:"media_url"`
    DifficultyLevel string    `db:"difficulty_level"` // easy, medium, hard
    Explanation     string    `db:"explanation"`
    Points          int       `db:"points"`
    CreatedAt       time.Time `db:"created_at"`
    
    Options []QuestionOption `db:"-"`
}

// QuestionOption represents an answer option
type QuestionOption struct {
    ID          uuid.UUID `db:"id"`
    QuestionID  uuid.UUID `db:"question_id"`
    OptionText  string    `db:"option_text"`
    OptionLetter string    `db:"option_letter"` // A, B, C, D, E
    IsCorrect   bool      `db:"is_correct"`
    CreatedAt   time.Time `db:"created_at"`
}

// TestSession represents a non-auth user session
type TestSession struct {
    ID               uuid.UUID `db:"id"`
    TestID           uuid.UUID `db:"test_id"`
    IPAddress        string    `db:"ip_address"`
    UserAgent        string    `db:"user_agent"`
    DeviceFingerprint string   `db:"device_fingerprint"`
    StartedAt        time.Time `db:"started_at"`
    SubmittedAt      *time.Time `db:"submitted_at"`
    ExpiresAt        time.Time `db:"expires_at"`
    IsActive         bool      `db:"is_active"`
    CreatedAt        time.Time `db:"created_at"`
}

// TestResult represents final result of a test
type TestResult struct {
    ID              uuid.UUID `db:"id"`
    SessionID       uuid.UUID `db:"session_id"`
    TestID          uuid.UUID `db:"test_id"`
    TotalScore      float64   `db:"total_score"`
    PercentageScore float64   `db:"percentage_score"`
    Passing         bool      `db:"passing"`
    TimeSpentSecs   int       `db:"time_spent_seconds"`
    QuestionsAnswered int     `db:"questions_answered"`
    QuestionsCorrect int      `db:"questions_correct"`
    SubmittedAt     time.Time `db:"submitted_at"`
    CreatedAt       time.Time `db:"created_at"`
}
```

### 2.5 Handlers - Public Routes

```go
// internal/handlers/public.go
package handlers

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    
    "testhub/internal/database"
    "testhub/internal/models"
    "testhub/internal/cache"
)

type PublicHandler struct {
    db    *database.DB
    cache *cache.Client
}

func RegisterPublicRoutes(router *gin.RouterGroup, db *database.DB, c *cache.Client) {
    h := &PublicHandler{db, c}
    
    router.GET("/tests", h.ListTests)
    router.POST("/tests/:testId/start", h.StartTest)
    router.GET("/sessions/:sessionId/questions", h.GetQuestions)
    router.POST("/sessions/:sessionId/submit-answer", h.SubmitAnswer)
    router.POST("/sessions/:sessionId/finish", h.FinishTest)
    router.GET("/results/:resultId", h.GetResult)
}

// StartTest creates a new test session
func (h *PublicHandler) StartTest(c *gin.Context) {
    testID := c.Param("testId")
    
    // Validate test exists and published
    var test models.Test
    err := h.db.Get(&test, 
        "SELECT * FROM tests WHERE id = $1 AND published = true", 
        testID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Test not found"})
        return
    }
    
    // Check rate limiting
    ip := c.ClientIP()
    key := "rate_limit:start_test:" + ip
    count, _ := h.cache.Incr(key, 1) // 1 req per 10 min
    if count > 5 {
        c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limited"})
        return
    }
    h.cache.Expire(key, 600) // 10 minutes
    
    // Create session
    sessionID := uuid.New().String()
    session := models.TestSession{
        ID:        uuid.MustParse(sessionID),
        TestID:    uuid.MustParse(testID),
        IPAddress: ip,
        UserAgent: c.GetHeader("User-Agent"),
        StartedAt: time.Now(),
        ExpiresAt: time.Now().Add(24 * time.Hour),
        IsActive:  true,
    }
    
    // Store in DB
    _, err = h.db.NamedExec(`
        INSERT INTO test_sessions 
        (id, test_id, ip_address, user_agent, started_at, expires_at, is_active, created_at)
        VALUES (:id, :test_id, :ip_address, :user_agent, :started_at, :expires_at, :is_active, NOW())
    `, session)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start test"})
        return
    }
    
    // Cache session
    h.cache.Set("session:"+sessionID, session, 24*time.Hour)
    
    c.JSON(http.StatusOK, gin.H{
        "session_id": sessionID,
        "test": gin.H{
            "id": test.ID,
            "title": test.Title,
            "duration_minutes": test.DurationMinutes,
            "total_questions": test.TotalQuestions,
        },
        "expires_at": session.ExpiresAt,
    })
}

// SubmitAnswer stores an answer
func (h *PublicHandler) SubmitAnswer(c *gin.Context) {
    var req struct {
        QuestionID      string `json:"question_id" binding:"required"`
        AnswerOptionID  *string `json:"answer_option_id"`
        AnswerText      *string `json:"answer_text"`
    }
    
    if err := c.BindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }
    
    sessionID := c.Param("sessionId")
    
    // Validate session
    session := &models.TestSession{}
    if err := h.cache.Get("session:"+sessionID, session); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Session invalid"})
        return
    }
    
    // Auto-grade if multiple choice
    isCorrect := false
    if req.AnswerOptionID != nil {
        var correct bool
        h.db.Get(&correct, 
            "SELECT is_correct FROM question_options WHERE id = $1", 
            *req.AnswerOptionID)
        isCorrect = correct
    }
    
    // Store submission
    submission := map[string]interface{}{
        "id": uuid.New(),
        "session_id": sessionID,
        "question_id": req.QuestionID,
        "user_answer_text": req.AnswerText,
        "user_answer_option_id": req.AnswerOptionID,
        "is_correct": isCorrect,
        "submitted_at": time.Now(),
        "created_at": time.Now(),
    }
    
    // Insert
    _, err := h.db.NamedExec(`
        INSERT INTO test_submissions 
        (id, session_id, question_id, user_answer_text, user_answer_option_id, is_correct, submitted_at, created_at)
        VALUES (:id, :session_id, :question_id, :user_answer_text, :user_answer_option_id, :is_correct, :submitted_at, :created_at)
    `, submission)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "received": true,
        "feedback": gin.H{
            "is_correct": isCorrect,
            "explanation": "The correct answer is...",
        },
    })
}
```

---

## 3. REACT FRONTEND STARTER

### 3.1 Project Structure

```bash
frontend/
├── src/
│   ├── components/
│   │   ├── TestForm/
│   │   │   ├── TestForm.tsx
│   │   │   ├── QuestionDisplay.tsx
│   │   │   ├── AnswerInput.tsx
│   │   │   └── Timer.tsx
│   │   ├── AdminDashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TestCreator.tsx
│   │   │   └── Analytics.tsx
│   │   └── Common/
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── Loading.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── TestPage.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── LoginPage.tsx
│   ├── hooks/
│   │   ├── useTestSession.ts
│   │   ├── useApi.ts
│   │   └── useAuth.ts
│   ├── utils/
│   │   ├── api.ts
│   │   ├── storage.ts
│   │   └── formatting.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

### 3.2 Custom Hook - useTestSession

```typescript
// src/hooks/useTestSession.ts
import { useState, useCallback } from 'react'
import { api } from '@/utils/api'

interface TestSession {
    session_id: string
    test: {
        id: string
        title: string
        duration_minutes: number
        total_questions: number
    }
    expires_at: string
}

interface Question {
    id: string
    question_number: number
    question_text: string
    question_type: string
    options: Array<{
        id: string
        letter: string
        text: string
    }>
}

export function useTestSession(testId: string) {
    const [session, setSession] = useState<TestSession | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Start test
    const startTest = useCallback(async () => {
        try {
            setLoading(true)
            const response = await api.post(`/tests/${testId}/start`)
            setSession(response.data)
            localStorage.setItem('testSessionId', response.data.session_id)
            
            // Load questions
            const qResponse = await api.get(
                `/sessions/${response.data.session_id}/questions`,
                { params: { page: 1, limit: 10 } }
            )
            setQuestions(qResponse.data.questions)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }, [testId])

    // Submit answer
    const submitAnswer = useCallback(async (questionId: string, answer: string) => {
        try {
            const sessionId = localStorage.getItem('testSessionId')!
            await api.post(`/sessions/${sessionId}/submit-answer`, {
                question_id: questionId,
                answer_option_id: answer,
            })
            
            setAnswers(prev => ({
                ...prev,
                [questionId]: answer
            }))
        } catch (err) {
            setError((err as Error).message)
        }
    }, [])

    // Finish test
    const finishTest = useCallback(async () => {
        try {
            setLoading(true)
            const sessionId = localStorage.getItem('testSessionId')!
            const response = await api.post(`/sessions/${sessionId}/finish`)
            localStorage.setItem('resultId', response.data.result_id)
            return response.data
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        session,
        questions,
        currentQuestionIndex,
        setCurrentQuestionIndex,
        answers,
        loading,
        error,
        startTest,
        submitAnswer,
        finishTest,
    }
}
```

### 3.3 Test Taking Component

```typescript
// src/components/TestForm/TestForm.tsx
import React, { useEffect, useState } from 'react'
import { useTestSession } from '@/hooks/useTestSession'
import QuestionDisplay from './QuestionDisplay'
import Timer from './Timer'
import { useNavigate } from 'react-router-dom'

interface TestFormProps {
    testId: string
}

export default function TestForm({ testId }: TestFormProps) {
    const navigate = useNavigate()
    const {
        session,
        questions,
        currentQuestionIndex,
        setCurrentQuestionIndex,
        answers,
        loading,
        startTest,
        submitAnswer,
        finishTest,
    } = useTestSession(testId)

    const [timeLeft, setTimeLeft] = useState<number>(0)

    useEffect(() => {
        startTest()
    }, [testId])

    useEffect(() => {
        if (!session) return

        const durationSeconds = session.test.duration_minutes * 60
        setTimeLeft(durationSeconds)

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(interval)
                    handleFinish()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [session])

    const handleFinish = async () => {
        const result = await finishTest()
        navigate(`/results/${result.result_id}`)
    }

    if (loading) return <div className="p-8">Loading test...</div>
    if (!session) return <div className="p-8">Failed to load test</div>

    const currentQuestion = questions[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === questions.length - 1

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow">
                {/* Header */}
                <div className="border-b p-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">{session.test.title}</h1>
                    <Timer seconds={timeLeft} />
                </div>

                {/* Progress */}
                <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between mb-2">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{Math.round((currentQuestionIndex / questions.length) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                                width: `${(currentQuestionIndex / questions.length) * 100}%`
                            }}
                        />
                    </div>
                </div>

                {/* Question */}
                <div className="p-8">
                    {currentQuestion && (
                        <QuestionDisplay
                            question={currentQuestion}
                            answer={answers[currentQuestion.id]}
                            onAnswer={(answer) => submitAnswer(currentQuestion.id, answer)}
                        />
                    )}
                </div>

                {/* Navigation */}
                <div className="bg-gray-50 p-4 border-t flex justify-between">
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                    >
                        Previous
                    </button>

                    {!isLastQuestion ? (
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            className="px-4 py-2 bg-green-600 text-white rounded"
                        >
                            Finish Test
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
```

---

## 4. GO DEPENDENCIES

### go.mod
```go
module testhub

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/jmoiron/sqlx v1.3.5
    github.com/lib/pq v1.10.9
    github.com/redis/go-redis/v9 v9.2.1
    github.com/google/uuid v1.5.0
    github.com/joho/godotenv v1.5.1
    github.com/golang-jwt/jwt/v5 v5.0.0
    golang.org/x/crypto v0.15.0
    github.com/sirupsen/logrus v1.9.3
)
```

---

## 5. REACT DEPENDENCIES

### package.json (Frontend)
```json
{
  "name": "testhub-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,css,md}\""
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.17.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.4",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.53.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "postcss": "^8.4.31",
    "prettier": "^3.0.0",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.2"
  }
}
```

---

## 6. DEVELOPMENT ROADMAP

### Month 1: MVP Launch
```
Week 1-2: Backend foundation
- Database setup
- Auth implementation
- Basic APIs (test start, submit, finish)

Week 3: Frontend foundation
- Test-taking form
- Results display

Week 4: Integration & deployment
- Connect frontend to backend
- Deploy to VPS
- Basic testing
- Launch with free tier
```

### Month 2-3: Enhancement
```
Week 5-6: Content management
- Admin dashboard
- Test creation form
- Analytics

Week 7-8: Security & optimization
- Rate limiting hardening
- Performance tuning
- Security audit
```

### Month 4: Monetization
```
Week 9-10: Payment integration
- Stripe setup
- Subscription logic

Week 11-12: Feature gating
- Tier system
- Analytics by tier
- Upsell features
```

### Month 5+: Growth & Scaling
```
- AI question generation (phase 1)
- Adaptive testing
- B2B features
- Mobile app
```

---

**End of Implementation & Code Guide**
