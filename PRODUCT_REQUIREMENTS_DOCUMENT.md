# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)
## TestHub SaaS Platform - Testing & Assessment Platform

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** Oct 2026  
**Target:** 100K Users, 1K+ requests/second  

---

## 1. EXECUTIVE SUMMARY

**TestHub** adalah SaaS platform untuk membuat & mengelola berbagai tipe tes (CPNS, SBMPTN, IQ, custom) dengan scoring otomatis, analytics mendalam, dan rencana AI-powered question generation untuk masa depan.

### Key Metrics
- **Target Users:** 100K concurrent
- **Request Rate:** 1000+ req/detik
- **Infrastructure:** Single VPS 2GB (scalable via load balancer)
- **Tech Stack:** React (frontend) + Go (backend) + PostgreSQL
- **Deployment:** Docker + Makefile

---

## 2. PROBLEM STATEMENT

### Current Pain Points
1. Exam preparation requires manual test creation & grading
2. No unified platform untuk berbagai tipe tes
3. Analytics & performance tracking limited
4. Scalability issues pada platform lama
5. Sulit implementasi adaptive testing

### Solution
Single platform untuk:
- ✅ Create & manage multiple test types
- ✅ Auto-scoring & instant feedback
- ✅ Detailed analytics per user/test
- ✅ Scalable untuk 100K+ users
- ✅ Roadmap untuk AI-powered features

---

## 3. TARGET USERS & PERSONAS

### Primary Users
1. **Individual Test Takers** (Non-authenticated)
   - Siswa/Mahasiswa persiapan CPNS, SBMPTN
   - Pencari kerja test IQ
   - Age: 16-35
   - Pain: Butuh banyak try-out, feedback cepat

2. **Admin (Quiz Creator)**
   - Content creator/institusi
   - Bikin & manage soal
   - Track user performance
   - Age: 25+

### Secondary Users (Future)
- **Lembaga/Sekolah** (B2B adoption)
- **Content Manager** (moderasi soal)
- **Analytics Viewer** (reporting only)

---

## 4. CORE FEATURES (MVP)

### 4.1 Test Management
- **Create Test** (Admin only)
  - Title, description, duration, passing score
  - Question types: Multiple choice, essay, matching
  - Test categories: CPNS, SBMPTN, IQ, Custom
  - Media support: Images, documents
  - Shuffle questions & answers
  - Timer & auto-submit

- **View Tests** (Public)
  - Browse available tests
  - Test metadata (duration, difficulty, reviews)
  - Filter by category/difficulty

### 4.2 Test Taking (Non-Auth)
- **Start Test**
  - Unique session token (no login required)
  - Browser-based interface
  - Timer countdown
  - Progress tracker
  - Review mode (before submit)

- **Answer Submission**
  - Store answers in PostgreSQL
  - Auto-save every 10 seconds (optional)
  - Prevent duplicate submission (idempotent)

### 4.3 Scoring & Feedback
- **Auto-Grading**
  - Multiple choice: instant (regex-based matching)
  - Essay: manual admin review with scoring template
  - Score calculation: formula-based (customizable)

- **Feedback**
  - Per-question explanation (admin-defined)
  - Overall score & percentile
  - Performance by category

### 4.4 Admin Dashboard
- **Test Management**
  - Create, edit, publish tests
  - View test statistics
  - Manage questions & answers

- **Analytics**
  - User performance overview
  - Test completion rates
  - Average scores by category
  - Time spent analysis
  - Question difficulty analysis

- **Content Management**
  - Question bank
  - AI agent placeholder (for future auto-generation)
  - Review pending user submissions (essays)

### 4.5 User Dashboard (Post-Test)
- **Results**
  - Score & percentile
  - Time spent
  - Performance by category
  - Detailed answer review
  - Comparison vs other users (anonymized)

---

## 5. MONETIZATION STRATEGY

### Revenue Model: Freemium + Premium

#### Tier 1: Free
- **Features:**
  - 3 free tests/month
  - Basic feedback (only score)
  - 24h result retention
  - Limited analytics

- **Price:** $0

#### Tier 2: Basic (Premium Individual)
- **Features:**
  - Unlimited tests
  - Detailed feedback + explanations
  - 1-year result history
  - Performance analytics
  - Download result as PDF
  - No ads

- **Price:** $4.99-6.99/month (Rp 75K-100K)

#### Tier 3: Pro (Premium + Content Creator)
- **Features:**
  - All Basic features +
  - Create & publish own tests
  - Test analytics dashboard
  - Up to 100 questions/month
  - 5 custom test slots
  - Export user data

- **Price:** $9.99-12.99/month (Rp 150K-200K)

#### Tier 4: Institution (B2B)
- **Features:**
  - Unlimited everything
  - White-label option
  - Dedicated support
  - Custom integrations
  - Bulk user management

- **Price:** Custom (Rp 2M+/year)

### Monetization Timeline
- **Month 1-2:** Free tier only (growth)
- **Month 3:** Launch Tier 2 & 3
- **Month 6:** B2B outreach
- **Month 12:** Institution partnerships

### Payment Gateway
- **Primary:** Stripe (international)
- **Secondary:** Local payment (Midtrans/GCash for ID/PH)

---

## 6. USER STORIES

### For Test Takers
```
US-001: Tanpa login, saya bisa mulai tes
GIVEN: Saya di homepage
WHEN: Saya klik "Start Test"
THEN: Saya dapat session token & langsung mulai
ACCEPTANCE: No auth required, unique session per test

US-002: Saya bisa lihat score langsung setelah tes
GIVEN: Saya submit jawaban
WHEN: Grading selesai
THEN: Saya lihat score, feedback, explanations
ACCEPTANCE: Instant feedback untuk multiple choice, pending untuk essay

US-003: Saya bisa compare score dengan users lain
GIVEN: Saya selesai tes
WHEN: Saya lihat result page
THEN: Saya lihat percentile & average score
ACCEPTANCE: Anonymized comparison
```

### For Admin
```
US-101: Saya bikin test dengan custom scoring formula
GIVEN: Saya di admin dashboard
WHEN: Saya create new test
THEN: Saya set questions, answers, scoring rules
ACCEPTANCE: Flexible scoring (weighted, percentage, etc)

US-102: Saya lihat analytics per test & user
GIVEN: Tests sudah di-publish
WHEN: Users mulai take tests
THEN: Saya lihat real-time analytics
ACCEPTANCE: Dashboard updates in real-time

US-103: Saya bisa manage soal essay submissions
GIVEN: Users submit essay answers
WHEN: Saya login admin
THEN: Saya lihat pending submissions & bisa score/feedback
ACCEPTANCE: Review interface dengan template feedback
```

---

## 7. OUT OF SCOPE (MVP)

- ❌ Real-time collaboration (multiplayer tests)
- ❌ Video proctoring
- ❌ Integration dengan LMS (future)
- ❌ AI question generation (MVP placeholder)
- ❌ Mobile app native (web responsive saja)
- ❌ Custom branding/white-label (future)
- ❌ API untuk third-party (future)

---

## 8. SUCCESS METRICS

### Business Metrics
- Users acquired: 1000 in Month 1, 10K by Month 3
- Conversion to paid: 5-10%
- MRR (Monthly Recurring Revenue): Rp 5M+ by Month 6
- Retention rate: 70%+ for paid users

### Product Metrics
- Test completion rate: >80%
- Response time (submit answer): <200ms
- System uptime: 99.5%
- Error rate: <0.1%

### User Metrics
- Avg test duration: Tracked per test type
- Re-take rate: >50%
- User satisfaction: 4.5+/5

---

## 9. TIMELINE & ROADMAP

### Phase 1 (MVP - 8 weeks)
- ✅ Core test taking & scoring
- ✅ Basic admin dashboard
- ✅ User analytics
- ✅ Payment integration

### Phase 2 (Enhancement - 4 weeks)
- ✅ Content creator role
- ✅ Advanced analytics
- ✅ Email notifications
- ✅ Performance optimization

### Phase 3 (Monetization - ongoing)
- ✅ B2B outreach
- ✅ Institution features
- ✅ White-label (if demand)

### Phase 4 (AI Integration - future)
- ✅ AI question generation
- ✅ Adaptive testing
- ✅ Intelligent tutoring

---

## 10. ASSUMPTIONS & DEPENDENCIES

### Assumptions
1. Users willing to take tests without authentication
2. Manual admin grading sufficient for essay questions
3. PostgreSQL can handle growth (with optimization)
4. AI generation (future) akan via API eksternal

### Dependencies
- Payment gateway approval
- Email service (SMTP/SendGrid)
- File storage (S3/local)
- Analytics service (internal or third-party)

---

## 11. RISKS & MITIGATION

| Risk | Severity | Mitigation |
|------|----------|-----------|
| DDoS attacks on public form | High | Rate limiting + CAPTCHA + WAF |
| Data breach (user answers) | High | Encryption + regular audits |
| Low monetization rate | Medium | A/B test pricing + social proof |
| Content moderation burden | Medium | Community guidelines + reporting |
| Scale bottleneck at 10K users | Medium | Database optimization + caching |

---

## 12. TECHNICAL REQUIREMENTS

### Performance Requirements
- Response time: <200ms p95
- Database query: <50ms average
- Page load: <2s on 4G
- Concurrent users: 1000+ per VPS instance

### Availability
- Uptime SLA: 99.5%
- RTO: 1 hour
- RPO: 15 minutes

### Security
- HTTPS only
- Rate limiting per IP & session
- CAPTCHA for form submission
- SQL injection prevention
- XSS protection
- CSRF tokens

---

**End of PRD**
