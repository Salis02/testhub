# 🤖 TestHub AI Agent Integration & Security Threat Model

> **Dokumen Aturan AI Question Generator, Validasi Kualitas Soal, dan Matriks Keamanan Produksi**  
> Implementasi Backend: [backend/internal/services/ai_agent.go](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go) | [backend/internal/handlers/ai.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/ai.go)

---

## 1. Arsitektur AI Question Generator

Layanan AI Question Generator bertugas menyintesis bank soal berstandar ujian nasional (CPNS, SBMPTN, IQ, dan BUMN):

```
[ Frontend: AIAssistantModal.tsx ]
              │
              ▼ (POST /api/ai/generate-questions)
[ Backend: NewAIAssistantHandler ]
              │
              ▼ (Context with Timeout / Abort)
[ AIAgentService (ai_agent.go) ]
     ├── 1. Primary Provider   : Google Gemini 2.5 Flash API
     ├── 2. Secondary Provider : Groq OSS (Llama 3.3 70B)
     └── 3. Fallback Engine    : Deterministic Domain-Curated Bank (Zero-Downtime)
              │
              ▼ (Automated Quality Validation)
[ Validated JSON Questions ] ──> Insert ke Draf Ujian Admin
```

---

## 2. Aturan Kualitas & Validasi Soal (Strict AI Constraints)

Sebelum soal hasil inferensi AI disimpan atau ditampilkan ke admin, wajib lolos validasi deterministik berikut:

| Kriteria Validasi | Aturan Keras (*Hard Constraints*) | Penanganan Jika Gagal |
|---|---|---|
| **Jumlah Opsi** | Tepat 4 atau 5 opsi (A–D atau A–E) | Tolak / Fallback ke bank kurasi |
| **Kunci Jawaban** | **Harus tepat 1 opsi** dengan `is_correct: true` | Normalisasi opsi pertama atau reject |
| **Keseimbangan Opsi**| Panjang karakter tiap opsi seimbang (hindari opsi terpanjang selalu benar) | Distribusi panjang teks |
| **Pembahasan** | Wajib menyertakan penjelasan ilmiah/logika penyelesaian (`explanation`) | Generate pembahasan standar topik |
| **Karakter Pertanyaan**| Minimal 20 karakter, bebas dari kata ambigu / multitafsir | Reject |
| **Aborting / Timeout**| Meneruskan `context.Context` dari request HTTP | Batalkan inferensi upstream jika user menutup modal |

### Pemetaan Topik Ujian Nasional
- **CPNS**: Tes Wawasan Kebangsaan (Pancasila, UUD 1945, Integritas ASN) & Tes Inteligensi Umum (Silogisme, Numerik).
- **SBMPTN / UTBK**: Tes Potensi Skolastik (Penalaran Umum, Pemahaman Bacaan, Pengetahuan Kuantitatif).
- **IQ Assessment**: Pola Spasial, Hubungan Logika Simbolis, Raven Progressive Matrices.
- **BUMN**: Nilai-Nilai Utama AKHLAK (Amanah, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif).

---

## 3. Matriks Keamanan & Threat Model (Production Hardening)

Platform asesmen publik tanpa login awal menghadapi tantangan keamanan khusus. Berikut mitigasi yang diimplementasikan:

| Vektor Serangan | Risiko & Dampak | Mekanisme Pertahanan (*Security Controls*) | Lokasi Kode |
|---|---|---|---|
| **DDoS / Request Spam** | Server down / Exhaustion RAM | Rate limiting per-IP (100 req/m) & per-action (10 req/m start test) via Redis | [ratelimit.go](file:///home/sans/coding/quiz_app/backend/internal/middleware/ratelimit.go) |
| **Kebocoran Kunci Jawaban** | Kecurangan ujian massal | Kunci jawaban (`is_correct`) & `explanation` **dihapus mutlak** dari response API sebelum ujian selesai | [public.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/public.go) |
| **Manipulasi Nilai Klien** | Skor diubah via DevTools | Perhitungan nilai 100% dilakukan di backend (*server-side grading* formula) | [scoring.go](file:///home/sans/coding/quiz_app/backend/internal/services/scoring.go) |
| **SQL Injection** | Pencurian data / modifikasi | Semua kueri database menggunakan parameter binding bawaan `sqlx` (tanpa konkatenasi string SQL) | [public.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/public.go), [admin.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/admin.go) |
| **Malicious File Upload** | Eksekusi remote code (RCE) | Validasi magic-byte (MIME sniffing), batas ukuran 2MB, penamaan acak UUID, simpan di luar root eksekusi web | [media.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/media.go) |
| **Brute-Force Login Admin**| Pengambilalihan akun | Rate limit ketat 30 req/m di `/api/auth/login`, password di-hash dengan `bcrypt (cost 12)` | [auth.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/auth.go) |
| **Cross-Site Scripting (XSS)**| Pencurian sesi / injeksi skrip| React JSX default auto-escaping, Content-Security-Policy & header `X-XSS-Protection` pada Nginx | [nginx.conf](file:///home/sans/coding/quiz_app/nginx/nginx.conf) |

---

## 4. Moderasi Konten & Kepatuhan Privasi (GDPR / UU PDP)

1. **Privasi Peserta Non-Auth**: Sesi pengerjaan hanya menggunakan token acak UUID (`sess-xxx`). Tidak ada data pribadi (nama, KTP, email) yang diwajibkan untuk mengerjakan kuis publik.
2. **Leaderboard & Persentil Anonim**: Peringkat dan perbandingan skor hanya menampilkan persentil agregat (*Top 10%*, *Top 25%*) tanpa mengekspos identitas peserta lain.
3. **Siklus Hidup Data Sesi**: Sesi ujian yang telah melewati `expires_at` akan otomatis ditandai kedaluwarsa dan data draf sementara dapat dibersihkan secara periodik.
4. **Moderasi AI Prompt**: System prompt melarang keras sintesis soal yang mengandung unsur SARA, diskriminasi, ujaran kebencian, atau konten politis partisan.
