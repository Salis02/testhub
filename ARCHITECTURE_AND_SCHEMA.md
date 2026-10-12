# 🏛️ TestHub Architecture, Database Schema & API Contracts

> **Dokumen Arsitektur Teknis, Skema Data Relasional, dan Spesifikasi API TestHub**  
> Sumber Skema Migrasi: [backend/migrations/001_init.sql](file:///home/sans/coding/quiz_app/backend/migrations/001_init.sql)  
> Domain Models: [backend/internal/models/models.go](file:///home/sans/coding/quiz_app/backend/internal/models/models.go)

---

## 1. Arsitektur Sistem (High-Level Design)

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
         │ - B-Tree Indexes          │                 │ - Auto In-Memory Fallback │
         └───────────────────────────┘                 └───────────────────────────┘
```

---

## 2. Skema Database Relasional & Kamus Data

Relasi entitas terdefinisi di [backend/migrations/001_init.sql](file:///home/sans/coding/quiz_app/backend/migrations/001_init.sql):

```
users (1) ──< tests (N) ──< questions (N) ──< options (N)
               │                 │
               │ (1)             │ (1)
               ▼ (N)             ▼ (N)
            sessions (1) ───< submissions (N)
               │
               ▼ (1)
            results (1)
```

### Kamus Entitas Inti
| Tabel | Primary Key | Foreign Key Penting | Deskripsi & Kolom Kunci |
|---|---|---|---|
| **`users`** | `id` (UUID) | - | Akun pengelola kuis (`email`, `password_hash`, `role: admin/creator`, `full_name`) |
| **`tests`** | `id` (UUID) | `created_by -> users.id` | Modul kuis (`title`, `category: cpns/sbmptn/iq/custom`, `duration_minutes`, `passing_score`, `is_published`) |
| **`questions`** | `id` (UUID) | `test_id -> tests.id` | Butir soal kuis (`question_number`, `question_text`, `question_type: multiple_choice/essay`, `points`, `media_url`, `explanation`) |
| **`options`** | `id` (UUID) | `question_id -> questions.id` | Opsi pilihan ganda (`option_text`, `option_letter: A-E`, `is_correct: boolean`) |
| **`sessions`** | `id` (UUID) | `test_id -> tests.id` | Sesi ujian anonim peserta (`session_token`, `status: in_progress/completed/expired`, `expires_at`, `total_score`) |
| **`submissions`**| `id` (UUID) | `session_id`, `question_id`, `selected_option_id` | Jawaban peserta (`essay_answer`, `is_flagged`, `is_correct`, `score_awarded`) |
| **`results`** | `id` (UUID) | `session_id -> sessions.id` | Rekapitulasi akhir (`score`, `percentage`, `passed: boolean`, `percentile`, `category_breakdown: JSONB`) |

### Indeks Performa Kritis
- `CREATE INDEX idx_tests_category_published ON tests(category, is_published);`
- `CREATE INDEX idx_questions_test_id ON questions(test_id);`
- `CREATE INDEX idx_options_question_id ON options(question_id);`
- `CREATE INDEX idx_sessions_token ON sessions(session_token);`
- `CREATE INDEX idx_submissions_session_question ON submissions(session_id, question_id);`

---

## 3. Spesifikasi Kontrak API (API Directory)

Semua endpoint terdaftar di [backend/internal/handlers/routes.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go):

### 3.1 Autentikasi & Akun
| Method | Path | Akses | Deskripsi & Payload Utama |
|---|---|---|---|
| `POST` | `/api/auth/register` | Publik (RL: 20/m) | Daftar admin/creator (`email`, `password`, `full_name`, `role`) |
| `POST` | `/api/auth/login` | Publik (RL: 30/m) | Login admin/creator (`email`, `password`) -> return JWT `token` |
| `GET` | `/api/auth/me` | Bearer Token | Mengambil identitas user dari token (`id`, `email`, `role`) |

### 3.2 Alur Ujian Publik (Non-Auth / Anonim)
| Method | Path | Akses | Deskripsi & Payload Utama |
|---|---|---|---|
| `GET` | `/api/tests` | Publik | Katalog tes aktif (Query: `category`, `keyword`) |
| `GET` | `/api/tests/:testId` | Publik | Detail ringkas modul tes (durasi, jumlah soal, passing score) |
| `POST` | `/api/tests/:testId/start` | Publik (RL: 10/m) | Mulai ujian -> kembalikan `session_id` & `expires_at` |
| `GET` | `/api/sessions/:sessionId/questions`| Publik | Ambil daftar butir soal (**kunci jawaban & pembahasan di-strip**) |
| `GET` | `/api/sessions/:sessionId/submissions`| Publik | Ambil progres draft jawaban yang sudah disimpan sebelumnya |
| `POST` | `/api/sessions/:sessionId/submit-answer`| Publik | Simpan jawaban butir soal (`question_id`, `selected_option_id`, `is_flagged`) |
| `POST` | `/api/sessions/:sessionId/finish`| Publik | Selesaikan ujian -> picu auto-grading & return `result_id` |
| `GET` | `/api/results/:resultId` | Publik | Pembahasan lengkap, persentil, dan evaluasi performa kategori |

### 3.3 Dashboard Admin & Pengelolaan Kuis
| Method | Path | Akses | Deskripsi & Payload Utama |
|---|---|---|---|
| `GET` | `/api/admin/tests` | Admin / Creator | List seluruh tes termasuk draft & unlisted |
| `POST` | `/api/admin/tests` | Admin / Creator | Buat modul tes baru |
| `GET` | `/api/admin/tests/:testId` | Admin / Creator | Detail modul lengkap beserta seluruh kunci jawaban dan opsi |
| `PUT` | `/api/admin/tests/:testId` | Admin / Creator | Update atomik metadata tes, daftar soal, opsi A-E, dan gambar |
| `DELETE` | `/api/admin/tests/:testId` | Admin / Creator | Soft-delete modul ujian |
| `POST` | `/api/admin/tests/:testId/toggle-publish`| Admin / Creator| Toggle status tayang tes (`is_published`) |
| `GET` | `/api/admin/tests/:testId/analytics` | Admin / Creator | Analitik submission, rata-rata nilai, passing rate |
| `POST` | `/api/admin/upload-media` | Admin / Creator | Upload gambar ilustrasi soal (MIME check, max 2MB) |
| `DELETE` | `/api/admin/media` | Admin / Creator | Hapus berkas media berdasarkan query `url` |
| `GET` | `/api/admin/essays` | Admin / Creator | Antrean review jawaban esai yang belum dinilai |
| `POST` | `/api/admin/essays/:essayId/grade` | Admin / Creator | Berikan skor dan feedback esai manual |
| `POST` | `/api/ai/generate-questions` | Admin / Creator | AI Question Generator sintetis soal (Gemini/Groq) |

---

## 4. Strategi Caching (Redis & In-Memory Fallback)

Implementasi di [backend/internal/cache/redis.go](file:///home/sans/coding/quiz_app/backend/internal/cache/redis.go):

| Key Pattern | Tipe Data | TTL | Tujuan & Invalidation |
|---|---|---|---|
| `tests:published` | JSON String | 10 Menit | Cache katalog beranda kuis. Di-invalidate saat ada create/update/delete tes. |
| `test:detail:{testId}` | JSON String | 30 Menit | Cache metadata modul tes publik. |
| `test:questions:{testId}` | JSON String | 30 Menit | Cache daftar soal bersih tanpa jawaban untuk kecepatan akses bersamaan. |
| `session:{sessionId}` | Hash / JSON | Sesuai durasi tes | Status aktif sesi pengerjaan ujian. |
| `ratelimit:{ip}:{action}` | Integer | 1 Menit | Rate limit sliding window counter. |

> **Resilient Fallback:** Jika koneksi Redis terputus, backend secara otomatis dan transparan mengalihkan operasi `Get`, `Set`, `Delete`, dan `Incr` ke cache memori lokal (`sync.RWMutex`), menjamin SLA ketersediaan 99.5%.
