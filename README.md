# 🎯 TestHub - Production Testing & Assessment Platform

TestHub adalah platform SaaS modern untuk pembuatan, pelaksanaan, dan analitik berbagai tipe ujian (CPNS, SBMPTN, IQ, dan Custom BUMN) dengan scoring otomatis, manajemen esai, evaluasi berbasis AI, dan performa tinggi (target 100K users).

---

## 📚 Indeks Dokumentasi

Semua dokumentasi arsitektur, panduan teknis, dan keamanan disimpan dalam file markdown berikut:

1. [IMPLEMENTATION_AND_CODE.md](file:///home/sans/coding/quiz_app/IMPLEMENTATION_AND_CODE.md)  
   **Status implementasi aktif**, Developer Extension Guide, dan **Audit Technical Debt Backend (Validasi, Rate Limiter, AI Fallback)**.
2. [PRODUCT_REQUIREMENTS_DOCUMENT.md](file:///home/sans/coding/quiz_app/PRODUCT_REQUIREMENTS_DOCUMENT.md)  
   **Deskripsi produk (PRD)**, analisis kebutuhan pengguna (siswa/guru/admin), strategi profitabilitas tinggi (QRIS/Season Pass/Komisi Marketplace), dan roadmap prioritas.
3. [ARCHITECTURE_AND_SCHEMA.md](file:///home/sans/coding/quiz_app/ARCHITECTURE_AND_SCHEMA.md)  
   Diagram arsitektur sistem, skema relasional database PostgreSQL, caching strategy Redis, dan spesifikasi API.
4. [AI_AGENT_AND_SECURITY.md](file:///home/sans/coding/quiz_app/AI_AGENT_AND_SECURITY.md)  
   Aturan prompt deterministik AI Question Generator, validasi kualitas soal, proteksi form non-auth, dan threat model keamanan.
5. [DEPLOYMENT_AND_MAKEFILE.md](file:///home/sans/coding/quiz_app/DEPLOYMENT_AND_MAKEFILE.md)  
   Panduan orkestrasi Makefile, Docker Compose, skrip backup, health check, dan panduan scaling VPS 2GB.
6. [FRONTEND_ARCHITECTURE.md](file:///home/sans/coding/quiz_app/FRONTEND_ARCHITECTURE.md)  
   **Arsitektur Frontend & State Management**: Standar React 19, TanStack Query v5, Zustand v5, Zod Runtime Validation, React Hook Form, dan modular API services.
7. [style.md](file:///home/sans/coding/quiz_app/style.md)  
   **Sistem Desain & Panduan Visual**: Strict Tri-Color palette per mode, CSS variables, Tailwind tokens, dan checklist anti-AI-slop.

---

## ⚡ Status Fitur Terimplementasi (Update Terkini: Okt 2026)

### 1. Backend Service (Go / Golang)
- **Teknologi:** Go 1.22+, Gin Web Framework, PostgreSQL (`sqlx` + `lib/pq`), Redis (`go-redis/v9` dengan in-memory fallback), JWT (`golang-jwt/v5`), Bcrypt.
- **Autentikasi & Otorisasi:**
  - Registrasi & Login Admin/Quiz Creator dengan JWT Token (`/api/auth/register`, `/api/auth/login`).
  - Proteksi middleware role `admin` & `creator`.
- **Alur Pelaksanaan Ujian (Non-Auth / Anonim):**
  - Pembuatan sesi instan token (`sess-xxx`) tanpa registrasi awal (`POST /api/tests/:testId/start`).
  - Pengambilan bank soal dengan perlindungan integritas (kunci jawaban `is_correct` dan pembahasan di-strip saat ujian aktif) (`GET /api/sessions/:sessionId/questions`).
  - Penyimpanan progres jawaban real-time (`POST /api/sessions/:sessionId/submit-answer`).
  - Penyelesaian ujian & kalkulasi hasil otomatis (`POST /api/sessions/:sessionId/finish`).
- **Sistem Penilaian & Analitik:**
  - Auto-grading pilihan ganda seketika.
  - Antrean review esai manual (`GET /api/admin/essays`, `POST /api/admin/essays/:essayId/grade`).
  - Evaluasi performa per kategori (Penalaran, Pemahaman, Ketelitian).
  - Estimasi persentil performa terhadap seluruh peserta.
- **AI Question Generator:**
  - Endpoint `POST /api/ai/generate-questions` aktif.
  - Sintesis topik berstandar nasional: CPNS (TWK/TIU), SBMPTN (TPS/Matematika), IQ (Raven Matrices/Spasial), BUMN (AKHLAK/Leadership).
  - Validasi otomatis (1 kunci jawaban benar, 3-4 distractor, panjang pilihan seimbang, penjelasan ilmiah).
- **Keamanan & Skalabilitas:**
  - Rate limiting per IP dan sesi (anti brute-force / spam submission).
  - Structured JSON logging.
  - Connection pooling PostgreSQL & resilient caching.
- **Pengujian:**
  - Test suite integrasi di `backend/tests/api_test.go` (100% PASS).

### 2. Frontend Web (React + Bun)
- **Teknologi:** React 19, Vite 8, Bun `v1.4.2`, TypeScript, TanStack Query v5, Zustand v5, React Hook Form v7, Zod, Tailwind CSS, Lucide Icons.
- **Tampilan Antarmuka & Fitur:**
  - Beranda pencarian & filter kategori tes dengan query caching dan `AbortSignal` debounce.
  - Halaman ujian terisolasi 60 FPS (Zustand session store) tanpa timer re-render drift.
  - Halaman hasil komprehensif: Skor total, status kelulusan, persentil, kartu breakdown kategori, dan ulasan pembahasan soal.
  - Dashboard Pengajar Terproteksi (RBAC) dengan mutasi terarah TanStack Query dan cache invalidation spesifik.
  - **Formulir Pembuatan & Edit Ujian Terstandarisasi (`TestCreatorModal.tsx`, `TestEditorModal.tsx`, `QuestionFormField.tsx`)**: Didukung React Hook Form + Zod (`test.schema.ts`) + `useFieldArray` bebas mutasi nested array.
  - **Upload Media Gambar Soal (`MediaUploader.tsx`)**: Unggah gambar (maks 2MB) terhubung ke `POST /api/admin/upload-media` dengan preview instan.
  - **AI Question Assistant Modal (`AIAssistantModal.tsx`)**: Integrasi Gemini 2.5 Flash / Groq OSS dengan kurva progres persentase dinamis (0–100%) dan multi-card shimmer skeleton loader.
  - **Universal Toast & Confirmation Modal (DRY)**: Sistem notifikasi dan dialog konfirmasi modern dengan efek `backdrop-blur-md` dan keyboard accessibility (`Esc`/`Enter`).
  - **Arsitektur API Modular**: Centralized `client.ts` tanpa database mock tiruan di client. Fail-fast error handling terpusat.

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### Prasyarat
- Go 1.22+
- Node.js 18+ atau Bun
- PostgreSQL (default port: 5432) & Redis (port: 6379, opsional karena backend memiliki in-memory fallback)

### 1. Setup Backend & Database
```bash
# Clone dan masuk ke folder project
cd quiz_app

# Setup otomatis (buat .env, jalankan migrasi, dan seed katalog tes)
make setup

# Jalankan server backend (berjalan di http://localhost:8000)
make dev
```

### 2. Jalankan Frontend
```bash
# Opsi 1: Menggunakan Makefile dari root
make dev-frontend

# Opsi 2: Manual via Bun
cd frontend
bun run dev
# Buka http://localhost:5173 atau http://localhost:3000 di browser
```

### 3. Akun Admin Default
- **Email:** `admin@testhub.com` (atau `admin@testhub.id`)
- **Password:** `AdminPassword123!` (atau `admin123`)

---

## 🛠️ Panduan Ekstensi Fitur Baru untuk AI Agent / Developer

Jika ingin mengembangkan fitur baru, ikuti panduan Clean Architecture berikut:

```
Alur Penambahan Fitur:
1. Migrasi DB      -> backend/migrations/00X_nama_fitur.sql
2. Model & DTO     -> backend/internal/models/models.go
3. Business Logic  -> backend/internal/services/nama_service.go
4. HTTP Handler    -> backend/internal/handlers/nama_handler.go
5. Registrasi Rute -> backend/internal/handlers/routes.go
6. Unit Test       -> backend/tests/api_test.go
7. Integrasi UI    -> frontend/src/services/client.ts & domain services
```

> 📖 **Detail lengkap langkah-demi-langkah beserta contoh kode:** Lihat Bagian 2 di [IMPLEMENTATION_AND_CODE.md](file:///home/sans/coding/quiz_app/IMPLEMENTATION_AND_CODE.md).
