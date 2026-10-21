# 📋 TestHub Project Handover & Session Memory Notes

> **Dokumen Transisi Sesi & Catatan Kelanjutan untuk AI Agent / Developer Selanjutnya**  
> Tanggal Pembaruan: **21 Oktober 2026**  
> Status Repositori: **Production Grade (Clean Architecture + CodeGraph-Indexed, 100% Tests Passing)**  
> Tech Stack: **Go 1.22+ (Gin, sqlx, PostgreSQL 15, Redis 7)** + **React 19 (TypeScript, Bun/Vite, Tailwind v3)**

---

## 1. Ringkasan Pekerjaan Sesi Terakhir (Recent Session Changelog)

Pada sesi terakhir sebelum penghapusan percakapan ini, beberapa pembenahan krusial arsitektur, bug logging, timezone, serta integrasi data riil telah diselesaikan secara menyeluruh:

### A. Refaktorisasi Arsitektur Helper Jejak Audit (`internal/helpers/audit.go`)
- **Masalah Sebelumnya**: Fungsi `logAudit` didefinisikan secara redundan langsung di dalam file handler (`payment.go`, `media.go`, dll) yang melanggar Clean Architecture dan anti-technical-debt principle.
- **Solusi**: Dibuat package terpusat `testhub/internal/helpers` dengan fungsi tunggal `helpers.LogAudit(c *gin.Context, testRepo repository.TestRepository, action, resType, resID, oldVal, newVal string)`.
- **Cakupan Logging Krusial**:
  - Payment Midtrans: `payment_invoice_created`, `payment_invoice_settled`, `payment_webhook_processed`.
  - AI Engine: `ai_generate_success`, `ai_generate_fallback`, `ai_grade_essay`.
  - Tryout & Sesi: `test_session_started`, `test_exam_completed`, `test_paywall_blocked`.
  - Admin Bank Soal: `create_test`, `toggle_publish`, `update_test`, `delete_test`.

### B. Standardisasi Zona Waktu (WIB / Asia/Jakarta)
- **Masalah Sebelumnya**: Tampilan waktu log di frontend sempat berbeda dengan waktu lokal (UTC vs WIB).
- **Solusi**:
  - Diberlakukan parameter `timezone=Asia/Jakarta` pada DSN PostgreSQL di `internal/database/db.go`.
  - Seluruh timestamp di-format ISO 8601 / RFC 3339 dengan preservasi offset lokal, serta frontend memformat tanggal menggunakan locale `id-ID`.

### C. Eliminasi 100% Mock / Fake Placeholder di Homepage (Real Backend Data)
- **Masalah Sebelumnya**: Di `HomePage.tsx` terdapat angka palsu statis (`184 peserta sedang simulasi sekarang` dan `14.800+ pejuang NIP & PTN bulan ini`). Selain itu, badge `TRYOUT AKBAR MINGGU INI` hanya hardcoded pada indeks ke-0.
- **Solusi Terpasang**:
  1. **Backend Endpoint (`GET /api/public/stats` & `GET /api/public/live-stats`)**:
     - Menghitung sesi simulasi aktif riil (`test_sessions.is_active = true AND expires_at > NOW()`).
     - Menghitung akumulasi penyelesaian ujian bulanan & total dari tabel `test_results`.
     - Dilengkapi **Redis Read-Through Caching** (TTL 30 detik) dan invalidasi otomatis saat peserta memulai atau menyelesaikan ujian.
  2. **Enrichment Katalog Tryout (`GET /api/tests`)**:
     - Query SQL di `exam_repository.go` diperkaya dengan agregasi subquery ke `test_results` untuk menyediakan `total_takers`, `pass_rate_percentage`, dan dynamic `is_flagship` (berdasarkan tryout dengan peserta terbanyak).
  3. **Frontend Integration**:
     - `HomePage.tsx` memanggil `testsApi.getPublicStats()` menggunakan TanStack Query dengan auto-refetch tiap 30 detik untuk menjaga denyut "Live Social Pulse" tetap riil.
     - Kartu katalog menampilkan metrik sosial riil `{test.total_takers} Peserta`.
     - `AhaMomentSection.tsx` menerima `totalExaminees` aktual untuk menghitung persentil kurva ranking nasional secara proporsional.
  4. **Pembaruan [`SPRINT_NOTES.md`](file:///home/sans/coding/quiz_app/SPRINT_NOTES.md)**:
     - Tiket **BE-HP-01**, **BE-HP-02**, **BE-HP-03** ditandai `✅ Selesai`.
     - Tiket **FE-HP-01**, **FE-HP-03**, **FE-HP-04** diperbarui statusnya dari "Pure FE Mock" menjadi "Real Data Integrated".

### D. Tooling Manajemen Migrasi & Reset Database (`make migrate-fresh` & `make migrate-refresh`)
- **Masalah Sebelumnya**: CLI `go run cmd/migrate/main.go down` mengabaikan argumen CLI dan tidak melakukan drop tabel sehingga skema database tidak pernah ter-reset bersih saat pengujian.
- **Solusi**:
  - `backend/internal/database/db.go`: Mengimplementasikan `DropAllTables()` yang mengeksekusi `DROP TABLE IF EXISTS ... CASCADE` pada seluruh 10 tabel.
  - `backend/cmd/migrate/main.go`: Mendukung argumen CLI `up`, `down`/`drop`/`reset`, dan `fresh`/`refresh`.
  - `Makefile`: Menambahkan target `migrate-refresh` dan `migrate-fresh` (termasuk pendaftaran di `.PHONY`) untuk drop schema, migrasi ulang dari awal (`001`–`004`), dan auto-seed katalog kuis.

### E. AI Question Generator: Kustomisasi Prompt Input (`CustomPrompt`)
- **Masalah Sebelumnya**: Sintesis butir soal AI hanya mengandalkan topik umum tanpa fleksibilitas instruksi khusus dari pengajar.
- **Solusi**:
  - DTO Backend `models.GenerateQuestionsDTO` & `services/ai_agent.go`: Mendukung field `custom_prompt` yang diinjeksikan secara aman ke system prompt Gemini / Groq.
  - Frontend `AIAssistantModal.tsx` & `ai.api.ts`: Menyediakan input textarea instruksi tambahan (misal: "fokus pada silogisme analitis 3 premis") dengan indikator karakter.

### F. Idempotensi Transaksi Pembayaran & Pre-Payment Access Guard
- **Solusi**:
  - Klien Frontend (`payments.api.ts`) menyertakan header `Idempotency-Key` (UUIDv4) pada setiap request `createInvoice`.
  - Handler Backend (`payment.go`) membaca header `Idempotency-Key`, mengembalikan invoice pending aktif yang belum kedaluwarsa alih-alih membuat tagihan ganda (*pending reuse*), serta menolak pembelian ulang jika akun sudah memiliki modul tersebut (`already_subscribed: true`).

### G. Optimasi Bundle Frontend (Code-Splitting 26 Chunks & Zero Dead Code)
- **Solusi**:
  - Berkas tiruan lama `mockData.ts` (26 KB dead code) telah dihapus permanen.
  - Rute halaman di `App.tsx` dipecah dinamis menggunakan `React.lazy()` dan `<Suspense>`.
  - Ukuran bundle JavaScript awal terpangkas dari **687 kB** menjadi **266 kB** (gzip ~81 kB) tanpa peringatan Vite chunk size.

### H. AI Resilience, Dynamic Token Sizing (8.192 Tokens), & AI Essay Auto-Grader
- **Masalah Sebelumnya**:
  - Gemini 2.5 Flash menghasilkan ~2.800 *thinking tokens* yang menghabiskan batas kuota output lama (3.000 tokens), sehingga kandidat teks JSON terpotong di tengah jalan (`finishReason: MAX_TOKENS`) dan memicu error `unexpected end of JSON input`.
  - Groq berhenti pada butir soal ke-8 karena batas 3.000 tokens tidak mencukupi untuk 10 butir soal lengkap berbahasa Indonesia (5 opsi A-E + pembahasan ilmiah mendalam).
- **Solusi Terpasang**:
  1. **Dynamic Token Sizing**: Formula dinamis `maxTokens := clamp(2048, req.Count * 650 + 2500, 8192)` untuk Gemini dan `clamp(2048, req.Count * 650 + 1000, 8192)` untuk Groq. Mengantisipasi thinking tokens tanpa memotong output JSON (terverifikasi menghasilkan 10 soal penuh).
  2. **Auto-Complement Fallback Guardrail**: Jika LLM hanya mengembalikan sebagian soal (misal 8 dari 10), fungsi `ensureQuestionCount` otomatis menggenapi sisa butir soal via bank kurasi lokal deterministik.
  3. **AI Essay Auto-Grader Engine (`POST /api/ai/grade-essay`)**: Multi-tier resilient engine (Gemini 2.5 Flash $\rightarrow$ Groq LLaMA $\rightarrow$ Heuristic Rubric Engine) menilai esai berdasarkan 3 kriteria: Substansi & Teori (40), Analisis Kritis (30), dan Sistematika Argumen (30).
  4. **Frontend Workbench Integration**: Terintegrasi pada [`EssayGradingView.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/EssayGradingView.tsx) dengan tombol `✨ Nilai Otomatis dengan AI`, kartu detail rubrik 3 dimensi, dan auto-populasi skor + catatan instruktur yang tetap dapat diedit sebelum disimpan.

---

## 2. Status Terkini Seluruh Modul Proyek (Current System State)

| Area / Modul | Status | Lokasi Berkas Kunci | Catatan Teknis & Arsitektur |
|---|:---:|---|---|
| **Executive Admin Cockpit** | ✅ Selesai | [`AdminPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx), [`AdminOverview.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AdminOverview.tsx) | Segmented Control Switcher berlatar canvas, live pulse status, metrik riil PostgreSQL. |
| **Bank Soal & Ujian** | ✅ Selesai | [`TestManagement.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestManagement.tsx) | Debounced search 250ms, filter kategori/status, quick toggle publish dengan audit logging. |
| **Koreksi Esai & AI Grader** | ✅ Selesai | [`EssayGradingView.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/EssayGradingView.tsx), [`ai_agent.go`](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go) | Antrean esai, AI Essay Auto-Grader 3-rubrik (Gemini/Groq/Heuristic), auto-fill skor & feedback, shared pagination. |
| **Manajemen Pengguna** | ✅ Selesai | [`UserManagement.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/UserManagement.tsx) | Terhubung ke endpoint backend `GET /api/admin/users`, `PATCH /status`, `PUT /role`. Dialog konfirmasi keamanan via `useConfirm`. |
| **Jejak Audit Keamanan** | ✅ Selesai | [`AuditLogView.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AuditLogView.tsx), [`audit.go`](file:///home/sans/coding/quiz_app/backend/internal/helpers/audit.go) | Centralized audit logger helper, visual JSON diff, filter tipe resource, timezone Asia/Jakarta. |
| **Manajemen Langganan** | ✅ Selesai | [`SubscriptionManagement.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/SubscriptionManagement.tsx) | Manual grant akses, perpanjangan masa aktif (`extend`), dan revoke berbayar. |
| **Payment Gateway & Idempotency** | ✅ Selesai | [`payment.go`](file:///home/sans/coding/quiz_app/backend/internal/handlers/payment.go), [`payments.api.ts`](file:///home/sans/coding/quiz_app/frontend/src/services/payments.api.ts) | Exactly-once invoice creation dengan `Idempotency-Key` (UUIDv4), pending invoice reuse, pre-payment access check. |
| **AI Question Assistant** | ✅ Selesai | [`ai_agent.go`](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go), [`AIAssistantModal.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx) | 3-tier fallback engine, dukungan `CustomPrompt`, alokasi dinamis 8.192 tokens, streaming skeleton, auto-complement. |
| **Tooling Migrasi & DB Reset** | ✅ Selesai | [`Makefile`](file:///home/sans/coding/quiz_app/Makefile), [`main.go`](file:///home/sans/coding/quiz_app/backend/cmd/migrate/main.go), [`db.go`](file:///home/sans/coding/quiz_app/backend/internal/database/db.go) | `make migrate-fresh` & `make migrate-refresh` dengan `DropAllTables()` (CASCADE) dan auto-seed. |
| **Homepage CRO & Real Data** | ✅ Selesai | [`HomePage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx), [`AhaMomentSection.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/home/AhaMomentSection.tsx) | Real live social pulse (30s polling), dynamic flagship module, real participant metrics, transparent pricing badges, risk reversal FAQ. |
| **Standard Paginasi & Debounce** | ✅ Selesai | [`usePagination.ts`](file:///home/sans/coding/quiz_app/frontend/src/hooks/usePagination.ts), [`useDebounce.ts`](file:///home/sans/coding/quiz_app/frontend/src/hooks/useDebounce.ts), [`Pagination.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/Pagination.tsx) | Zero-dependency, format `tabular-nums`, ukuran per halaman dinamis. |

---

## 3. Peta Dokumen & Arsitektur Acuan

1. **[`SYSTEM_ARCHITECTURE.md`](file:///home/sans/coding/quiz_app/SYSTEM_ARCHITECTURE.md)**:
   - Single source of truth arsitektur backend, skema database (`001`, `002`, `003`, `004`), topologi Nginx/Docker, threat model, dan 3-tier resilient AI fallback engine (Gemini Flash -> Groq -> Local Deterministic Generator).
2. **[`FRONTEND_ARCHITECTURE.md`](file:///home/sans/coding/quiz_app/FRONTEND_ARCHITECTURE.md)**:
   - Panduan React 19, standard state management (TanStack Query v5 + Zustand v5 selector isolation), form hardening, dan SOP pencegahan technical debt.
3. **[`style.md`](file:///home/sans/coding/quiz_app/style.md)**:
   - Filosofi *Tasteful Cognitive-Calm*.
   - Strict Tri-Color palette (`--bg-canvas`, `--surface-card`, `--color-accent`, `--text-ink`, `--text-muted`, `--border-subtle`).
   - Micro-interaction mandatory utilities: `.btn-press`, `.focus-ring`, `tabular-nums`.
4. **[`SPRINT_NOTES.md`](file:///home/sans/coding/quiz_app/SPRINT_NOTES.md)**:
   - Catatan backlog aktif dan status implementasi homepage CRO.

---

## 4. Titik Integrasi Penting (Pointers for Next Sessions)

### A. Rute & Backend Handlers (`backend/internal/handlers/routes.go`)
- **Publik**:
  - `GET /api/public/stats` & `GET /api/public/live-stats`: Statistik publik real-time (peserta aktif, total peserta bulanan, total modul).
  - `GET /api/tests`: Katalog modul ujian aktif (diperkaya metrik `total_takers`, `pass_rate_percentage`, `is_flagship`).
  - `GET /api/tests/:testId/leaderboard`: Papan peringkat publik.
  - `POST /api/tests/:testId/start`: Memulai sesi ujian (menolak HTTP 402 jika modul berbayar tanpa langganan/invoice).
  - `GET /api/results/:resultId/certificate` & `GET /api/verify/certificate/:id`: Verifikasi QR sertifikat nilai.
  - `POST /api/ai/generate-questions` & `POST /api/ai/grade-essay`: Asisten generator butir soal AI dan koreksi esai otomatis.
- **Admin**:
  - `GET /api/admin/stats`: Metrik agregat konsol admin.
  - `GET /api/admin/tests`, `POST /tests`, `PUT /tests/:id`, `DELETE /tests/:id`, `POST /tests/:id/toggle-publish`: Manajemen bank soal.
  - `GET /api/admin/essays`, `POST /essays/:id/grade`, `POST /essays/ai-grade`: Koreksi lembar esai manual & AI Essay Auto-Grader.
  - `GET /api/admin/users`, `PATCH /users/:id/status`, `PUT /users/:id/role`: Manajemen otorisasi pengguna.
  - `GET /api/admin/audit-logs`: Audit trail sistem.
  - `GET /api/admin/subscriptions`, `POST /manual-grant`, `PUT /:id/status`, `DELETE /:id/revoke`: Monetisasi & langganan.

### B. Aturan Penulisan Kode (Architectural Rules for AI Agent / Dev)
1. **Helper Terpusat**: Jangan pernah menaruh fungsi utilitas umum (seperti audit log, JWT parsing, formatters) langsung di dalam file handler Gin. Selalu letakkan di `backend/internal/helpers/`.
2. **Zero Mocks di Frontend**: Seluruh data wajib bersumber dari endpoint Go backend.
3. **Optimasi Query Database**: Jika membutuhkan agregasi metrik (seperti total peserta, status lulus), gunakan subquery join atau window function SQL di repository agar tidak terjadi query N+1.
4. **Read-Through Caching**: Gunakan Redis cache untuk endpoint publik dengan traffic tinggi (`public:stats`, `tests:catalog:*`), serta lakukan invalidasi cache tepat saat mutasi terjadi.

---

## 5. Perintah Operasional & Verifikasi Cepat

Untuk memverifikasi kesehatan kode sebelum atau sesudah melakukan perubahan:

```bash
# 1. Menjalankan test suite Go Backend (E2E & Unit Tests)
cd /home/sans/coding/quiz_app/backend && go test -v ./tests/...

# 2. Menjalankan & memverifikasi build Frontend (TypeScript + Vite)
cd /home/sans/coding/quiz_app/frontend && bun run build

# 3. Navigasi instan via CodeGraph (Gunakan ini alih-alih grep manual)
codegraph explore "GetPublicStats"
codegraph explore "SetupRouter"
codegraph explore "UserManagement"
codegraph explore "AhaMomentSection"
```

---

## 6. Rekomendasi Langkah Selanjutnya (Future Roadmap)

Jika ingin melanjutkan ke pengembangan fitur baru berikutnya:
1. **Peluang Fitur A (Bulk Import Soal via Excel/Word)**:
   - Backend: endpoint `POST /api/admin/tests/:testId/import-questions` dengan pustaka `github.com/xuri/excelize/v2`.
   - Frontend: Komponen modal upload spreadsheet di `TestManagement.tsx`.
2. **Peluang Fitur B (Item Response Theory / IRT Scoring)**:
   - Backend: Ekstensi algoritma pembobotan 2PL di `backend/internal/services/scoring.go`.
3. **Peluang Fitur C (Anti-Cheat Web Proctoring Suite)**:
   - Frontend: Tab switch counter, fullscreen detector, dan copy-paste restriction saat ujian berlangsung di `TestPage.tsx`.
4. **Peluang Fitur D (Computerized Adaptive Testing / CAT Dinamis)**:
   - Backend: Algoritma penyajian butir soal adaptif sesuai performa jawaban sebelumnya.

