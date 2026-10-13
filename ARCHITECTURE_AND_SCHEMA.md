# 🏛️ TestHub Architecture, Database Schema & API Contracts

> **Dokumen Arsitektur Teknis, Skema Data Relasional, dan Spesifikasi API TestHub**  
> Sumber Skema Migrasi: [backend/migrations/001_init.sql](file:///home/sans/coding/quiz_app/backend/migrations/001_init.sql) & [002_subscriptions_and_pricing.sql](file:///home/sans/coding/quiz_app/backend/migrations/002_subscriptions_and_pricing.sql)  
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
         │ - B-Tree Indexes          │                 │ - Leaderboard (ZSET)      │
         └───────────────────────────┘                 └───────────────────────────┘
```

---

## 2. Skema Database Relasional & Kamus Data

Relasi entitas terdefinisi di [backend/migrations/001_init.sql](file:///home/sans/coding/quiz_app/backend/migrations/001_init.sql) dan [002_subscriptions_and_pricing.sql](file:///home/sans/coding/quiz_app/backend/migrations/002_subscriptions_and_pricing.sql):

```
users (1) ──< tests (N) ──< questions (N) ──< options (N)
               │    │            │
               │    │ (1)        │ (1)
               │    ▼ (N)        ▼ (N)
               │  sessions (1) ──< submissions (N)
               │    │
               │    ▼ (1)
               │  results (1)
               │
               ▼ (N)
           orders (N) ────► subscriptions (N)
```

### Kamus Entitas Inti
| Tabel | Primary Key | Foreign Key Penting | Deskripsi & Kolom Kunci |
|---|---|---|---|
| **`users`** | `id` (UUID) | - | Akun pengelola kuis (`email`, `password_hash`, `role: admin/creator`, `full_name`) |
| **`tests`** | `id` (UUID) | `created_by -> users.id` | Modul kuis (`title`, `category`, `duration_minutes`, `passing_score`, `price_idr`, `is_published`) |
| **`questions`** | `id` (UUID) | `test_id -> tests.id` | Butir soal kuis (`question_number`, `question_text`, `question_type: multiple_choice/essay`, `points`, `media_url`, `explanation`) |
| **`options`** | `id` (UUID) | `question_id -> questions.id` | Opsi pilihan ganda (`option_text`, `option_letter: A-E`, `is_correct: boolean`) |
| **`sessions`** | `id` (UUID) | `test_id -> tests.id` | Sesi ujian anonim peserta (`session_token`, `status: in_progress/completed/expired`, `expires_at`, `total_score`) |
| **`submissions`**| `id` (UUID) | `session_id`, `question_id`, `selected_option_id` | Jawaban peserta (`essay_answer`, `is_flagged`, `is_correct`, `score_awarded`) |
| **`results`** | `id` (UUID) | `session_id -> sessions.id` | Rekapitulasi akhir (`score`, `percentage`, `passed: boolean`, `percentile`, `category_breakdown: JSONB`) |
| **`orders`** | `id` (VARCHAR) | `test_id -> tests.id` | Faktur transaksi gateway (`user_email`, `plan_type`, `amount`, `status: pending/settled/expired`, `qr_payload`, `snap_token`) |
| **`subscriptions`**| `id` (VARCHAR) | `test_id -> tests.id` | Akses modul/season pass (`user_identifier`, `tier: per_test/season_pass`, `status: active/suspended/revoked`, `source`, `valid_until`) |

### Indeks Performa Kritis
- `CREATE INDEX idx_tests_category_published ON tests(category, is_published);`
- `CREATE INDEX idx_questions_test_id ON questions(test_id);`
- `CREATE INDEX idx_options_question_id ON options(question_id);`
- `CREATE INDEX idx_sessions_token ON sessions(session_token);`
- `CREATE INDEX idx_submissions_session_question ON submissions(session_id, question_id);`
- `CREATE INDEX idx_orders_user_status ON orders(user_email, status);`
- `CREATE INDEX idx_subscriptions_lookup ON subscriptions(user_identifier, test_id, status);`

---

## 3. Spesifikasi Kontrak API Berdasarkan Role (Role-Based Directory)

Semua endpoint terdaftar di [backend/internal/handlers/routes.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/routes.go):

### 3.1 Role: Public (Unauthenticated Examinees & Visitors)
| Method | Path | Rate Limit | Deskripsi & Payload Utama |
|---|---|---|---|
| `GET` | `/health` | - | Health check server & konektivitas DB/Cache |
| `GET` | `/uploads/*` | - | Static media file serving dengan HTTP cache 7 hari |
| `POST` | `/api/auth/register` | 20/m | Registrasi akun baru (`email`, `password`, `full_name`, `role`) |
| `POST` | `/api/auth/login` | 30/m | Login akun (`email`, `password`) -> return JWT token |
| `GET` | `/api/tests` | - | Katalog modul tes publik (`category`, `keyword`) |
| `GET` | `/api/tests/:testId` | - | Metadata modul tes publik (durasi, jumlah soal, harga) |
| `GET` | `/api/tests/:testId/leaderboard` | - | Peringkat 50 teratas dari Redis Sorted Sets (`< 5ms`) |
| `POST` | `/api/tests/:testId/start` | 10/m | Buka ujian (**Paywall Check**: return `HTTP 402` jika tes berbayar dan belum langganan) |
| `GET` | `/api/sessions/:sessionId/questions`| - | Butir soal ujian (kunci jawaban & pembahasan di-strip bersih) |
| `GET` | `/api/sessions/:sessionId/submissions`| - | Progres jawaban tersimpan peserta |
| `POST` | `/api/sessions/:sessionId/submit-answer`| - | Simpan jawaban butir soal (`question_id`, `selected_option_id`, `is_flagged`) |
| `POST` | `/api/sessions/:sessionId/finish`| - | Selesaikan ujian, auto-grading atomik, & update leaderboard |
| `GET` | `/api/results/:resultId` | - | Rekapitulasi nilai, persentil, dan pembahasan lengkap |
| `GET` | `/api/results/:resultId/certificate`| - | Metadata sertifikat resmi ber-UUID unik (`CERT-***`) |
| `GET` | `/api/verify/certificate/:certificateId`| - | Verifikasi publik keaslian sertifikat nilai |
| `POST` | `/api/payments/create-invoice` | 10/m | Generate invoice QRIS dinamis via Midtrans/Xendit |
| `GET` | `/api/payments/status/:orderId` | 60/m | Polling status pesanan pending/settled |
| `POST` | `/api/payments/webhook` | - | Webhook callback notifikasi gateway (idempoten & atomik) |
| `POST` | `/api/ai/generate-questions` | 5/m | Generator butir soal AI (Gemini 2.5 / Groq OSS fallback) |

### 3.2 Role: User / Examinee (`/api/user` — Dilindungi `AuthRequired`)
| Method | Path | Deskripsi & Payload Utama |
|---|---|---|
| `GET` | `/api/user/me` | Mengambil profil peserta terautentikasi |
| `GET` | `/api/user/subscriptions` | Riwayat langganan dan modul tes aktif milik user |

### 3.3 Role: Admin & Creator (`/api/admin` — Dilindungi `AuthRequired` + `RequireAdmin`)
| Method | Path | Deskripsi & Payload Utama |
|---|---|---|
| `GET` | `/api/admin/stats` | Statistik agregat platform (total user, tes aktif, penyelesaian) |
| `GET` | `/api/admin/tests/:testId/analytics` | Analitik distribusi nilai dan rata-rata skor per soal |
| `GET` | `/api/admin/tests` | Daftar semua tes (termasuk draf belum tayang) |
| `POST` | `/api/admin/tests` | Buat modul tes baru (validasi relasional DTO lengkap) |
| `GET` | `/api/admin/tests/:testId` | Detail modul lengkap untuk mode edit |
| `PUT` | `/api/admin/tests/:testId` | Perbarui data modul, butir soal, dan opsi A-E |
| `POST` | `/api/admin/tests/:testId/toggle-publish` | Toggle status tayang tes (`is_published`) |
| `DELETE` | `/api/admin/tests/:testId` | Soft-delete modul ujian |
| `GET` | `/api/admin/essays` | Antrean review jawaban esai yang belum dinilai |
| `POST` | `/api/admin/essays/:essayId/grade` | Berikan skor dan evaluasi catatan esai |
| `POST` | `/api/admin/upload-media` | Upload gambar soal (MIME check, maks. 2MB) |
| `DELETE` | `/api/admin/media` | Hapus berkas media berdasarkan nama/url |
| `GET` | `/api/admin/subscriptions` | Daftar semua langganan berbayar (filter status & search) |
| `POST` | `/api/admin/subscriptions/manual-grant` | **Manual Grant**: Berikan akses tes/season pass dengan catatan alasan audit |
| `PUT` | `/api/admin/subscriptions/:id/status` | Ubah status (`active`/`suspended`) atau perpanjang hari |
| `DELETE` | `/api/admin/subscriptions/:id/revoke` | Cabut akses langganan (refund/pembatalan) |

---

## 4. Strategi Caching (Redis & In-Memory Fallback)

Implementasi di [backend/internal/cache/redis.go](file:///home/sans/coding/quiz_app/backend/internal/cache/redis.go):

| Key Pattern | Tipe Data | TTL | Tujuan & Invalidation |
|---|---|---|---|
| `tests:published` | JSON String | 10 Menit | Cache katalog beranda kuis. Di-invalidate saat ada create/update/delete tes. |
| `test:detail:{testId}` | JSON String | 30 Menit | Cache metadata modul tes publik. |
| `test:questions:{testId}` | JSON String | 30 Menit | Cache daftar soal bersih tanpa jawaban untuk kecepatan akses bersamaan. |
| `leaderboard:{testId}` | Sorted Set (ZSET)| 24 Jam | Skor peserta real-time (`ZADD`, `ZREVRANGE`). Latensi < 5ms. |
| `ratelimit:{ip}:{action}` | Integer | 1 Menit | Rate limit sliding window counter (Atomic Lua script). |

> **Resilient Fallback:** Jika koneksi Redis terputus, backend secara otomatis dan transparan mengalihkan operasi `Get`, `Set`, `Delete`, dan `Incr` ke cache memori lokal (`sync.RWMutex`), menjamin SLA ketersediaan 99.5%.

---

## 5. Standard Operasional Prosedur (SOP) Pencegahan Technical Debt Backend

Untuk menjamin skalabilitas dan kemudahan pemeliharaan (*maintainability*) hingga 10+ tahun ke depan, setiap developer backend **WAJIB** menaati 5 aturan arsitektural berikut:

1. **Jaminan Transaksi Atomik (`defer tx.Rollback()`)**:
   - Setiap kali membuka transaksi database, baris berikutnya **WAJIB** `defer tx.Rollback()`. Jika `tx.Commit()` berhasil dieksekusi, rollback otomatis menjadi no-op. Kegagalan melakukan ini akan memicu *connection leak* yang melumpuhkan pool PostgreSQL saat beban tinggi.
2. **Propagasi Context Penuh (`context.Context`)**:
   - Seluruh pemanggilan database (`GetContext`, `SelectContext`, `ExecContext`, `BeginTxx`) dan Redis **WAJIB** menggunakan `ctx context.Context` dari request HTTP (`c.Request.Context()`). Jangan gunakan `context.Background()` pada request handler agar query langsung dibatalkan jika client memutuskan koneksi.
3. **Pemisahan Lapisan Mutlak (Zero Raw SQL di Handler)**:
   - Handler HTTP (`admin.go`, `public.go`, `payment.go`) dilarang keras memuat string raw SQL (`SELECT ...`, `UPDATE ...`). Semua manipulasi data wajib melalui antarmuka Repository (`TestRepository`, `ExamRepository`, `SubscriptionRepository`).
4. **Idempotensi Pembayaran & Row Locking (`FOR UPDATE`)**:
   - Mutasi data sensitif seperti pembayaran atau penyelesaian ujian wajib menggunakan `SELECT ... FOR UPDATE` dan pemeriksaan status ganda (`if order.Status == "settled" { return }`) untuk mencegah *double-credit* akibat webhook ganda dari gateway.
5. **Sentinel Errors & Sanitasi Error**:
   - Definisikan error terstandar (`ErrNotFound`, `ErrAlreadyExists`, `ErrSessionInactive`) dan gunakan `errors.Is()`. Jangan pernah mengekspos raw error PostgreSQL (`pq: relation ... does not exist`) ke client demi keamanan data (*Information Disclosure Prevention*).
