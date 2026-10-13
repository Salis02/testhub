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

Berdasarkan audit mendalam arsitektur Go backend, seluruh area perbaikan teknis non-AI telah diselesaikan dengan standar *Production-Grade & Long-term Maintainability*:

### 5.1 Validasi Request: DTO Terpusat & Relasional ✅ (RESOLVED)
- **Status**: **RESOLVED** (`backend/internal/models/dto.go` & `backend/internal/validator/validator.go`).
- **Implementasi**:
  - DTO terpusat `SaveTestDTO`, `QuestionDTO`, `OptionDTO` dengan struct tags `validator/v10` (`min`, `max`, `oneof`).
  - Validasi relasional mendalam via `dto.ValidateRelational()`: Memverifikasi soal pilihan ganda wajib memiliki minimal 2 opsi dan **tepat 1 opsi benar**.
  - Error Normalizer: Mengembalikan format JSON terstruktur (`{"error": "...", "details": {"field": "..."}}`) dengan pesan bahasa Indonesia yang ramah pengguna.

### 5.2 Rate Limiter: Atomic Redis Lua & In-Memory Janitor ✅ (RESOLVED)
- **Status**: **RESOLVED** (`backend/internal/cache/redis.go` & `backend/internal/middleware/ratelimit.go`).
- **Implementasi**:
  - **Redis Mode**: Menggunakan atomic Lua script (`INCR` + `EXPIRE` dalam 1 evaluasi atomik). Menghilangkan race condition dan mencegah munculnya zombie key tanpa TTL.
  - **In-Memory Mode**: Setiap entri melacak `rateLimitEntry{count, expiresAt}`. Jika jendela waktu (window) telah lewat, counter otomatis di-reset ke 1.
  - **Janitor Goroutine**: Background ticker aktif (setiap 30 detik) yang menyapu dan menghapus entri kadaluarsa, mencegah memory leak saat melayani 100K+ concurrent users.

### 5.3 AI Service: Arsitektur 3-Tier & Catatan Fallback Hardcode (Tracked for Sprint AI)
- **Kondisi Saat Ini**:
  - [ai_agent.go](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go) memiliki arsitektur 3-tier cascade:
    1. *Tier 1*: Google Gemini 2.5 Flash (via REST API dengan multi-key failover).
    2. *Tier 2*: Groq Llama 3.3 / OSS (jika Gemini 429/gagal).
    3. *Tier 3*: Local Deterministic Generator (Zero-Downtime fallback saat API key kosong/kuota habis).
  - **Catatan**: Fallback lokal dan response parsing dipertahankan stabil saat ini (*Do not modify yet*), dijadwalkan untuk dipindahkan ke seed database eksternal dan response streaming SSE pada sprint AI mendatang.

### 5.4 Pemisahan Layer: Repository Pattern ✅ (RESOLVED)
- **Status**: **RESOLVED** (`backend/internal/repository/test_repository.go`).
- **Implementasi**:
  - Dibuat interface `TestRepository` dan implementasi `PostgresTestRepository`.
  - Seluruh query dan transaksi database (`tx.BeginTxx()`) diisolasi penuh di dalam Repository Layer.
  - [AdminHandler](file:///home/sans/coding/quiz_app/backend/internal/handlers/admin.go) kini murni berfungsi sebagai HTTP controller tanpa orkestrasi SQL mentah, sangat modular dan mudah di-mocking untuk unit testing.

### 5.5 Sanitasi Pesan Error (Information Disclosure) ✅ (RESOLVED)
- **Status**: **RESOLVED** (`backend/internal/handlers/admin.go`).
- **Implementasi**:
  - Seluruh kegagalan database dan query internal dicatat ke log server backend (`log.Printf`) dengan konteks lengkap untuk observabilitas developer.
  - Respon yang dikembalikan ke client dibersihkan dari raw PostgreSQL string (mengembalikan pesan aman seperti *"Gagal menyimpan modul ujian ke database"*), mencegah kebocoran skema tabel dan constraint database.

---

## 6. Roadmap Fitur Berbasis ROI & Catatan Teknis untuk Tim FE & BE

Prioritas pengembangan fitur baru disusun berdasarkan rasio keuntungan bisnis (*high profit*) terhadap kompleksitas teknis (lihat [PRODUCT_REQUIREMENTS_DOCUMENT.md](file:///home/sans/coding/quiz_app/PRODUCT_REQUIREMENTS_DOCUMENT.md)):

---

### 🚀 FASE P1: Revenue & Virality (Fokus Sprint 1 - 2)

#### 1. Multi-Endpoint Payment Gateway (Midtrans / Xendit) & Admin Subscription Manual Override
* **Target Bisnis**: Monetisasi langsung per modul tryout (Rp 10.000–Rp 25.000), Season Pass (Rp 49.000–Rp 99.000), serta fleksibilitas admin mengelola langganan secara manual (transaksi offline, B2B deal, atau kompensasi).
* **Arsitektur Multi-Endpoint Backend (BE)**:
  1. **User / Public Endpoints**:
     - `POST /api/payments/create-invoice`: Generate QRIS dynamic / Snap token via Midtrans atau Xendit API. Request payload: `{ test_id?: string, plan_type: "per_test" | "season_pass", user_email: string }`.
     - `GET /api/payments/status/:orderId`: Endpoint polling ringan bagi frontend untuk memantau status settlement tanpa perlu webhooks di localhost.
     - `POST /api/payments/webhook`: Webhook listener idempoten dengan verifikasi signature cryptographic (HMAC-SHA512). Mengubah status order menjadi `settled` dan otomatis menerbitkan entri akses di database.
  2. **Admin Manual Management Endpoints (Bypass / Manual Override)**:
     - `POST /api/admin/subscriptions/manual-grant`: Memberikan akses/subscription secara manual kepada user (untuk pembayaran transfer bank manual/offline, voucher khusus, atau deal institusi).
       - Payload: `{ user_identifier: string, test_id?: string, plan_type: "per_test" | "season_pass" | "lifetime", valid_days: number, reason_notes: string }`.
     - `PUT /api/admin/subscriptions/:id/status`: Mengubah status subscription (misal: `active`, `suspended`, `expired`) atau memperpanjang masa aktif (`extend_days`).
     - `DELETE /api/admin/subscriptions/:id/revoke`: Mencabut akses secara manual jika terjadi refund atau penyalahgunaan.
     - `GET /api/admin/subscriptions`: Menampilkan seluruh daftar subscription dengan filter status (`active`, `expired`), sumber aktivasi (`gateway_midtrans`, `gateway_xendit`, `admin_manual`), dan pencarian user.
  3. **Middleware Akses Tes**:
     - `RequireTestAccess()`: Mengecek apakah modul tes gratis (`price_idr == 0`) atau user memiliki subscription aktif (`valid_until > NOW()`) sebelum mengizinkan `POST /api/tests/:testId/start`.
  4. **Skema Database**:
     - Tabel `subscriptions` / `orders`:
       ```sql
       CREATE TABLE subscriptions (
           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
           user_identifier VARCHAR(255) NOT NULL, -- email atau session UUID
           test_id VARCHAR(64) REFERENCES tests(id) ON DELETE CASCADE, -- NULL jika season pass
           tier VARCHAR(32) NOT NULL DEFAULT 'per_test', -- 'per_test', 'season_pass', 'institution'
           status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'expired', 'revoked'
           source VARCHAR(32) NOT NULL DEFAULT 'gateway', -- 'gateway_midtrans', 'gateway_xendit', 'admin_manual'
           admin_notes TEXT, -- alasan grant manual jika via admin
           amount_paid NUMERIC(12,2) DEFAULT 0,
           valid_until TIMESTAMPTZ,
           created_at TIMESTAMPTZ DEFAULT NOW(),
           updated_at TIMESTAMPTZ DEFAULT NOW()
       );
       CREATE INDEX idx_subscriptions_lookup ON subscriptions(user_identifier, test_id, status);
       ```
* **Catatan Teknis Frontend (FE)**:
  1. **Sisi Peserta (User Interface)**:
     - Komponen `PaymentModal.tsx`: Menampilkan dynamic QR Code QRIS, total harga Rupiah, dan countdown kadaluarsa pembayaran 15 menit.
     - Gunakan TanStack Query polling (interval 3 detik ke `GET /api/payments/status/:orderId`) untuk mendeteksi perubahan status pembayaran secara instan dan mengarahkan peserta langsung ke sesi ujian.
     - Tampilkan badge harga yang jelas pada kartu kuis di [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx) (`Gratis` vs `Rp 15.000` / `Premium`).
  2. **Sisi Admin (Admin Subscription Dashboard)**:
     - Komponen `AdminSubscriptionManager.tsx` pada [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx):
       - Form modal **"Grant Akses Manual"**: Input email peserta, pilih modul tes / Season Pass, masukkan jumlah hari aktif, dan kolom wajib *Catatan Alasan Audit* (contoh: "Transfer Manual BCA Bukti #8821", "Akun Bimbel Mitra").
       - Tabel daftar pengguna berlangganan dengan badge warna sumber (`Gateway (Hijau)` vs `Manual Admin (Ungu)`).
       - Tombol aksi cepat: *Perpanjang (+30 Hari)* dan *Revoke Akses* dengan konfirmasi modal.

#### 2. Generator Sertifikat & Report Card PDF
* **Target Bisnis**: Bukti kelulusan resmi & materi pamer media sosial peserta (*viral growth loop* gratis).
* **Catatan Teknis Backend (BE)**:
  - Buat endpoint `GET /api/results/:resultId/certificate`: Mengembalikan data sertifikat ber-UUID verifikasi unik.
  - Halaman/endpoint publik `GET /verify/:certificateId`: Untuk siapa saja yang memindai QR code sertifikat dapat melihat keaslian nilai peserta.
* **Catatan Teknis Frontend (FE)**:
  - Lakukan rendering PDF di sisi peramban klien (menggunakan `@react-pdf/renderer` atau `jspdf` + `html2canvas`) untuk menghemat beban CPU server VPS 2GB.
  - Sediakan tombol `Unduh Sertifikat Resmi (PDF)` di [ResultsPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx) dengan desain elegan bergaris emas/biru sesuai [style.md](file:///home/sans/coding/quiz_app/style.md).

#### 3. Leaderboard & Ranking Nasional Instan
* **Target Bisnis**: Memicu kompetisi dan urgensi peserta (*FOMO*) untuk melihat posisinya di antara ribuan peserta lain.
* **Catatan Teknis Backend (BE)**:
  - Gunakan **Redis Sorted Sets** (`ZADD leaderboard:{testId} score session_id`).
  - Ambil ranking secara instan via `ZREVRANK` dan ambil 50 besar via `ZREVRANGEBYSCORE` (latensi < 5ms tanpa membebani PostgreSQL).
  - Endpoint: `GET /api/tests/:testId/leaderboard?limit=50`.
* **Catatan Teknis Frontend (FE)**:
  - Komponen `LeaderboardDrawer.tsx` atau tab baru pada halaman hasil.
  - Tampilkan medali Top 3, percentile badge, dan card stat posisi user (contoh: *"Peringkat #142 dari 3.420 peserta"*).

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
