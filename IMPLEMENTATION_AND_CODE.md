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

## 5. Keputusan Arsitektur & Penyelesaian Technical Debt Backend

Berdasarkan audit arsitektur backend Go, seluruh area teknis inti telah diselesaikan dengan standar *Production-Grade Clean Architecture*:

1. **Validasi Request Terpusat & Relasional** (`internal/models/dto.go`, `internal/validator/validator.go`): Validasi DTO struct tags `validator/v10` dan relasional (memverifikasi soal pilihan ganda wajib memiliki minimal 2 opsi dan tepat 1 kunci jawaban benar).
2. **Rate Limiting Resilien** (`internal/cache/redis.go`, `internal/middleware/ratelimit.go`): Script Lua atomik (`INCR` + `EXPIRE`) di Redis dan in-memory fallback dengan janitor goroutine (30s) untuk mencegah memory leak.
3. **AI Service 3-Tier Cascade** (`internal/services/ai_agent.go`): Gemini 2.5 Flash -> Groq Llama 3.3 -> Local Deterministic Fallback. Diisolasi dengan `context.Context` abort timeout.
4. **Isolasi Repository Pattern** (`internal/repository/`): Seluruh query database terisolasi di `TestRepository`, `ExamRepository`, dan `SubscriptionRepository`. Handler controller (`admin.go`, `public.go`, `payment.go`) bersih dari raw SQL string.
5. **Sanitasi Error (Anti Information Disclosure)**: Raw error database dicatat di log server backend (`log.Printf`), respon ke user JSON selalu menggunakan pesan ramah pengguna.

---

## 6. Real Progress Fitur Backend & Panduan Implementasi Frontend (Sprint P1–P3)

### 🚀 FASE P1: Revenue & Virality [STATUS BACKEND: 100% SELESAI ✅]

| Fitur | Status Backend (`routes.go`) | Kebutuhan Implementasi Frontend (FE) |
|---|---|---|
| **Multi-Endpoint Payment (QRIS)** | `POST /api/payments/create-invoice`<br>`GET /api/payments/status/:orderId`<br>`POST /api/payments/webhook` | Komponen `PaymentModal.tsx` dengan QRIS dynamic, countdown 15m, polling TanStack Query (`refetchInterval: 3000`), dan badge harga di [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx). |
| **Paywall Enforcement** | `POST /api/tests/:testId/start` (Return `HTTP 402 Payment Required` jika tes berbayar) | Interceptor di [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) untuk membuka modal pembayaran saat menerima respon `402`. |
| **Admin Manual Subscription Override** | `GET /api/admin/subscriptions`<br>`POST /api/admin/subscriptions/manual-grant`<br>`PUT /api/admin/subscriptions/:id/status`<br>`DELETE /api/admin/subscriptions/:id/revoke` | Komponen `SubscriptionManagement.tsx` di [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx): modal manual grant (email, paket, masa aktif, catatan audit) dan tabel langganan ber-badge warna sumber. |
| **User Subscriptions** | `GET /api/user/subscriptions` | Tampilan riwayat tes berbayar & status Season Pass di profil user. |
| **Sertifikat & Verifikasi Publik** | `GET /api/results/:resultId/certificate`<br>`GET /api/verify/certificate/:certificateId` | Render PDF di peramban klien (`jspdf` dynamic import) di [ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx) dan halaman publik verifikasi sertifikat. |
| **Instant Redis Leaderboard** | `GET /api/tests/:testId/leaderboard` | Komponen `LeaderboardDrawer.tsx` dengan medali Top 3 dan posisi ranking user (< 5ms). |

> 📖 **Spesifikasi Rute & Kontrak Lengkap:** Lihat [ARCHITECTURE_AND_SCHEMA.md](file:///home/sans/coding/quiz_app/ARCHITECTURE_AND_SCHEMA.md).



---

### 📈 FASE P2: Engagement & Marketplace (Fokus Sprint 3 - 4)

#### 4. Diagnostic Weakness Heatmap
* **Backend (BE)**: Analisis per-subtopik butir soal yang salah (`SELECT sub_topic, COUNT(*) ...`) dan simpan di kolom JSONB `results.category_breakdown`.
* **Frontend (FE)**: Komponen radar chart atau bar chart interaktif di [ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx) yang menunjukkan kekuatan dan kelemahan sub-materi peserta beserta rekomendasi belajar.

#### 5. Creator Monetization & Marketplace Listing
* **Backend (BE)**: Tambahkan kolom `price_idr` di tabel `tests` dan tabel `creator_balances`. Otomatis potong fee platform 20%–30% saat pembayaran berhasil.
* **Frontend (FE)**: Tambahkan toggle *"Modul Berbayar"* dan input harga di [TestCreatorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestCreatorModal.tsx), serta panel dompet penarikan dana (*Payout Dashboard*) di [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx).

#### 6. Bulk Import Soal Massal (Excel / Word / CSV)
* **Backend (BE)**: Endpoint `POST /api/admin/tests/import-csv` yang mem-parsing multipart file CSV/Excel dan memvalidasinya menggunakan `dto.ValidateRelational()`.
* **Frontend (FE)**: Komponen `BulkImportModal.tsx` dengan fitur unduh template file `.csv` / `.xlsx` contoh dan live preview tabel sebelum disimpan.

---

### 🛡️ FASE P3: Keamanan Ujian & Fitur Institusi (Fokus Sprint 5)

#### 7. Anti-Cheat Focus Mode
* **Backend (BE)**: Simpan log pelanggaran `blur_count` dan `copy_attempts` di database `test_submissions`.
* **Frontend (FE)**: Pasang event listener `window.onblur` pada [TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx) dengan batas toleransi 3 kali peringatan, kunci mode fullscreen, dan disable fungsi `contextmenu` serta shortcut `Ctrl+C`.

#### 8. Streaming AI Question Generator (SSE)
* **Backend (BE)**: Implementasikan Server-Sent Events (`c.Stream()`) dengan header `Content-Type: text/event-stream`.
* **Frontend (FE)**: Menggunakan `fetch-event-source` di [AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx) untuk me-render butir soal satu per satu secara langsung saat dihasilkan model LLM.

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

### 📋 Checklist Wajib Frontend (React + Bun)
| Kategori | Potensi Technical Debt | Standar Solusi Anti-Debt |
|---|---|---|
| **Server State Hygiene** | Duplikasi data `useQuery` ke dalam `useState` | **Dilarang menyalin data server**. Konsumsi langsung `data` atau gunakan `useMemo` untuk derived filtering. |
| **Timer & Polling Leaks** | `setInterval` manual di `useEffect` tidak di-clear | Gunakan `refetchInterval` bawaan TanStack Query yang otomatis berhenti saat modal tutup atau status `settled`. |
| **Bundle Bloat** | Import statis pustaka PDF / Chart membengkakkan bundle > 500kB | Gunakan dynamic import `await import('jspdf')` atau `React.lazy()` hanya saat tombol aksi diklik. |
| **Form Integrity** | Validasi manual rentan bug & mutasi nested object | Gunakan skema **Zod** di [src/schemas/](file:///home/sans/coding/quiz_app/frontend/src/schemas/) dan manipulasi list opsi via **`useFieldArray`**. |
| **Rendering Performance** | Timer ujian per detik me-render ulang seluruh halaman | Simpan countdown di **Zustand** ([useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts)) dan konsumsi via atomic selector (`s => s.secondsLeft`). |
| **Design Consistency** | Arbitrary hex color liar (`#3f21a8`) merusak tema | Gunakan token semantik CSS sesuai [style.md](file:///home/sans/coding/quiz_app/style.md) (`bg-slate-950`, `text-indigo-400`, `border-slate-800`). |

