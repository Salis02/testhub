# 🏗️ ARCHITECTURE & DATABASE SCHEMA
## Production-Ready Design for TestHub

---

## 1. SYSTEM ARCHITECTURE

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
├─────────────────────────────────────────────────────────┤
│  React SPA                                              │
│  - Test Taking Form (Non-auth)                          │
│  - Admin Dashboard (Auth protected)                      │
│  - Analytics Dashboard                                  │
│  - User Results Page                                    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS + CORS
┌────────────────────┴────────────────────────────────────┐
│            LOAD BALANCER / REVERSE PROXY                │
│  (Nginx - for horizontal scaling)                       │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼───┐       ┌───▼───┐       ┌───▼───┐
│ GO    │       │ GO    │       │ GO    │
│Server │       │Server │       │Server │  (Horizontal scaling)
│:8000  │       │:8001  │       │:8002  │
└───┬───┘       └───┬───┘       └───┬───┘
    │                │                │
    └────────────────┼────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────────┐  ┌────────▼────────┐
│  PostgreSQL        │  │  Redis Cache    │
│  (Master-Replica)  │  │  (Session+Data) │
├────────────────────┤  ├─────────────────┤
│ Primary (Write)    │  │ - Session cache │
│ Replica (Read)     │  │ - Rate limit    │
│ Backup             │  │ - Test cache    │
└────────────────────┘  └─────────────────┘

┌──────────────────────────────────────┐
│     BACKGROUND SERVICES              │
├──────────────────────────────────────┤
│ - Email queue (Goroutine workers)    │
│ - File processing                    │
│ - Analytics aggregation              │
│ - Log aggregation                    │
└──────────────────────────────────────┘
```

### Component Responsibilities

#### Frontend (React)
- SPA with React Router
- Tailwind CSS for styling
- Redux/Context for state
- Axios for API calls
- No local auth - token in localStorage

#### Backend (Go)
- REST API server
- Session management (JWT + Redis)
- Business logic
- Database queries
- Rate limiting middleware
- Request validation

#### Database (PostgreSQL)
- ACID compliance
- Optimized indexes
- Connection pooling
- Read replicas for analytics

#### Cache Layer (Redis)
- Session storage
- Rate limit counters
- Test question cache
- Hot data cache

---

## 2. DATABASE SCHEMA

### Schema Design Principles
- ✅ Normalized (3NF) untuk consistency
- ✅ Indexing pada frequently queried columns
- ✅ Partitioning ready (future) untuk test_submissions
- ✅ Audit logging untuk sensitive data
- ✅ Soft deletes untuk data retention

### Database Diagram

```
USERS (admin)
├── id (uuid, PK)
├── email (unique)
├── password_hash
├── full_name
├── role (admin, creator)
├── subscription_tier
├── created_at
├── updated_at

TESTS
├── id (uuid, PK)
├── creator_id (FK -> USERS)
├── title
├── description
├── category (cpns, sbmptn, iq, custom)
├── duration_minutes
├── passing_score_percentage
├── total_questions
├── shuffle_questions (boolean)
├── shuffle_answers (boolean)
├── published (boolean)
├── created_at
├── updated_at

TEST_QUESTIONS
├── id (uuid, PK)
├── test_id (FK -> TESTS)
├── question_number (int)
├── question_text
├── question_type (multiple_choice, essay, matching)
├── media_url (nullable, for images)
├── difficulty_level (easy, medium, hard)
├── explanation
├── points (for weighted scoring)
├── created_at

QUESTION_OPTIONS
├── id (uuid, PK)
├── question_id (FK -> TEST_QUESTIONS)
├── option_text
├── option_number (A, B, C, D, E)
├── is_correct (boolean)
├── created_at

TEST_SESSIONS
├── id (uuid, PK) - unique session token
├── test_id (FK -> TESTS)
├── ip_address
├── user_agent
├── started_at
├── submitted_at (nullable)
├── device_fingerprint (for security)
├── expires_at (24 hours)
├── created_at

TEST_SUBMISSIONS (Partitioned by created_at)
├── id (uuid, PK)
├── session_id (FK -> TEST_SESSIONS)
├── question_id (FK -> TEST_QUESTIONS)
├── user_answer_text
├── user_answer_id (for multiple choice - FK -> QUESTION_OPTIONS)
├── is_correct (nullable, auto-filled for MC)
├── score (nullable, for weighted)
├── admin_review_note (nullable, for essays)
├── submitted_at
├── created_at

TEST_RESULTS
├── id (uuid, PK)
├── session_id (FK -> TEST_SESSIONS, unique)
├── test_id (FK -> TESTS)
├── total_score
├── percentage_score
├── passing (boolean)
├── time_spent_seconds
├── questions_answered (int)
├── questions_correct (int)
├── submitted_at
├── created_at

CATEGORY_PERFORMANCE (Denormalized for analytics)
├── id (uuid, PK)
├── result_id (FK -> TEST_RESULTS)
├── category_name (reading, logic, math, etc)
├── score
├── total_possible
├── percentage
├── created_at

SCORE_TEMPLATES (Admin-defined)
├── id (uuid, PK)
├── test_id (FK -> TESTS)
├── formula_type (simple, weighted, custom)
├── formula_json (for complex scoring)
├── created_at

ADMIN_AUDIT_LOG
├── id (uuid, PK)
├── admin_id (FK -> USERS)
├── action (create_test, modify_test, grade_essay, etc)
├── resource_type (test, question, result, etc)
├── resource_id (uuid)
├── old_value (jsonb, nullable)
├── new_value (jsonb, nullable)
├── timestamp

FEEDBACK_TEMPLATES
├── id (uuid, PK)
├── test_id (FK -> TESTS)
├── score_range_min (0-100)
├── score_range_max (0-100)
├── feedback_text
├── next_steps (recommendations)
├── created_at
```

### SQL Schema (PostgreSQL)

```sql
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, creator
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free', -- free, basic, pro, institution
    subscription_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_subscription_tier (subscription_tier)
);

-- TESTS table
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- cpns, sbmptn, iq, custom
    duration_minutes INT NOT NULL,
    passing_score_percentage INT DEFAULT 60,
    total_questions INT,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_answers BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_creator_id (creator_id),
    INDEX idx_published (published),
    INDEX idx_created_at (created_at)
);

-- TEST_QUESTIONS table
CREATE TABLE test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- multiple_choice, essay, matching
    media_url VARCHAR(500),
    difficulty_level VARCHAR(50) DEFAULT 'medium', -- easy, medium, hard
    explanation TEXT,
    points INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(test_id, question_number),
    INDEX idx_test_id (test_id),
    INDEX idx_question_type (question_type)
);

-- QUESTION_OPTIONS table
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_letter VARCHAR(1) NOT NULL, -- A, B, C, D, E
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(question_id, option_letter),
    INDEX idx_question_id (question_id),
    INDEX idx_is_correct (is_correct)
);

-- TEST_SESSIONS table (Non-auth user sessions)
CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Session token
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255), -- Hash of device info
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_test_id (test_id),
    INDEX idx_ip_address (ip_address),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
);

-- TEST_SUBMISSIONS table (Partitioned by created_at for scalability)
CREATE TABLE test_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES test_questions(id),
    user_answer_text TEXT,
    user_answer_option_id UUID REFERENCES question_options(id),
    is_correct BOOLEAN, -- Auto-filled for MC, NULL for essay
    score DECIMAL(5,2), -- For weighted scoring
    admin_review_note TEXT,
    admin_reviewed_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session_id (session_id),
    INDEX idx_question_id (question_id),
    INDEX idx_is_correct (is_correct),
    INDEX idx_created_at (created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for test_submissions (monthly)
CREATE TABLE test_submissions_2026_10 PARTITION OF test_submissions
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE test_submissions_2026_11 PARTITION OF test_submissions
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

-- TEST_RESULTS table
CREATE TABLE test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL REFERENCES test_sessions(id),
    test_id UUID NOT NULL REFERENCES tests(id),
    total_score DECIMAL(8,2),
    percentage_score DECIMAL(5,2),
    passing BOOLEAN,
    time_spent_seconds INT,
    questions_answered INT,
    questions_correct INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_test_id (test_id),
    INDEX idx_percentage_score (percentage_score),
    INDEX idx_submitted_at (submitted_at)
);

-- SCORE_TEMPLATES table
CREATE TABLE score_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID UNIQUE NOT NULL REFERENCES tests(id),
    formula_type VARCHAR(50), -- simple, weighted, custom
    formula_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_test_id (test_id)
);

-- ADMIN_AUDIT_LOG table
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_admin_id (admin_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_resource_id (resource_id)
);

-- FEEDBACK_TEMPLATES table
CREATE TABLE feedback_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id),
    score_range_min INT,
    score_range_max INT,
    feedback_text TEXT,
    next_steps TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_test_id (test_id),
    INDEX idx_score_range (score_range_min, score_range_max)
);

-- Create indexes for performance
CREATE INDEX idx_test_sessions_test_id_active 
    ON test_sessions(test_id, is_active);

CREATE INDEX idx_test_results_test_created 
    ON test_results(test_id, created_at DESC);
```

---

## 3. API SPECIFICATIONS

### Authentication Endpoints

#### POST /api/auth/register
```json
Request:
{
  "email": "admin@example.com",
  "password": "secure_password",
  "full_name": "John Doe",
  "role": "creator"
}

Response: 200
{
  "user_id": "uuid",
  "token": "jwt_token",
  "refresh_token": "jwt_refresh_token",
  "role": "creator"
}
```

#### POST /api/auth/login
```json
Request:
{
  "email": "admin@example.com",
  "password": "secure_password"
}

Response: 200
{
  "user_id": "uuid",
  "token": "jwt_token",
  "refresh_token": "jwt_refresh_token"
}
```

---

### Public Endpoints (Non-Auth)

#### GET /api/tests
```
Query: ?category=cpns&page=1&limit=10

Response: 200
{
  "tests": [
    {
      "id": "uuid",
      "title": "CPNS Test 2024",
      "category": "cpns",
      "duration_minutes": 120,
      "total_questions": 100,
      "difficulty": "hard",
      "reviews_count": 1234,
      "average_rating": 4.5
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 10
  }
}
```

#### POST /api/tests/{testId}/start
```
Request: {}

Response: 200
{
  "session_id": "uuid (unique token)",
  "test": {
    "id": "uuid",
    "title": "CPNS Test 2024",
    "duration_minutes": 120,
    "total_questions": 100,
    "passing_score": 60
  },
  "expires_at": "2026-10-12T10:30:00Z"
}
```

#### GET /api/sessions/{sessionId}/questions
```
Query: ?page=1&limit=5

Response: 200
{
  "questions": [
    {
      "id": "uuid",
      "question_number": 1,
      "question_text": "What is...?",
      "question_type": "multiple_choice",
      "media_url": "https://...",
      "difficulty": "medium",
      "options": [
        {
          "id": "uuid",
          "letter": "A",
          "text": "Option A"
        },
        ...
      ]
    }
  ],
  "total_questions": 100,
  "current_page": 1
}
```

#### POST /api/sessions/{sessionId}/submit-answer
```
Request:
{
  "question_id": "uuid",
  "answer_option_id": "uuid", // untuk MC
  "answer_text": "essay answer..." // untuk essay
}

Response: 200
{
  "received": true,
  "feedback": {
    "is_correct": true, // untuk MC only
    "explanation": "The correct answer is..."
  }
}
```

#### POST /api/sessions/{sessionId}/finish
```
Request: {}

Response: 200
{
  "result_id": "uuid",
  "total_score": 75.5,
  "percentage_score": 75.5,
  "passing": true,
  "time_spent_seconds": 3600,
  "questions_correct": 75,
  "questions_total": 100,
  "feedback": "Great job! You passed with 75%",
  "next_steps": "Review your weak areas..."
}
```

#### GET /api/results/{resultId}
```
Response: 200
{
  "result_id": "uuid",
  "test_title": "CPNS Test 2024",
  "total_score": 75.5,
  "percentage_score": 75.5,
  "passing": true,
  "category_performance": [
    {
      "category": "Reading Comprehension",
      "score": 85,
      "percentage": 85,
      "questions_correct": 17,
      "total_questions": 20
    }
  ],
  "detailed_answers": [
    {
      "question_number": 1,
      "question_text": "...",
      "user_answer": "A",
      "correct_answer": "B",
      "is_correct": false,
      "explanation": "..."
    }
  ],
  "comparison": {
    "user_percentile": 75,
    "average_score": 65,
    "higher_than_percent": 75
  }
}
```

---

### Admin Endpoints (Auth Required)

#### POST /api/admin/tests
```
Request:
{
  "title": "CPNS Test 2024",
  "description": "...",
  "category": "cpns",
  "duration_minutes": 120,
  "passing_score_percentage": 60,
  "shuffle_questions": true,
  "shuffle_answers": true
}

Response: 201
{
  "test_id": "uuid"
}
```

#### POST /api/admin/tests/{testId}/questions
```
Request:
{
  "question_number": 1,
  "question_text": "What is the capital of France?",
  "question_type": "multiple_choice",
  "difficulty": "easy",
  "points": 1,
  "explanation": "Paris is...",
  "options": [
    {"letter": "A", "text": "London", "is_correct": false},
    {"letter": "B", "text": "Paris", "is_correct": true},
    ...
  ]
}

Response: 201
{
  "question_id": "uuid"
}
```

#### GET /api/admin/tests/{testId}/analytics
```
Query: ?from=2026-10-01&to=2026-10-31

Response: 200
{
  "test_id": "uuid",
  "test_title": "CPNS Test 2024",
  "total_submissions": 5000,
  "average_score": 65.5,
  "passing_rate": 72.3,
  "average_time_seconds": 4200,
  "completion_rate": 95.2,
  "question_analytics": [
    {
      "question_number": 1,
      "correct_rate": 92.5,
      "average_time_seconds": 45,
      "difficulty_rating": 1.2 // 1-5, higher = harder
    }
  ],
  "hourly_submissions": [...]
}
```

#### POST /api/admin/tests/{testId}/publish
```
Request: {}

Response: 200
{
  "published": true,
  "published_at": "2026-10-11T10:30:00Z"
}
```

---

## 4. Caching Strategy (Redis)

```go
// Session cache
KEY: session:{sessionId}
VALUE: {
  test_id,
  started_at,
  expires_at,
  ip_address,
  device_fingerprint
}
TTL: 24 hours

// Test cache
KEY: test:{testId}
VALUE: {
  title, duration, total_questions, ...
}
TTL: 6 hours (invalidate on update)

// Questions cache (per test)
KEY: test_questions:{testId}
VALUE: [questions array]
TTL: 6 hours

// Rate limiting
KEY: rate_limit:{ip_or_session}:{endpoint}
VALUE: count
TTL: 1 minute

// Results cache (temporary)
KEY: result_pending:{sessionId}
VALUE: {
  total_score, percentage, ...
}
TTL: 30 minutes
```

---

## 5. Performance Optimization

### Database Optimization
1. **Connection Pooling:** pgbouncer (50 connections min, 200 max)
2. **Read Replicas:** Distribute analytics queries
3. **Indexes:** All FK, frequently filtered, sorted columns
4. **Query Optimization:** Use EXPLAIN ANALYZE
5. **Partitioning:** test_submissions by month

### API Optimization
1. **Pagination:** Default 20 items/page
2. **Caching:** Redis for hot data
3. **Compression:** GZIP for responses
4. **CDN:** Static assets (images, JS, CSS)

### Frontend Optimization
1. **Code splitting:** By routes
2. **Lazy loading:** Images, components
3. **Service workers:** Offline capability (future)

---

**End of Architecture & Schema**
