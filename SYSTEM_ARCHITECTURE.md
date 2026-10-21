# 🏛️ TestHub System Architecture & Technical Specifications

> **Single Source of Truth untuk Arsitektur Backend, Skema Data, Keamanan, dan Deployment**  
> Status: **Production Grade (Clean Architecture + CodeGraph-Indexed)**  
> Tech Stack: **Go 1.22+ (Gin, sqlx, PostgreSQL 15, Redis 7)** + **React 19 (TypeScript, Bun/Vite)**

---

## 1. Arsitektur Sistem & Topologi

```
   [ Test Takers (Browser) ]       [ Admin / Creator (Browser) ]
               │                                   │
               ▼                                   ▼
        ┌─────────────────────────────────────────────────┐
        │        Nginx Reverse Proxy (:80 / :443)         │
        │  - SSL Termination       - Rate Limiting Zone   │
        │  - Static Asset Cache    - Gzip Compression     │
        └──────────────┬──────────────────┬───────────────┘
                       │                  │
         Static SPA    │                  │  /api/*, /uploads/*
         /index.html   ▼                  ▼
    ┌──────────────────────┐      ┌─────────────────────────┐
    │ React Frontend (Bun) │      │   Go Backend API (:8000)│
    │  - Vite / React 19   │      │   - Gin Web Engine      │
    │  - Tailwind CSS      │      │   - Anonymous Sessions  │
    │  - Lucide Icons      │      │   - Scoring Engine      │
    └──────────────────────┘      └────────────┬────────────┘
                                               │
                       ┌───────────────────────┴──────────────────────┐
                       ▼                                              ▼
         ┌───────────────────────────┐                 ┌───────────────────────────┐
         │     PostgreSQL 15 DB      │                 │      Redis 7 / Memory     │
         │ - Relational Storage      │                 │ - Session Metadata Cache  │
         │ - Connection Pool (20-50) │                 │ - Distributed Rate Limits │
         │ - B-Tree Indexes          │                 │ - In-Memory Fallback      │
         └───────────────────────────┘                 └───────────────────────────┘
```

---

## 2. Skema Relasi Data & Sumber Migrasi

Skema database dikelola melalui migrasi SQL versi terpusat di `backend/migrations/`:
- `001_init.sql`: Entitas utama pengguna (`users`), ujian (`tests`), butir soal (`test_questions`), opsi jawaban (`question_options`), sesi (`test_sessions`), progres jawaban (`test_submissions`), dan hasil ujian (`test_results`).
- `002_subscriptions_and_pricing.sql`: Skema monetisasi, pesanan pembayaran (`orders`), dan langganan aktif (`subscriptions`).
- `003_user_history_and_management.sql`: Riwayat ujian terautentikasi (`user_id` pada `test_sessions` & `test_results`), serta status aktif akun (`users.is_active`).
- `004_fix_audit_log_timezone.sql`: Tabel jejak audit keamanan (`admin_audit_log`) dengan penanganan timezone Asia/Jakarta dan JSON payload snapshot.

### Relasi Entitas Inti
```
users (1) ────────< tests (N) ──────< questions (N) ──< options (N)
   │   │               │    │                 │
   │   │               │    │ (1)             │ (1)
   │   │               │    ▼ (N)             ▼ (N)
   │   │               │  test_sessions (1) ──< test_submissions (N)
   │   │               │    │
   │   │               │    ▼ (1)
   │   └───────────────┼──► test_results (1) (riwayat ujian persisten)
   │                   │
   ▼ (1)               ▼ (N)
orders (N) ────────► subscriptions (N)

admin_audit_log (N)    [Tabel jejak audit terisolasi dengan actor_user_id & payload diff]
```

---

## 3. Workflow Ekstensi Fitur Baru via CodeGraph

Dengan adanya **CodeGraph**, Anda tidak perlu membaca ratusan baris file manual. Cukup jalankan perintah explore untuk menelusuri simbol atau alur yang ingin diperluas:

```bash
# Contoh navigasi instan:
codegraph explore "SetupRouter"              # Melihat seluruh registrasi rute & middleware
codegraph explore "PostgresExamRepository"   # Melihat pola repository & transaksi database
codegraph explore "paymentHandler"           # Melihat controller pembayaran & gateway
codegraph explore "models.Test"              # Melihat struktur data & tag db/json
```

### Standar Penambahan Fitur (Clean Architecture):
1. **Migrasi Database (`backend/migrations/00X_nama.sql`)**:
   Definisikan tabel baru dengan foreign key, index B-Tree, dan timestamp.
2. **Domain Model (`backend/internal/models/models.go`)**:
   Buat struct dengan tag `db:"..."` dan `json:"..."`.
3. **Repository Interface & Implementasi (`backend/internal/repository/`)**:
   Gunakan query berparameter (`sqlx`) untuk mencegah SQL Injection. Selalu teruskan `context.Context`.
4. **Service / Business Logic (`backend/internal/services/`)**:
   Tempatkan kalkulasi atau integrasi pihak ketiga (Payment Gateway, AI LLM, dsb).
5. **HTTP Handler (`backend/internal/handlers/`)**:
   Validasi payload input, panggil repository/service, dan kembalikan respon standar JSON.
6. **Registrasi Rute (`backend/internal/handlers/routes.go`)**:
   Daftarkan endpoint ke group rute publik, user (`AuthRequired`), atau admin (`RequireAdmin`).

---

## 4. Matriks Keamanan & Threat Model

| Vektor Serangan | Risiko & Dampak | Mekanisme Pertahanan (*Security Controls*) | Lokasi Kode |
|---|---|---|---|
| **DDoS / Spam Request** | Server overload / OOM | Rate limiting Redis (100 req/min umum, 10 req/min start test) | `backend/internal/middleware/ratelimit.go` |
| **Bocoran Kunci Ujian** | Kecurangan peserta | Kunci jawaban (`is_correct`) & pembahasan dihapus total dari respon sesi ujian | `backend/internal/repository/exam_repository.go` |
| **Manipulasi Nilai** | Pemalsuan hasil tryout | Scoring 100% diproses di server melalui transaksi atomik database (`FinishExamTx`) | `backend/internal/repository/exam_repository.go` |
| **SQL Injection** | Akses data ilegal | Parameter binding `sqlx` wajib pada semua operasi database | `backend/internal/repository/` |
| **Penyusupan File** | RCE / Web shell | Validasi MIME type, batas berkas 2MB, nama berkas acak UUID | `backend/internal/services/storage.go` |
| **Sesi Kedaluwarsa** | Pengerjaan melebihi waktu | Pengecekan `ExpiresAt` saat submit dan auto-reject saat finish jika lewat toleransi | `backend/internal/repository/exam_repository.go` |

---

## 5. Integrasi AI Multi-Provider (Question Generator & Essay Auto-Grader)

Layanan AI pada TestHub mengadopsi arsitektur **3-Tier Resilient Fallback Engine**:
1. **Tier 1 (Primary)**: Google Gemini 2.5 Flash API (kecepatan tinggi & penalaran mendalam).
2. **Tier 2 (Secondary)**: Groq API (`llama-3.3-70b-versatile` / `gpt-oss-120b`) jika Tier 1 mengalami limitasi kuota (HTTP 429).
3. **Tier 3 (Zero Downtime Fallback)**: Bank kurasi soal deterministik dan Heuristic Rubric Engine lokal jika seluruh cloud API offline.

### Fitur AI Utama:
- **AI Question Generator (`/api/ai/generate-questions`)**:
  - Generator butir soal pilihan ganda (A-E) dengan acuan standar asesmen nasional (CPNS, UTBK, IQ, BUMN).
  - Dilengkapi *Prompt Fleksibel* (konteks / studi kasus pengajar) dan *Token Guardrail Dinamis* (`count * 650 + 2500 tokens`, aman hingga 8.192 tokens) guna mengantisipasi *thinking tokens* Gemini 2.5 tanpa memotong output JSON.
  - Auto-complement fallback: Jika LLM mengembalikan butir soal kurang dari target (misal: 8 dari 10), backend otomatis menggenapi sisa butir soal via bank deterministik lokal secara transparan.
- **AI Essay Auto-Grader (`/api/ai/grade-essay` & `/api/admin/essays/ai-grade`)**:
  - Asesor otomatis koreksi lembar jawaban esai dengan pembobotan rubrik objektif:
    - *Substansi & Teori* (Maks. 40 poin)
    - *Analisis Kritis & Solusi* (Maks. 30 poin)
    - *Sistematika Argumen & Bahasa* (Maks. 30 poin)
  - Memberikan rekomendasi skor (0-100), umpan balik evaluatif komprehensif, dan breakdown rubrik yang dapat ditinjau serta diedit langsung oleh instruktur di `EssayGradingView.tsx`.

> **Aturan Validasi Keras (*Hard Constraints*):**
> - Wajib memiliki tepat 4 atau 5 opsi jawaban (A-D / A-E).
> - Tepat 1 opsi bertindak sebagai kunci jawaban (`is_correct: true`), didistribusikan acak across opsi.
> - Wajib menyertakan teks pembahasan ilmiah (`explanation`).
> - Mengikat `context.Context` agar proses di-abort seketika jika koneksi klien terputus.

---

## 6. Orkestrasi & Perintah Operasional (DevOps)

Dikelola melalui `Makefile` di root proyek:

| Perintah | Fungsi | Target |
|---|---|---|
| `make setup` | Setup otomatis (.env, migrasi database, seed catalog default) | Native / VPS |
| `make dev` | Menjalankan Go backend di port `8000` | Native Host |
| `make dev-frontend` | Menjalankan Vite dev server di port `5173` | Native Host (Bun) |
| `make migrate` | Menjalankan migrasi SQL skema database | PostgreSQL |
| `make migrate-refresh` | Rollback (drop all tables) dan jalankan ulang semua migrasi | PostgreSQL |
| `make migrate-fresh` | Rollback, jalankan ulang semua migrasi, dan seed ulang data | PostgreSQL |
| `make seed` | Mengisi data dummy tryout dan akun default admin | PostgreSQL |
| `make test` | Menjalankan unit & integration test Go | Go Test Engine |
| `make build-backend` | Kompilasi binary Go (`backend/bin/server`) | Production Bin |
| `make build-frontend` | Build static bundle React (`frontend/dist/`) | Production SPA |
| `make docker-dev` | Menjalankan stack Docker Compose lokal | Docker Daemon |

### Port & Alokasi Layanan:
- **Nginx Reverse Proxy:** `80` (HTTP) & `443` (HTTPS)
- **Backend API (Go):** `8000`
- **Frontend Vite (Dev):** `5173` / Prod: `3000`
- **PostgreSQL 15:** `5432`
- **Redis 7:** `6379`
