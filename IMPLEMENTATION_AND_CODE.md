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
- [x] **Halaman Publik**: Beranda katalog kuis ([HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx)), antarmuka ujian berwaktu 60 FPS ([TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx)), hasil & review pembahasan ([ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx)).
- [x] **Halaman Terproteksi**: Portal login admin ([LoginPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/LoginPage.tsx)), dashboard admin ([AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx)) terlindungi `ProtectedRoute`.
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

## 5. Roadmap Fitur Masa Depan (Phase 3 & 4)

- [ ] **Email Notifications**: Worker goroutine untuk mengirim bukti kelulusan & sertifikat hasil tes via SMTP.
- [ ] **Adaptive Testing**: Penyesuaian kesulitan soal dinamis secara real-time berdasarkan akurasi jawaban sebelumnya.
- [ ] **Export PDF**: Unduh laporan analitik & sertifikat nilai dalam bentuk PDF.
- [ ] **Monetisasi Payment Gateway**: Webhook integrasi Midtrans / Stripe untuk paket berlangganan Pro & B2B.
