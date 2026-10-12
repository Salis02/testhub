# 💻 IMPLEMENTATION GUIDE & STARTER CODE
## Backend (Go) & Development Roadmap

---

## 1. IMPLEMENTATION CHECKLIST

### Phase 1: MVP (Weeks 1-4)

#### Backend Setup
- [ ] Initialize Go project with go.mod
- [ ] Setup PostgreSQL connection pool
- [ ] Setup Redis client
- [ ] Create database schema (migrations)
- [ ] Setup logging (structured JSON)
- [ ] Create project structure (clean architecture)

#### API Endpoints (Priority)
- [ ] POST /api/tests/{id}/start (start test session)
- [ ] GET /api/tests/{id}/questions (get questions)
- [ ] POST /api/sessions/{id}/submit-answer (submit answer)
- [ ] POST /api/sessions/{id}/finish (finish test)
- [ ] GET /api/results/{id} (view results)
- [ ] POST /api/auth/register (admin registration)
- [ ] POST /api/auth/login (admin login)

#### Core Features
- [ ] Session management (non-auth tokens)
- [ ] Auto-grading (multiple choice only)
- [ ] Score calculation
- [ ] Basic feedback
- [ ] Audit logging

#### Frontend (React)
- [ ] Project setup (Vite + React + TypeScript)
- [ ] Test taking form (non-auth)
- [ ] Answer submission UI
- [ ] Results display
- [ ] Admin login page
- [ ] Test creation form (basic)
- [ ] Dashboard (basic analytics)

#### Testing & QA
- [ ] Unit tests for business logic (80% coverage)
- [ ] Integration tests for APIs
- [ ] Load testing (basic)
- [ ] Security testing (rate limiting, etc)

#### DevOps
- [ ] Docker setup (postgres, redis, go, react)
- [ ] Makefile with common commands
- [ ] Database migrations automated
- [ ] CI/CD pipeline (GitHub Actions)

#### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Setup guide
- [ ] Deployment guide

---

### Phase 2: Enhancement (Weeks 5-6)

#### New Endpoints
- [ ] GET /api/tests (browse tests)
- [ ] GET /api/admin/tests (list created tests)
- [ ] PUT /api/admin/tests/{id} (edit test)
- [ ] POST /api/admin/tests/{id}/publish (publish test)
- [ ] GET /api/admin/tests/{id}/analytics (analytics)

#### Features
- [ ] Essay question support (manual admin review)
- [ ] Advanced analytics (per question, category)
- [ ] Email notifications
- [ ] Performance optimization
- [ ] Security hardening

#### Content Moderation
- [ ] Content filtering rules
- [ ] Admin review queue
- [ ] Audit logging enhancement

---

### Phase 3: Monetization (Week 7-8)

#### Payment Integration
- [ ] Stripe integration
- [ ] Subscription management
- [ ] Payment webhook handling
- [ ] License key generation

#### Features by Tier
- [ ] Feature gating (free vs paid)
- [ ] Usage tracking
- [ ] Downgrade handling
- [ ] Invoice generation

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
