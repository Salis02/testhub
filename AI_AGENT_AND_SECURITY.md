# 🤖 AI AGENT RULES & SECURITY GUIDELINES
## TestHub - Production-Ready AI Integration & Threat Model

---

## 1. AI AGENT ARCHITECTURE (Current & Future)

### Current Phase (MVP - Web-based AI only)
- ✅ Manual question creation by admin
- ✅ Scoring formulas (template-based)
- ✅ Feedback generation (template-based)
- ✅ **Placeholder for future AI features**

### Future Phases (AI-Powered)
- Phase 2A: Intelligent feedback generation
- Phase 2B: Question difficulty assessment
- Phase 2C: Adaptive test generation
- Phase 3: Auto-question generation with fact-checking

---

## 2. AI AGENT RULES & CONSTRAINTS

### 2.1 Question Generation Rules (Future Implementation)

#### System Prompt Template
```
You are an expert exam question generator for {EXAM_TYPE}.

Rules:
1. Generate ONLY factually accurate questions
2. Difficulty level: {DIFFICULTY} (1-5 scale)
3. Question format: {FORMAT} (multiple_choice, essay, matching)
4. Subject area: {SUBJECT}
5. Avoid ambiguous or trick questions
6. Include 1 correct answer + 3-4 plausible distractors
7. Ensure options are roughly equal length
8. Use clear, grammatically correct English

Output format (JSON):
{
  "question_text": "...",
  "question_type": "multiple_choice",
  "options": [
    {"letter": "A", "text": "...", "is_correct": true},
    ...
  ],
  "explanation": "...",
  "difficulty_assessed": 3
}

Fact-check before generating. If unsure, refuse.
```

#### Constraints
- ✅ Max 5 questions per generation request
- ✅ Rate limiting: 10 requests/hour per creator
- ✅ All generated questions require admin review before publishing
- ✅ Fact-checking via external API (future)
- ✅ Bias audit: Check for offensive/discriminatory content

#### Validation Rules
```python
class AIGeneratedQuestion:
    def validate(self):
        checks = {
            'question_not_empty': len(self.question_text) > 20,
            'only_one_correct': sum(o['is_correct'] for o in self.options) == 1,
            'min_options': len(self.options) >= 3,
            'max_options': len(self.options) <= 5,
            'no_duplicate_options': len(set(o['text'] for o in self.options)) == len(self.options),
            'explanation_provided': len(self.explanation) > 10,
            'no_obvious_answer': max(len(o['text']) for o in self.options) - min(len(o['text']) for o in self.options) < 30,
        }
        return all(checks.values()), checks
```

---

### 2.2 Adaptive Testing Rules (Future)

#### When to Increase Difficulty
```
IF user_last_5_correct >= 4:
    next_difficulty = current_difficulty + 1
    reason = "User showing mastery"
ELSE IF user_last_5_correct <= 1:
    next_difficulty = max(1, current_difficulty - 1)
    reason = "User struggling, build confidence"
ELSE:
    next_difficulty = current_difficulty
    reason = "Maintain current level"
```

#### Algorithm Constraints
- Start at medium difficulty
- Max jump: ±1 difficulty level per question
- Minimum questions at each level: 5
- No adaptive mode for essays
- Preserve original test structure if defined

---

### 2.3 Intelligent Feedback Rules

#### Feedback Generation Template
```
System Prompt:
You are a supportive exam tutor analyzing test results.

Input:
- User score: {SCORE}
- Difficulty level: {DIFFICULTY}
- Weak areas: {WEAK_CATEGORIES}
- Strong areas: {STRONG_CATEGORIES}

Requirements:
1. Be encouraging but honest
2. Identify 1-2 key improvement areas
3. Suggest specific study resources
4. Provide 3 concrete next steps
5. Acknowledge strong performance
6. Use simple, clear language
7. Keep response under 200 words

Output:
{
  "overall_message": "...",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "next_steps": ["...", "...", "..."],
  "resources": [
    {"title": "...", "url": "..."}
  ]
}
```

#### Constraints
- ✅ No personal information exposure
- ✅ No external links without admin approval
- ✅ Feedback cached per score range
- ✅ No comparing to other users directly
- ✅ Tone must be supportive, never demotivating

---

### 2.4 Hint Generation Rules (Future)

#### Hint Template
```
For question: {QUESTION_TEXT}
Correct answer: {CORRECT_ANSWER}

Generate 3 hints (graduated difficulty):

Hint 1 (Subtle): Doesn't reveal answer, guides thinking
Hint 2 (Medium): More specific, eliminates distractors
Hint 3 (Direct): Nearly reveals answer

Output:
{
  "hints": [
    {"level": 1, "hint": "...", "type": "directional"},
    {"level": 2, "hint": "...", "type": "eliminatory"},
    {"level": 3, "hint": "...", "type": "revealing"}
  ]
}
```

---

## 3. CONTENT MODERATION RULES

### Question Content Policy
- ✅ No hate speech, discrimination, or slurs
- ✅ No personally identifiable information
- ✅ No adult/explicit content
- ✅ No spam or promotional content
- ✅ No misinformation or outdated facts
- ✅ Factual accuracy required
- ✅ Fair and unbiased questions
- ✅ Accessible to diverse learners

### Moderation Process
```
1. User submits question
2. Automated filters:
   - Profanity check
   - PII detection
   - Length validation
   - Spam detection
3. If flagged: Move to admin review queue
4. If passes: Published with version history
5. If user reports: Add to community moderation
6. Admin final review required for AI-generated content
```

---

## 4. SECURITY GUIDELINES

### 4.1 Non-Authentication Form Security

#### Threat Model for Anonymous Test Form
```
Threats:
1. Bot/Spam attacks (automated submissions)
2. DDoS attacks (rate limiting attacks)
3. Answer injection (modifying answers in transit)
4. Session hijacking (stealing session token)
5. Data exfiltration (accessing other users' data)
6. Brute force (guessing session tokens)
```

#### Mitigation Strategies

##### 1. Rate Limiting
```go
// Per IP address
const (
    StartTestRateLimit     = 5 per 10 minutes    // Can't start too many tests
    SubmitAnswerRateLimit  = 1 per 2 seconds     // Space out submissions
    FinishTestRateLimit    = 1 per 1 minute      // Only finish once
)

// Per session
const (
    MaxQuestionsPerMinute  = 10 // Prevent rapid submissions
    SessionTimeout         = 24 * time.Hour
)

// Global
const (
    MaxConcurrentRequests  = 5000 // Per VPS
    RequestQueueSize       = 10000
)
```

Implementation:
```go
// Middleware in Go
func RateLimitMiddleware(maxRequests int, window time.Duration) gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(window/time.Duration(maxRequests)), maxRequests)
    
    return func(c *gin.Context) {
        ip := c.ClientIP()
        if !limiter.Allow() {
            c.JSON(429, gin.H{"error": "Rate limit exceeded"})
            c.Abort()
            return
        }
        c.Next()
    }
}
```

##### 2. CAPTCHA on Form Submission
```javascript
// React component
<ReCAPTCHA
    sitekey={RECAPTCHA_SITE_KEY}
    onChange={onCaptchaChange}
    theme="light"
/>

// Verify on backend
POST /api/verify-captcha
{
    "token": "captcha_token"
}
```

Requirements:
- ✅ CAPTCHA on test start (if IP suspicious)
- ✅ CAPTCHA on test finish
- ✅ Progressive CAPTCHA (harder after multiple fails)

##### 3. Session Token Security
```
Session Token Generation:
- Random 32-byte (256-bit) cryptographically secure
- Format: Base64URL encoded
- Stored in Redis with TTL 24 hours
- Not stored in user cookies (localStorage only)

Token Validation:
- Check existence in Redis
- Check TTL not expired
- Check IP consistency (optional, allow changes for mobile)
- Check user agent consistency (optional)
```

Example Go implementation:
```go
import (
    "crypto/rand"
    "encoding/base64"
)

func GenerateSessionToken() (string, error) {
    b := make([]byte, 32)
    _, err := rand.Read(b)
    if err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(b), nil
}
```

##### 4. Device Fingerprinting (Optional)
```javascript
// Browser-side fingerprinting
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const fp = await FingerprintJS.load()
const result = await fp.get()
const fingerprint = result.visitorId // e.g., "1234567890abc"

// Send with session start
POST /api/tests/{testId}/start
{
    "device_fingerprint": fingerprint
}

// Server checks if fingerprint changes during session
// If changes significantly, ask for CAPTCHA verification
```

##### 5. Answer Submission Verification
```
Per submission:
1. Validate session token active
2. Validate question belongs to test
3. Validate answer format matches question type
4. Add HMAC signature to prevent tampering
5. Use HTTPS only
6. Set secure cookies: HttpOnly, Secure, SameSite=Strict
```

##### 6. SQL Injection Prevention
```go
// ✅ GOOD - Use parameterized queries
query := "SELECT * FROM test_submissions WHERE session_id = $1 AND question_id = $2"
rows, err := db.Query(query, sessionID, questionID)

// ❌ BAD - String concatenation
query := fmt.Sprintf("SELECT * FROM test_submissions WHERE session_id = '%s'", userInput)
```

---

### 4.2 Admin Authentication Security

#### Password Security
```
Requirements:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words
- Password expiry: 90 days
- History: Can't reuse last 5 passwords
- Bcrypt with cost 12+

Go Implementation:
import "golang.org/x/crypto/bcrypt"

hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
err = bcrypt.CompareHashAndPassword(hash, []byte(password))
```

#### JWT Token Management
```
Access Token:
- Expiry: 15 minutes
- Payload: user_id, role, email
- Signed with HS256

Refresh Token:
- Expiry: 7 days
- Stored in secure cookie (HttpOnly)
- Can't be used to access API directly

Revocation:
- Blacklist on logout
- Check blacklist on each request

Go Example:
func GenerateTokens(userID string, role string) (access, refresh string, err error) {
    accessClaims := jwt.MapClaims{
        "user_id": userID,
        "role": role,
        "exp": time.Now().Add(15 * time.Minute).Unix(),
    }
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
    access, _ := accessToken.SignedString([]byte(JWT_SECRET))
    
    // Refresh token similar but longer TTL
    return access, refresh, nil
}
```

#### 2FA (Two-Factor Authentication)
- Optional for MVP
- Required for production
- Support: TOTP (Google Authenticator), SMS

---

### 4.3 Data Protection

#### Encryption at Rest
```
Test Submissions (sensitive):
- Encrypt user answers with AES-256-GCM
- Key: Derived from master key + test_id
- Store in test_submissions table as ciphertext
- Decrypt only on-demand (admin view)

Admin passwords:
- Bcrypt hashing (one-way)

API keys:
- Encrypted in config, not in code
- Rotate monthly
```

#### Encryption in Transit
```
All endpoints:
- HTTPS/TLS 1.3 mandatory
- Certificate: Let's Encrypt (auto-renewed)
- HSTS header (Strict-Transport-Security)
- CSP header (Content-Security-Policy)
- CORS: Restricted to known origins
```

#### Data Retention & Deletion
```
Policy:
- Free tier: 30 days
- Premium tier: 1 year
- Institution tier: Custom (up to 5 years)
- Admin can manually delete test results
- Audit log: 7 years (comply with regulations)

Soft deletes (for compliance):
- Mark as deleted, don't remove
- Exclude from queries by default
- Only show if explicitly requested (admin)
```

---

### 4.4 Audit Logging

#### Logging Requirements
```
Log ALL:
✅ Admin login/logout (timestamp, IP, success/fail)
✅ Test creation/modification (what changed)
✅ Question modification (version history)
✅ Admin grading of essays (who, when, score)
✅ API access to sensitive endpoints (user, action, response)
✅ Failed authentication attempts (IP, email)
✅ Data exports (who, what, when)

Log NEVER:
❌ User answers (privacy)
❌ Passwords or tokens
❌ Full credit card numbers
❌ Personally identifiable information

Format (structured logging):
{
    "timestamp": "2026-10-11T10:30:00Z",
    "level": "INFO",
    "action": "create_test",
    "admin_id": "uuid",
    "resource_type": "test",
    "resource_id": "uuid",
    "ip_address": "203.0.113.45",
    "user_agent": "Mozilla/5.0...",
    "status": "success",
    "duration_ms": 125,
    "details": {
        "test_title": "CPNS Test",
        "questions_count": 100
    }
}
```

#### Logging Implementation (Go)
```go
import "github.com/sirupsen/logrus"

log := logrus.New()
log.SetFormatter(&logrus.JSONFormatter{})

// Usage
log.WithFields(logrus.Fields{
    "action": "create_test",
    "admin_id": adminID,
    "resource_id": testID,
    "ip_address": c.ClientIP(),
}).Info("Test created successfully")
```

---

### 4.5 Security Checklist

```
Frontend Security
☐ No sensitive data in localStorage
☐ HTTPS only
☐ CSP headers enforced
☐ XSS protection (sanitize all inputs)
☐ CSRF tokens on forms
☐ No hardcoded API keys in code
☐ Regular dependency updates
☐ Security headers: X-Frame-Options, X-Content-Type-Options

Backend Security
☐ SQL injection prevention (parameterized queries)
☐ Authentication required for admin endpoints
☐ Authorization checks (role-based)
☐ Rate limiting on all public endpoints
☐ Input validation (type, length, format)
☐ HTTPS/TLS enforcement
☐ Secure headers (HSTS, CSP, etc)
☐ Logging all sensitive operations
☐ Regular security audits
☐ Dependency vulnerability scanning
☐ Database hardening (strong passwords, limited privileges)
☐ Backup encryption

Infrastructure
☐ VPS firewall configured
☐ SSH key-based auth (no password)
☐ Fail2ban for brute force protection
☐ Regular patching (OS, libraries)
☐ Monitoring & alerting set up
☐ DDoS protection (CloudFlare or similar)
☐ Load balancer SSL termination
☐ Database backups (encrypted, offsite)
☐ Incident response plan

Compliance
☐ Privacy policy published
☐ Terms of service
☐ Cookie policy
☐ GDPR consent (if EU users)
☐ Data processing agreement (if applicable)
```

---

## 5. MONITORING & INCIDENT RESPONSE

### Metrics to Monitor
```
Performance:
- API response time (p50, p95, p99)
- Database query time
- Error rate (4xx, 5xx)
- Failed rate limiting triggers

Security:
- Failed login attempts (spike detection)
- Unusual IP addresses
- Rate limit violations
- Suspicious submissions (rapid, identical answers)

Business:
- Test completion rate
- User conversion to paid
- Test pass rate
- System uptime
```

### Alerting Thresholds
```
Critical (Page on-call):
- API response time p95 > 1000ms
- Error rate > 1%
- Database connection pool full
- Disk space < 10%
- Failed login attempts > 100/hour from single IP

Warning (Create incident):
- API response time p95 > 500ms
- Error rate > 0.5%
- Disk space < 20%
- Unusual submission patterns
```

---

## 6. GDPR & COMPLIANCE

### If EU Users Are Present

#### Rights
- Right to access (download data)
- Right to deletion ("right to be forgotten")
- Right to rectification (correct data)
- Right to data portability

#### Implementation
```
API Endpoints:
POST /api/user/data-export
- Returns JSON of all user data
- Include: test results, answers, profile

POST /api/user/delete-account
- Soft delete account
- Anonymize personal data
- Keep results (anonymized) for analytics

GET /api/user/settings
- Show what data is collected
```

---

**End of AI Agent & Security Guidelines**
