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

## 5. Audit Technical Debt Backend & Catatan Arsitektur (Senior Review)

Berdasarkan audit mendalam arsitektur Go backend saat ini, berikut adalah catatan teknis dan area perbaikan untuk sprint berikutnya:

### 5.1 Validasi Request: Manual & Redundan
- **Kondisi Saat Ini**:
  - Validasi terpecah antara struct tags (`binding:"required"`) di [models.go](file:///home/sans/coding/quiz_app/backend/internal/models/models.go) dan pengecekan manual inline di [handlers/admin.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/admin.go) (misal: fallback manual `if passing <= 0 { passing = 60 }`, `if pts <= 0 { pts = 5 }`).
  - `CreateTest` mendefinisikan anonymous inline struct di dalam handler, bukan DTO terpusat.
  - Belum ada validasi relasional (misal: memastikan soal pilihan ganda memiliki minimal 2 opsi dan tepat 1 opsi ditandai `is_correct: true`).
- **Target Solusi**:
  - Sentralisasi seluruh DTO request ke package terpadu dengan tag `go-playground/validator/v10` (`oneof=cpns sbmptn iq custom`, `min=5`, `max=300`).
  - Buat error normalizer middleware agar pesan error validasi dikembalikan dalam bentuk JSON terstruktur (misal `{"errors": {"title": "Judul wajib diisi"}}`) alih-alih raw string Gin.

### 5.2 Rate Limiter: Redis vs In-Memory Fallback Gotchas
- **Kondisi Saat Ini**:
  - Rate limiting di [ratelimit.go](file:///home/sans/coding/quiz_app/backend/internal/middleware/ratelimit.go) berjalan primer via Redis (`cClient.Incr` + `cClient.Expire`).
  - **Gotcha 1 (In-Memory Leak)**: Jika Redis offline dan client beralih ke in-memory (`sync.Map`), fungsi `Expire` di [redis.go](file:///home/sans/coding/quiz_app/backend/internal/cache/redis.go#L118) **tidak memiliki logika TTL eviction untuk rate limiter**. Counter akan naik terus tanpa di-reset, memicu blokir HTTP 429 permanen bagi IP tersebut sampai server di-restart.
  - **Gotcha 2 (Non-Atomic Redis Race)**: Jika server crash tepat di antara `Incr` dan `Expire`, key Redis akan menjadi zombie key tanpa TTL.
- **Target Solusi**:
  - Gunakan atomic Redis Lua Script (`INCR` + `EXPIRE` atomik dalam 1 evaluasi).
  - Tambahkan background cleanup goroutine untuk TTL eviction pada `rateLimiter sync.Map` in-memory fallback.

### 5.3 AI Service: Arsitektur 3-Tier & Catatan Fallback Hardcode *(DO NOT MODIFY YET)*
- **Kondisi Saat Ini**:
  - [ai_agent.go](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go) memiliki arsitektur 3-tier cascade:
    1. *Tier 1*: Google Gemini 1.5 Flash (via REST API dengan multi-key failover).
    2. *Tier 2*: Groq Llama 3.3 70B (jika Gemini 429/gagal).
    3. *Tier 3*: Local Deterministic Generator (Zero-Downtime fallback saat API key kosong/kuota habis).
  - **Catatan Hardcode**: Pada Tier 3 (`generateLocalDeterministic`), topik kurikulum (`sampleTopics`) dan pola pertanyaan di-hardcode langsung di dalam source code Go (`[AI Asesmen: %s] Berdasarkan prinsip baku terkait %s...`) dengan kunci benar selalu di Opsi A.
  - **Catatan Parser**: Parsing JSON LLM masih mengandalkan string trimming (`strings.TrimPrefix(raw, "```json")`), rentan gagal jika model LLM menambahkan prolog/epilog percakapan.
- **Rekomendasi Sprint Mendatang**:
  - Pindahkan bank topik darurat ke database seed atau file konfigurasi eksternal JSON.
  - Terapkan JSON mode terstruktur (*response schema*) pada Gemini/Groq dan dukung streaming Server-Sent Events (SSE).

### 5.4 Pemisahan Layer: Handler vs Service/Repository Pattern
- **Kondisi Saat Ini**: Handler seperti `admin.go` membuka transaksi SQL langsung (`tx, err := h.db.Beginx()`) dan menjalankan query insert bertingkat di dalam fungsi HTTP handler.
- **Target Solusi**: Pindahkan transaksi database ke Repository Layer (`repository/test_repository.go`) agar handler murni menangani HTTP request/response dan mempermudah unit testing dengan mock DB.

### 5.5 Sanitasi Pesan Error (Information Disclosure)
- **Kondisi Saat Ini**: Beberapa handler mengembalikan pesan raw error database (`"Gagal menyimpan tes: " + err.Error()`), berpotensi membocorkan struktur tabel dan constraint PostgreSQL ke publik.
- **Target Solusi**: Catat internal error ke structured logger ([logger.go](file:///home/sans/coding/quiz_app/backend/internal/middleware/logger.go)) dan kembalikan pesan ramah pengguna ke client.

---

## 6. Roadmap Fitur Masa Depan (Phase 3 & 4)

- [ ] **Email Notifications**: Worker goroutine untuk mengirim bukti kelulusan & sertifikat hasil tes via SMTP.
- [ ] **Adaptive Testing**: Penyesuaian kesulitan soal dinamis secara real-time berdasarkan akurasi jawaban sebelumnya.
- [ ] **Export PDF**: Unduh laporan analitik & sertifikat nilai dalam bentuk PDF.
- [ ] **Monetisasi Payment Gateway**: Webhook integrasi Midtrans / Stripe untuk paket berlangganan Pro & B2B.
