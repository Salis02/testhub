# 💻 TestHub Implementation Guide & Architecture Map

> **Panduan Implementasi Teknis & Referensi Kode untuk Developer & AI Agent**  
> Status: **Production Ready (Phase 1 & Phase 2 Core Done)**  
> Tech Stack: **Go 1.22+ (Gin, sqlx, Redis)** + **React 19 (TypeScript, Vite, Tailwind CSS, Bun)**

---

## 1. Status Implementasi & Checklist Fitur

### ✅ Core Backend & API (Go)
- [x] **Infrastruktur & Database**: PostgreSQL connection pooling ([db.go](file:///home/sans/coding/quiz_app/backend/internal/database/db.go)), auto-migration multi-path ([001_init.sql](file:///home/sans/coding/quiz_app/backend/migrations/001_init.sql)), resilient Redis cache dengan in-memory fallback ([redis.go](file:///home/sans/coding/quiz_app/backend/internal/cache/redis.go)).
- [x] **Autentikasi & RBAC**: Registrasi & login admin/creator ber-hash bcrypt, verifikasi JWT token, middleware role check ([auth.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go), [middleware/auth.go](file:///home/sans/coding/quiz_app/backend/internal/middleware/auth.go)).
- [x] **Alur Ujian Non-Auth (Publik)**:
  - `POST /api/tests/:testId/start` -> Generate sesi UUID instan tanpa registrasi.
  - `GET /api/sessions/:sessionId/questions` -> Soal aman tanpa kunci jawaban / pembahasan.
  - `POST /api/sessions/:sessionId/submit-answer` -> Auto-save progres jawaban.
  - `POST /api/sessions/:sessionId/finish` -> Instant auto-grading, kalkulasi persentil & breakdown kategori.
  - `GET /api/results/:resultId` -> Hasil lengkap & pembahasan jawaban pasca-ujian.
- [x] **Admin Test Management & Media**:
  - `GET /api/admin/tests` & `GET /api/admin/tests/:testId` -> Manajemen katalog & edit butir soal lengkap.
  - `PUT /api/admin/tests/:testId` -> Update atomik metadata ujian, opsi A–E, dan kunci jawaban.
  - `POST /api/admin/upload-media` & `DELETE /api/admin/media` -> Upload gambar soal (maks 2MB, MIME validation, UUID file).
  - `GET /uploads/*` -> Static serving media dengan HTTP cache 7 hari.
  - `GET /api/admin/essays` & `POST /api/admin/essays/:essayId/grade` -> Antrean review esai manual.
- [x] **AI Question Generator**:
  - `POST /api/ai/generate-questions` -> Terhubung ke Gemini 2.5 Flash / Groq OSS dengan deterministik fallback dan `context.Context` abort propagation ([ai_agent.go](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go)).
- [x] **Keamanan & Resiliensi**: Rate limiting per IP/sesi ([ratelimit.go](file:///home/sans/coding/quiz_app/backend/internal/middleware/ratelimit.go)), graceful shutdown 10s ([main.go](file:///home/sans/coding/quiz_app/backend/cmd/server/main.go)), structured logger ([logger.go](file:///home/sans/coding/quiz_app/backend/internal/middleware/logger.go)).

### ✅ Frontend Application (React + Bun)
- [x] **State & Networking Modern**: TanStack Query v5 (server cache & deduplication), Zustand v5 ([useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts)), runtime validation Zod ([test.schema.ts](file:///home/sans/coding/quiz_app/frontend/src/schemas/test.schema.ts)), dan modular API services ([client.ts](file:///home/sans/coding/quiz_app/frontend/src/services/client.ts)).
- [x] **Halaman & Fitur Publik**:
  - Beranda katalog kuis ([HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx)) terintegrasi modal papan peringkat ([LeaderboardModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/LeaderboardModal.tsx)).
  - Antarmuka ujian berwaktu 60 FPS tabular-nums ([TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx)).
  - Hasil, pembahasan, dan penerbitan sertifikat kelulusan ([ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx), [CertificateModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/CertificateModal.tsx)).
  - Halaman verifikasi publik keaslian sertifikat ([VerifyCertificatePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/VerifyCertificatePage.tsx)).
  - Modal pembayaran instan QRIS / Midtrans Snap terproteksi auto-polling & exactly-once ([PaymentModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/PaymentModal.tsx)).
- [x] **Halaman & Fitur Terproteksi**:
  - Portal login admin & user ([LoginPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/LoginPage.tsx)).
  - Dashboard admin ([AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx)) terlindungi `ProtectedRoute`.
  - Analitik performa modul ujian ([TestAnalyticsModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestAnalyticsModal.tsx)).
  - Manajemen langganan & manual bypass ([SubscriptionManagement.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/SubscriptionManagement.tsx)).
- [x] **Fitur Admin Terintegrasi**: Modal editor soal ([TestEditorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestEditorModal.tsx)), formulir pembuat soal ([TestCreatorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestCreatorModal.tsx), [QuestionFormField.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/QuestionFormField.tsx)), upload gambar soal ([MediaUploader.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/MediaUploader.tsx)), AI generator modal berprogres dinamis ([AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx)).
- [x] **UX Universal**: Toast & dialog konfirmasi non-blocking berbasis Promise ([ToastContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/ToastContext.tsx), [ConfirmContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/ConfirmContext.tsx)).
- [x] **Dokumentasi Frontend Khusus**: Lihat [FRONTEND_ARCHITECTURE.md](file:///home/sans/coding/quiz_app/FRONTEND_ARCHITECTURE.md).

---

## 2. Developer Extension Guide (Menambahkan Fitur Baru)

Setiap penambahan fitur baru harus mengikuti kaidah **Clean Architecture**:

```
Alur Penambahan Fitur:
1. Migrasi DB      -> backend/migrations/00X_nama_fitur.sql
2. Domain Model    -> backend/internal/models/models.go
3. Business Logic  -> backend/internal/services/nama_service.go
4. HTTP Handler    -> backend/internal/handlers/nama_handler.go
5. Registrasi Rute -> backend/internal/handlers/routes.go
6. Unit Test       -> backend/tests/api_test.go
7. Integrasi UI    -> frontend/src/services/client.ts & komponen React
```

### 2.1 Database & Migrasi
- Tambahkan file `00X_deskripsi.sql` di [`backend/migrations/`](file:///home/sans/coding/quiz_app/backend/migrations).
- Jalankan `make migrate` untuk mengeksekusi migrasi otomatis secara berurutan.

### 2.2 Model & DTO
- Definisikan struct di [`backend/internal/models/models.go`](file:///home/sans/coding/quiz_app/backend/internal/models/models.go).
- **Aturan Wajib:** Kolom database yang bernilai `NULL` **harus** menggunakan pointer (contoh: `*string`, `*time.Time`, `*float64`) agar `sqlx` tidak mengalami error scan NULL.

### 2.3 Service (Business Logic)
- Tempatkan fungsi murni di [`backend/internal/services/`](file:///home/sans/coding/quiz_app/backend/internal/services).
- Hindari membawa dependensi HTTP (`gin.Context`) ke dalam service agar mudah di-unit test secara terisolasi.

### 2.4 HTTP Handler & Routing
- Buat handler di [`backend/internal/handlers/`](file:///home/sans/coding/quiz_app/backend/internal/handlers).
- Validasi payload dengan `c.ShouldBindJSON(&req)`.
- Daftarkan endpoint ke router di [`routes.go`](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go) pada group yang tepat:
  - Publik: `api.Group("/tests")` atau `api.Group("/sessions")`.
  - Terproteksi: `api.Group("/admin")` (dilindungi `AuthRequired` & `RequireAdmin`).

### 2.5 API Client Frontend
- Tambahkan fungsi pemanggilan HTTP pada objek `api` di [`frontend/src/services/api.ts`](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts).
- Selalu sediakan handling error ramah pengguna menggunakan `useToast().showToast(err, 'error')`.

---

## 3. Peta Direktori & Simbol Kode Utama

| Modul | File Sumber | Tanggung Jawab Utama |
|---|---|---|
| **Entry Point** | [backend/cmd/server/main.go](file:///home/sans/coding/quiz_app/backend/cmd/server/main.go) | Inisialisasi DB, cache, router, graceful shutdown HTTP server |
| **Konfigurasi** | [backend/internal/config/config.go](file:///home/sans/coding/quiz_app/backend/internal/config/config.go) | Parsing env vars (`DB_*`, `REDIS_*`, `JWT_*`, `PORT`) |
| **Database Pool** | [backend/internal/database/db.go](file:///home/sans/coding/quiz_app/backend/internal/database/db.go) | Setup connection pool sqlx & auto-migration runner |
| **Cache Client** | [backend/internal/cache/redis.go](file:///home/sans/coding/quiz_app/backend/internal/cache/redis.go) | Client Redis dengan fallback transparent in-memory mutex |
| **Domain Models** | [backend/internal/models/models.go](file:///home/sans/coding/quiz_app/backend/internal/models/models.go) | Struct User, Test, Question, Option, Session, Submission, Result |
| **Router & Registry**| [backend/internal/handlers/routes.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go) | Routing table Gin, middleware chain, rate limit grouping |
| **Public Handler** | [backend/internal/handlers/public.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/public.go) | Handler start test, get questions, submit answer, finish grading |
| **Admin Handler** | [backend/internal/handlers/admin.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/admin.go) | Handler CRUD tests, update questions, essay queue review |
| **Media Handler** | [backend/internal/handlers/media.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/media.go) | Upload, validasi MIME tipe, dan hapus gambar soal |
| **AI Service** | [backend/internal/services/ai_agent.go](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go) | Sintesis soal via Gemini/Groq LLM dengan rule validasi ketat |
| **Scoring Engine** | [backend/internal/services/scoring.go](file:///home/sans/coding/quiz_app/backend/internal/services/scoring.go) | Kalkulasi skor formula, persentil, dan evaluasi kategori |
| **Frontend API** | [frontend/src/services/api.ts](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts) | Fetch wrapper terpusat, JWT header injection, mock fallback |

---

## 4. Prosedur Pengujian & Verifikasi

```bash
# 1. Jalankan Go Unit & Integration Tests
make test
# atau: cd backend && go test ./tests -v

# 2. Type-check & Production Build Frontend
make build-frontend
# atau: cd frontend && bun run build

# 3. Verifikasi Health Endpoint
curl -s http://localhost:8000/health
```

---

## 5. Audit Backend: Status Penyelesaian Bug Fatal, Idempotensi, & Skalabilitas

Seluruh temuan teknis kritis dan optimasi basis kode backend Go telah dieksekusi dan diverifikasi (`go test ./tests -v` PASS):

### 5.1 Idempotensi Pembayaran & Akses Ganda
* **Inbound Webhook (`POST /api/payments/webhook`)**:
  - ✅ **Idempoten Teruji**: `SettleOrder` menggunakan transaksi database dengan row-level lock `SELECT * FROM orders WHERE id = $1 FOR UPDATE` dan fast-return status settled.
* **Outbound Create Invoice (`POST /api/payments/create-invoice`)**:
  - ✅ **Client Idempotency Key**: Mendukung HTTP Header `Idempotency-Key` dari frontend untuk menjamin exactly-once creation.
  - ✅ **Pre-Payment Ownership Check**: Menolak pembuatan tagihan dengan `HTTP 409 Conflict` (`already_subscribed: true`) jika user sudah memiliki modul tersebut atau memiliki Season Pass aktif.
  - ✅ **Pending Invoice Reuse**: Jika terdapat invoice pending yang belum kadaluarsa (`expires_at > NOW()`), backend mengembalikan order yang ada alih-alih membuat tagihan ganda di gateway.

### 5.2 Bug Fatal & Celah Integritas Sistem (Selesai Diperbaiki)
1. **✅ Bug Fatal Double Submit `FinishTest` (Resolved)**:
   - `PostgresExamRepository.FinishExamTx` kini dilengkapi pengecekan awal status sesi (`if session.SubmittedAt != nil || !session.IsActive`).
   - Jika peserta mengklik submit dua kali atau jaringan lag, backend mengambil hasil dari `test_results` dan mengembalikan `HTTP 200 OK` tanpa duplicate key error.
2. **✅ Eliminasi N+1 Query pada Database (Anti N+1 Batching)**:
   - `attachBatchOptions` mengeksekusi 1 kueri batch `WHERE question_id IN (?)` menggunakan `sqlx.In`.
   - Diterapkan pada `FinishExamTx`, `GetSessionQuestions`, dan `GetResultByID`, memangkas ratusan query SQL menjadi tepat 1 query batch.

### 5.3 Optimasi Caching Redis
1. **✅ Read-Through Cache Katalog Ujian**:
   - `PublicHandler.ListTests` membaca cache Redis `tests:catalog:{category}` (TTL 5m) untuk request katalog publik.
2. **✅ Automatic Cache Invalidation**:
   - `AdminHandler` memanggil `DeletePattern("tests:catalog:*")` saat modul dibuat, diperbarui, dihapus, atau diubah status publikasinya.


---

## 6. Real Progress Fitur Backend & Audit Konektivitas FE ↔ BE

### 6.1 Matriks Konektivitas Endpoint Backend (`routes.go`) vs Frontend (`src/services/`)

Audit mendalam terhadap seluruh endpoint yang terdaftar di [backend/internal/handlers/routes.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go) terhadap pemanggilan di sisi Frontend:

| Grup Role | Endpoint Backend (`routes.go`) | Status BE | Terkoneksi di FE? | Service & Komponen FE Pemanggil |
|---|---|:---:|:---:|---|
| **🌐 Public** | `POST /api/auth/register` | ✅ 100% | ✅ Ya | `authApi.register()` di [LoginPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/LoginPage.tsx) |
| **🌐 Public** | `POST /api/auth/login` | ✅ 100% | ✅ Ya | `authApi.login()` di [LoginPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/LoginPage.tsx) |
| **🌐 Public** | `GET /api/auth/me` | ✅ 100% | ✅ Ya | `authApi.me()` di [AuthContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/AuthContext.tsx) |
| **🌐 Public** | `GET /api/tests` | ✅ 100% | ✅ Ya | `testsApi.listTests()` di [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx) |
| **🌐 Public** | `GET /api/tests/:testId` | ✅ 100% | ✅ Ya | `testsApi.getTestById()` di [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) |
| **🌐 Public** | `POST /api/tests/:testId/start` | ✅ 100% | ✅ Ya | `sessionsApi.startTest()` aktif terintegrasi tangkapan `ApiError` 402 dan `PaymentModal` di [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx) & [TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx). |
| **🌐 Public** | `GET /api/sessions/:id/questions` | ✅ 100% | ✅ Ya | `sessionsApi.getSessionQuestions()` di [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) |
| **🌐 Public** | `GET /api/sessions/:id/submissions`| ✅ 100% | ✅ Ya | `sessionsApi.getSessionSubmissions()` di [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) |
| **🌐 Public** | `POST /api/sessions/:id/submit-answer`| ✅ 100% | ✅ Ya | `sessionsApi.submitAnswer()` di [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) |
| **🌐 Public** | `POST /api/sessions/:id/finish` | ✅ 100% | ✅ Ya | `sessionsApi.finishTest()` di [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) |
| **🌐 Public** | `GET /api/results/:resultId` | ✅ 100% | ✅ Ya | `sessionsApi.getResult()` di [ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx) |
| **🌐 Public** | `GET /api/tests/:testId/leaderboard` | ✅ 100% | ✅ Ya | `testsApi.getLeaderboard()` terhubung ke [LeaderboardModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/LeaderboardModal.tsx) di HomePage & ResultsPage. |
| **🌐 Public** | `GET /api/results/:id/certificate` | ✅ 100% | ✅ Ya | `sessionsApi.getCertificate()` terhubung ke [CertificateModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/CertificateModal.tsx). |
| **🌐 Public** | `GET /api/verify/certificate/:id` | ✅ 100% | ✅ Ya | `sessionsApi.verifyCertificate()` terhubung ke [VerifyCertificatePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/VerifyCertificatePage.tsx). |
| **🌐 Public** | `POST /api/payments/create-invoice` | ✅ 100% | ✅ Ya | `paymentsApi.createInvoice()` terhubung di [PaymentModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/PaymentModal.tsx). |
| **🌐 Public** | `GET /api/payments/status/:orderId` | ✅ 100% | ✅ Ya | `paymentsApi.getOrderStatus()` dengan TanStack Query auto-polling di [PaymentModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/PaymentModal.tsx). |
| **🌐 Public** | `POST /api/payments/webhook` | ✅ 100% | Server | Jalur server-to-server gateway (Midtrans/Xendit) ke Go Backend (Idempoten via row-locking `SELECT FOR UPDATE`). |
| **🌐 Public** | `POST /api/ai/generate-questions` | ✅ 100% | ✅ Ya | `aiApi.generateQuestions()` di [AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx) |
| **👤 User** | `GET /api/user/me` | ✅ 100% | ✅ Ya | Kompatibel via alias `authApi.me()`. |
| **👤 User** | `GET /api/user/subscriptions` | ✅ 100% | ✅ Ya | `paymentsApi.getUserSubscriptions()` terhubung di [SubscriptionManagement.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/SubscriptionManagement.tsx). |
| **👑 Admin** | `GET /api/admin/stats` | ✅ 100% | ✅ Ya | `adminApi.getStats()` di [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx) |
| **👑 Admin** | `GET /api/admin/tests/:id/analytics`| ✅ 100% | ⚠️ Parsial | Endpoint BE siap, UI menampilkan modal [TestAnalyticsModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestAnalyticsModal.tsx). |
| **👑 Admin** | `GET /api/admin/tests` (CRUD) | ✅ 100% | ✅ Ya | `adminApi.listTests()`, `createTest()`, `updateTest()`, `deleteTest()`, `togglePublish()`. |
| **👑 Admin** | `GET /api/admin/essays` (Grading) | ✅ 100% | ✅ Ya | `adminApi.getPendingEssays()` & `adminApi.gradeEssay()` di [EssayGradingView.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/EssayGradingView.tsx). |
| **👑 Admin** | `POST /api/admin/upload-media` | ✅ 100% | ✅ Ya | `adminApi.uploadMedia()` & `deleteMedia()` di [MediaUploader.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/MediaUploader.tsx). |
| **👑 Admin** | `GET /api/admin/subscriptions` | ✅ 100% | ✅ Ya | `adminApi.listSubscriptions()` di [SubscriptionManagement.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/SubscriptionManagement.tsx). |
| **👑 Admin** | `POST /api/admin/subscriptions/manual-grant` | ✅ 100% | ✅ Ya | `adminApi.manualGrantSubscription()` di [ManualGrantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/ManualGrantModal.tsx). |
| **👑 Admin** | `PUT /api/admin/subscriptions/:id/status` | ✅ 100% | ✅ Ya | `adminApi.updateSubscriptionStatus()` di [ExtendSubscriptionModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/ExtendSubscriptionModal.tsx). |
| **👑 Admin** | `DELETE /api/admin/subscriptions/:id/revoke` | ✅ 100% | ✅ Ya | `adminApi.revokeSubscription()` di [SubscriptionManagement.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/SubscriptionManagement.tsx). |

---

### 6.2 Status Penyelesaian Technical Debt & Audit Frontend (100% Selesai)

Seluruh 8 temuan arsitektural dan technical debt frontend telah selesai dieksekusi dan diverifikasi (`bun run build` bersih):

1. **✅ Auth Token Desync & Logout Leak ([AuthContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/AuthContext.tsx)):**
   - Menggunakan helper `getStoredToken()`, `setStoredToken()`, dan `clearStoredToken()` dari [client.ts](file:///home/sans/coding/quiz_app/frontend/src/services/client.ts).
2. **✅ Keystroke Spam pada Input Esai ([QuestionCard.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/test/QuestionCard.tsx)):**
   - Menerapkan input debounce 600ms dengan auto-flush saat event `onBlur` atau perpindahan soal.
3. **✅ Server State Anti-Pattern di [ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx):**
   - Direfaktorkan ke TanStack Query `useQuery(['result', resultId])` dengan auto-caching 5 menit.
4. **✅ Resiliensi Offline Saat Jaringan Terputus ([useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts)):**
   - Antrean jawaban pending disimpan di `localStorage` dan otomatis di-sync saat event `window.ononline` serta di-flush sebelum `finishSession()`.
5. **✅ Code Splitting Bundle ([App.tsx](file:///home/sans/coding/quiz_app/frontend/src/App.tsx)):**
   - Rute halaman di-split menggunakan `React.lazy()` dan `<Suspense>`. Warning bundle > 500 kB hilang dan beban load awal terpangkas drastis.
6. **✅ Alur Berlangganan di [PricingPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/PricingPage.tsx):**
   - Tombol paket terhubung langsung ke `PaymentModal` untuk checkout instan tanpa hambatan login.
7. **✅ Dead Code Asset ([mockData.ts](file:///home/sans/coding/quiz_app/frontend/src/services/mockData.ts)):**
   - Berkas data tiruan 26.3 KB telah dihapus dari repository.
8. **✅ Client Idempotency-Key ([payments.api.ts](file:///home/sans/coding/quiz_app/frontend/src/services/payments.api.ts)):**
   - Request invoice kini menyertakan header `Idempotency-Key` (UUIDv4) untuk menjamin exactly-once transaction.

---

### 6.3 Catatan Penting Keselarasan Backend & Frontend

1. **Konsistensi Payload (Snake_case vs CamelCase):**
   - Respon JSON dari backend Go menggunakan `snake_case` (`price_idr`, `time_spent_seconds`, `question_id`, `option_id`, `is_correct`).
   - Seluruh DTO Frontend di `src/types/` dan `src/services/` wajib memetakan atau mempertahankan field `snake_case` saat payload dikirim ke backend agar tidak ditolak validasi DTO `ShouldBindJSON`.
2. **Penanganan Token & Autentikasi:**
   - Klien HTTP `apiClient` di [client.ts](file:///home/sans/coding/quiz_app/frontend/src/services/client.ts) secara otomatis menginjeksi header `Authorization: Bearer <token>` jika token tersedia di `localStorage`.
   - Untuk alur ujian publik anonim, server backend **tidak mewajibkan token sama sekali**. Token hanya divalidasi pada rute grup `/api/user/*` dan `/api/admin/*`.

---


### 📈 FASE P2: Diagnostik, Monetisasi Kreator, & Onboarding Cepat (Fokus Sprint 3 - 4)

#### 1. Weakness Diagnostic Radar & Rekomendasi Remedial
* **Backend (BE)**:
  - Ekstensi kueri agregasi per-subtopik: `SELECT q.sub_topic, COUNT(*) AS total, SUM(CASE WHEN s.is_correct THEN 1 ELSE 0 END) AS correct FROM test_questions q JOIN test_submissions s ON s.question_id = q.id WHERE s.session_id = $1 GROUP BY q.sub_topic`.
  - Simpan metrik rasio kompetensi ke kolom JSONB `results.category_breakdown`.
  - Endpoint `GET /api/results/:id/remedial` merekomendasikan modul latihan spesifik berdasarkan subtopik dengan akurasi terendah (< 60%).
* **Frontend (FE)**:
  - Komponen spider/radar chart SVG murni (zero-dependency per [style.md](file:///home/sans/coding/quiz_app/style.md)) di [ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx).
  - Kartu rekomendasi *"Fokus Belajar Anda"* dengan tombol direct link ke modul tryout terkait.

#### 2. Creator Monetization, Bagi Hasil, & Payout Dashboard
* **Backend (BE)**:
  - Tambah tabel `creator_wallets` (`user_id`, `balance_idr`, `pending_idr`) dan `payout_requests` (`id`, `user_id`, `amount`, `bank_account`, `status`).
  - Saat webhook invoice settled: potong otomatis fee platform (contoh: 25%), kreditkan 75% ke saldo `creator_wallets`.
  - Endpoint `POST /api/creator/payout` untuk pengajuan penarikan dana ke rekening bank/e-wallet.
* **Frontend (FE)**:
  - Toggle *"Modul Berbayar"* & input harga IDR pada [TestCreatorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestCreatorModal.tsx).
  - Tab *"Dompet & Penghasilan"* di [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx) dengan grafik pendapatan bulanan dan formulir penarikan dana.

#### 3. Bulk Import Soal Massal Drag-and-Drop (CSV / Excel)
* **Backend (BE)**:
  - Endpoint `POST /api/admin/tests/:testId/import-questions` mem-parsing berkas multipart `.csv` / `.xlsx`.
  - Validasi baris atomik via `dto.ValidateRelational()` (kunci jawaban, bobot, tipe soal), eksekusi batch insert `question_options` dalam 1 transaksi DB.
* **Frontend (FE)**:
  - Komponen modal `BulkImportModal.tsx` dengan fitur drag-and-drop file, tombol unduh *"Download Template CSV"*, dan live preview tabel data sebelum komit ke server.

---

### 🛡️ FASE P3: Integritas Ujian, Real-Time Interaksi, & Fitur B2B (Fokus Sprint 5)

#### 4. Anti-Cheat Focus Mode & Proctoring Logs
* **Backend (BE)**:
  - Endpoint `POST /api/sessions/:id/telemetry` untuk logging insiden kecurangan: `tab_blur_count`, `fullscreen_exit_count`, `paste_attempts`.
  - Jika `tab_blur_count >= 3`, tandai `disqualified: true` pada sesi ujian dan kunci kalkulasi sertifikat kelulusan.
* **Frontend (FE)**:
  - Fullscreen enforcement di [TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx).
  - Pasang listener `window.onblur` dan `document.addEventListener('visibilitychange')` dengan dialog peringatan modal *"Peringatan Kecurangan (#X/3)"*.
  - Matikan shortcut inspect (`Ctrl+Shift+I`), copy (`Ctrl+C`), dan klik kanan (`contextmenu`).

#### 5. Streaming AI Question Synthesis via Server-Sent Events (SSE)
* **Backend (BE)**:
  - Endpoint streaming `GET /api/ai/stream-questions?topic=...&count=5` menggunakan protokol SSE (`Content-Type: text/event-stream`).
  - Mengalirkan butir soal satu per satu dari Gemini / Groq secara langsung saat di-generate tanpa menunggu seluruh batch selesai.
* **Frontend (FE)**:
  - Integrasi EventSource di [AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx) dengan kartu soal yang muncul bertahap (*staggered appearance*), memangkas waktu tunggu dari 15 detik menjadi instan (< 1 detik).

#### 6. Live Concurrent Examinee Counter (Redis HyperLogLog)
* **Backend (BE)**:
  - Perintah atomik hemat memori: `PFADD examinees:live:{testId} {sessionId}` (TTL 5 menit) dan `PFCOUNT examinees:live:{testId}`.
* **Frontend (FE)**:
  - Badge social proof di kartu ujian [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx): *"🔥 312 peserta sedang mengerjakan ujian ini"* untuk memicu konversi dan *FOMO*.

---

## 7. Protokol Pencegahan Technical Debt (Standard Operating Procedure FE & BE)

Untuk menjamin kualitas kode bertahan 10+ tahun dengan skalabilitas tinggi, setiap developer dan AI agent **WAJIB** mematuhi checklist pencegahan technical debt berikut sebelum melakukan perubahan kode atau *Pull Request*:

### 📋 Checklist Wajib Backend (Go)
| Kategori | Potensi Technical Debt | Standar Solusi Anti-Debt |
|---|---|---|
| **Database Transaction** | Lupa rollback saat error/panic -> pool koneksi habis | Setiap `r.db.BeginTxx()` **wajib langsung diikuti `defer tx.Rollback()`**. |
| **Context Cancellation** | Goroutine menggantung saat client disconnect | Wajib oper `c.Request.Context()` ke seluruh method Repository & Redis (`GetContext`, `ExecContext`). |
| **Layer Separation** | SQL bocor ke handler controller | **0 baris raw SQL di handler**. Seluruh SQL wajib berada di `internal/repository/`. |
| **Idempotency & Race Condition** | Webhook payment ganda mencatat langganan duplikat | Gunakan row locking `SELECT ... FOR UPDATE` dan cek status awal (`if order.Status == "settled" return`). |
| **Information Disclosure** | Pesan error SQL PostgreSQL bocor ke client | Log detail di server (`log.Printf`), kembalikan pesan ramah pengguna yang telah disanitasi ke response JSON. |
| **Pagination & OOM** | `SELECT *` tanpa batas data di admin query | Selalu pasang `LIMIT` (default 20, maks 100) dan `OFFSET` pada listing transaksi & modul tes. |

| **Secret & Key Security** | Server Key (Midtrans/Xendit/AI) bocor ke logs / frontend | **Dilarang keras mengekspos Server Key**. Server Key hanya disimpan di `.env` (di-ignore oleh git), disuntikkan secara aman via memory struct, dan tidak pernah dicetak di `log.Printf` atau respon JSON. |
| **Payment Gateway Extensibility** | Vendor lock-in & tight coupling ke satu payment provider | Wajib mengimplementasikan `PaymentGatewayProvider` interface (`CreateTransaction`, `VerifyWebhook`, `GetProviderName`). Handler hanya bergantung pada abstraksi interface, bukan implementasi konkrit Midtrans/Xendit langsung. |

### 📋 Checklist Wajib Frontend (React + Bun)
| Kategori | Potensi Technical Debt | Standar Solusi Anti-Debt |
|---|---|---|
| **Server State Hygiene** | Duplikasi data `useQuery` ke dalam `useState` | **Dilarang menyalin data server**. Konsumsi langsung `data` atau gunakan `useMemo` untuk derived filtering. |
| **Timer & Polling Leaks** | `setInterval` manual di `useEffect` tidak di-clear | Gunakan `refetchInterval` bawaan TanStack Query yang otomatis berhenti saat modal tutup atau status `settled`. |
| **Bundle Bloat** | Import statis pustaka PDF / Chart membengkakkan bundle > 500kB | Gunakan dynamic import `await import('jspdf')` atau `React.lazy()` hanya saat tombol aksi diklik. |
| **Form Integrity** | Validasi manual rentan bug & mutasi nested object | Gunakan skema **Zod** di [src/schemas/](file:///home/sans/coding/quiz_app/frontend/src/schemas/) dan manipulasi list opsi via **`useFieldArray`**. |
| **Rendering Performance** | Timer ujian per detik me-render ulang seluruh halaman | Simpan countdown di **Zustand** ([useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts)) dan konsumsi via atomic selector (`s => s.secondsLeft`). |
| **Design Consistency** | Arbitrary hex color liar (`#3f21a8`) merusak tema | Gunakan token semantik CSS sesuai [style.md](file:///home/sans/coding/quiz_app/style.md) (`bg-slate-950`, `text-indigo-400`, `border-slate-800`). |
| **Client Payment Security** | Server Key atau data rahasia dipanggil dari Frontend | Frontend hanya boleh menerima `snap_token` / `client_key` publik untuk Midtrans Snap Popup `window.snap.pay(snapToken)` dan tidak boleh memverifikasi signature pembayaran secara lokal. |
| **Auth Token Lifecycle** | Logout leak token lama di header `Authorization` | Selalu gunakan `clearStoredToken()` dan `getStoredToken()` dari [client.ts](file:///home/sans/coding/quiz_app/frontend/src/services/client.ts). Dilarang manipulasi parsial `localStorage.removeItem('testhub_admin_token')`. |
| **Input Auto-Save Debounce**| Keystroke spamming memicu HTTP 429 Too Many Requests | Input esai wajib menggunakan debounce 500–1000ms atau di-flush ke server saat event `onBlur` / perpindahan butir soal. |
| **Offline Sync Queue** | Kehilangan jawaban peserta saat internet putus | Simpan antrean jawaban pending di `localStorage` saat status `Gagal simpan` dan trigger auto-sync saat event `window.ononline`. |

