-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS table (Admin & Quiz Creators)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'creator', -- admin, creator
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free', -- free, basic, pro, institution
    subscription_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- TESTS table
CREATE TABLE IF NOT EXISTS tests (
    id VARCHAR(64) PRIMARY KEY,
    creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- cpns, sbmptn, iq, custom
    duration_minutes INT NOT NULL,
    passing_score_percentage INT DEFAULT 60,
    total_questions INT DEFAULT 0,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_answers BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tests_category ON tests(category);
CREATE INDEX IF NOT EXISTS idx_tests_published ON tests(published);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);

-- TEST_QUESTIONS table
CREATE TABLE IF NOT EXISTS test_questions (
    id VARCHAR(64) PRIMARY KEY,
    test_id VARCHAR(64) NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- multiple_choice, essay, matching
    media_url VARCHAR(500),
    difficulty_level VARCHAR(50) DEFAULT 'medium', -- easy, medium, hard
    explanation TEXT,
    points INT DEFAULT 5,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_type ON test_questions(question_type);

-- QUESTION_OPTIONS table
CREATE TABLE IF NOT EXISTS question_options (
    id VARCHAR(64) PRIMARY KEY,
    question_id VARCHAR(64) NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_letter VARCHAR(2) NOT NULL, -- A, B, C, D, E
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);

-- TEST_SESSIONS table (Non-auth anonymous sessions)
CREATE TABLE IF NOT EXISTS test_sessions (
    id VARCHAR(64) PRIMARY KEY, -- Session token: sess-xxxx
    test_id VARCHAR(64) NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_is_active ON test_sessions(is_active);

-- TEST_SUBMISSIONS table
CREATE TABLE IF NOT EXISTS test_submissions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
    user_answer_text TEXT,
    user_answer_option_id VARCHAR(64) REFERENCES question_options(id) ON DELETE SET NULL,
    is_correct BOOLEAN,
    score DECIMAL(5,2),
    is_flagged BOOLEAN DEFAULT false,
    admin_review_note TEXT,
    admin_reviewed_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_submissions_session_id ON test_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_question_id ON test_submissions(question_id);

-- TEST_RESULTS table
CREATE TABLE IF NOT EXISTS test_results (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    test_id VARCHAR(64) NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    test_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_score DECIMAL(8,2) NOT NULL,
    percentage_score DECIMAL(5,2) NOT NULL,
    passing BOOLEAN NOT NULL,
    passing_score_percentage INT NOT NULL,
    time_spent_seconds INT NOT NULL,
    duration_seconds INT NOT NULL,
    questions_answered INT NOT NULL,
    questions_correct INT NOT NULL,
    total_questions INT NOT NULL,
    percentile INT DEFAULT 50,
    category_breakdown JSONB,
    submissions JSONB,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(session_id);

-- ADMIN_AUDIT_LOG table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(64),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at);
