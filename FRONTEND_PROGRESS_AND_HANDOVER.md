# 🚀 Frontend Progress & AI Agent Handover Documentation

Dokumentasi ini dibuat sebagai referensi lengkap dan panduan serah terima (*handover*) teknis bagi pengembang atau AI agent berikutnya untuk melanjutkan pengembangan **TestHub Frontend**.

> **Terakhir Diperbarui:** 12 Oktober 2026  
> **Status Build:** ✅ Production-Ready (`bun run build` sukses tanpa error / 0 lint warning)  
> **Runtime & Framework:** Bun `v1.4.2`, React 19, TypeScript, Vite 8, Tailwind CSS v3  
> **Panduan Desain:** [style.md](file:///home/sans/coding/quiz_app/style.md) (*Cognitive-Calm, Anti-AI Slop, Tri-Color System, Backdrop Blur*)

---

## 📋 Daftar Isi
1. [Ringkasan Pekerjaan Terkini (Current State)](#1-ringkasan-pekerjaan-terkini-current-state)
2. [Integrasi AI Agent Service Backend](#2-integrasi-ai-agent-service-backend)
3. [Skeleton Loading & Dynamic Progressing Engine](#3-skeleton-loading--dynamic-progressing-engine)
4. [Autentikasi & Role-Based Access Control (RBAC)](#4-autentikasi--role-based-access-control-rbac)
5. [Standardisasi Universal Toast & Confirmation Modal (DRY)](#5-standardisasi-universal-toast--confirmation-modal-dry)
6. [Fitur Edit Soal & Ujian Terintegrasi](#6-fitur-edit-soal--ujian-terintegrasi)
7. [Unggah Media & Manajemen Gambar Soal](#7-unggah-media--manajemen-gambar-soal)
8. [Struktur File & Manifest Komponen](#8-struktur-file--manifest-komponen)
9. [Panduan Menjalankan & Verifikasi](#9-panduan-menjalankan--verifikasi)
10. [Roadmap & Saran Langkah Berikutnya](#10-roadmap--saran-langkah-berikutnya)

---

## 1. Ringkasan Pekerjaan Terkini (Current State)

Berikut adalah fitur dan modul yang telah selesai dikerjakan secara menyeluruh (*done*):

1. **AI Question Generation Integration**:
   - Terkoneksi ke endpoint riil Go backend: `POST /api/ai/generate-questions`.
   - Menggunakan model LLM Gemini 2.5 Flash / Groq OSS dengan fallback deterministik lokal.
   - Mendukung pembatalan request seketika menggunakan `AbortController`.

2. **Progressing & Skeleton State**:
   - Indikator persentase dinamis (0% - 100%) dengan kurva waktu realistis menyesuaikan waktu inferensi AI (3–10 detik).
   - Stopwatch waktu tunggu aktif (*elapsed seconds*).
   - Teks multi-fase status inferensi otomatis berganti sesuai tahap penyusunan soal.
   - Shimmer skeleton card yang menyerupai bentuk butir soal pilihan ganda.

3. **Autentikasi Riil & Route Protection (RBAC)**:
   - Sesi diverifikasi langsung ke `GET /api/auth/me`.
   - Pemisahan ketat antara rute publik (peserta ujian) dan rute terproteksi (`/admin/*`).
   - Guard otomatis me-redirect pengunjung tanpa izin ke `/login` disertai pesan peringatan, atau menampilkan halaman **403 Forbidden**.
   - Kredensial seeded admin aktif: `admin@testhub.com` / `AdminPassword123!`.

4. **Universal Toast & Confirmation Modal (Anti-Browser Popups)**:
   - Menghapus 100% pemanggilan `window.alert()` dan `window.confirm()`.
   - Standardisasi menggunakan `useToast()` (`success`, `error`, `warning`, `info`) dan `useConfirm()` (Promise-based dialog dengan keyboard ESC/Enter & `backdrop-blur-md`).

5. **Edit Modul Ujian & Bank Soal (`PUT /api/admin/tests/:testId`)**:
   - Komponen modal baru `TestEditorModal.tsx` yang memuat detail ujian via `GET /api/admin/tests/:testId`.
   - Menyediakan interface pengeditan lengkap untuk metadata (judul, kategori, durasi, passing grade), penyesuaian bobot/tingkat kesulitan, penyusunan opsi jawaban A–E, radio button penentu kunci benar, pembahasan ilmiah, serta penambahan/penghapusan butir soal secara dinamis.
   - Terintegrasi dengan tombol aksi *Edit Soal* berikon pensil pada tabel `TestManagement.tsx`.

6. **Unggah Media Gambar Soal (`POST /api/admin/upload-media`)**:
   - Komponen `MediaUploader.tsx` untuk melampirkan ilustrasi/diagram/grafik pada tiap butir soal (mendukung format PNG, JPG, WebP, SVG maks. 2MB).
   - Terhubung langsung ke handler `mediaHandler.UploadMedia` dan `mediaHandler.DeleteMedia`.
   - Konfigurasi proxy Vite `/uploads` ke `http://localhost:8000` dan penayangan responsif di `QuestionCard.tsx` saat peserta mengerjakan ujian.

---

## 2. Integrasi AI Agent Service Backend

### Spesifikasi Endpoint
- **URL**: `POST /api/ai/generate-questions` (di-proxy oleh Vite ke `http://localhost:8000/api/ai/generate-questions`)
- **Backend Service**: `aiService := services.NewAIAgentService(cfg)` di [ai_agent.go](file:///home/sans/coding/quiz_app/backend/internal/services/ai_agent.go)
- **Frontend Client**: `api.generateQuestionsAI(...)` di [api.ts](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts#L632-L664)

### Payload & Kontrak Data
```typescript
// Request Body
interface AIGenerateRequest {
  category: 'cpns' | 'sbmptn' | 'iq' | 'custom'
  subject: string        // Contoh: "Tes Wawasan Kebangsaan - Integritas ASN"
  difficulty: 'easy' | 'medium' | 'hard'
  count: number          // Range: 1 - 10 soal
}

// Response: Array of Question
interface Question {
  id: string
  test_id: string
  question_number: number
  question_text: string
  question_type: 'multiple_choice' | 'essay'
  difficulty_level: 'easy' | 'medium' | 'hard'
  explanation?: string
  points: number
  options: {
    id: string
    question_id: string
    option_text: string
    option_letter: 'A' | 'B' | 'C' | 'D' | 'E'
    is_correct: boolean
  }[]
}
```

### Penanganan Pembatalan (Abort Controller)
Modal menyediakan tombol **Batal Generasi** yang langsung memutus koneksi HTTP ke server menggunakan `abortControllerRef.current.abort()`, membersihkan interval timer, dan mereset state tanpa menyebabkan memory leak.

---

## 3. Skeleton Loading & Dynamic Progressing Engine

Diimplementasikan di [AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx).

### Alur Fase Progres Dinamis
```
[0%] Menginisialisasi Multi-Provider Engine (Gemini / Groq)
  ↓
[20% - 45%] Menganalisis domain kurikulum & standar asesmen
  ↓
[45% - 70%] Merumuskan butir pertanyaan & kunci distractor seimbang
  ↓
[70% - 90%] Menjalankan validasi kepatuhan format & rasionalisasi ilmiah
  ↓
[100%] Selesai! Butir soal berhasil dibuat dan divalidasi
```

### Karakteristik UI:
1. **Linear Gradient Progress Bar**: Transisi CSS mulus (`transition-all duration-300 ease-out`).
2. **Elapsed Stopwatch**: Tampilan durasi aktual dalam detik (`0s`, `1s`, `2s`...).
3. **Multi-Card Shimmer Skeleton**: Kerangka soal animasi pulse lembut (`animate-pulse`) yang menampilkan header nomor soal, teks pertanyaan 2 baris, dan grid opsi pilihan ganda A–D/E.
4. **Accordion Review**: Soal yang selesai digenerate dapat dibuka-tutup untuk memeriksa kunci jawaban (`is_correct: true`) serta penjelasan rasionalisasi sebelum tombol **"Sisipkan ke Ujian"** ditekan.

---

## 4. Autentikasi & Role-Based Access Control (RBAC)

### Matriks Akses Rute ([App.tsx](file:///home/sans/coding/quiz_app/frontend/src/App.tsx))

| Path Rute | Tingkat Akses | Deskripsi & Perilaku |
| :--- | :--- | :--- |
| `/` | **Publik** | Halaman utama daftar ujian, pencarian, dan filter kategori. |
| `/pricing` | **Publik** | Informasi paket dan harga layanan TestHub. |
| `/test/:testId` | **Publik / Peserta** | Sesi ujian anonim/non-auth dengan timer dan navigasi soal. |
| `/results/:resultId` | **Publik / Peserta** | Halaman laporan hasil nilai, persentil, dan review pembahasan. |
| `/login` | **Publik** | Form masuk admin; otomatis redirect ke `/admin` jika sudah login. |
| `/admin/*` | **Terproteksi** | Terbatas untuk role `admin` & `creator`. Pengunjung tanpa izin di-redirect ke `/login`. |

### Komponen Pengaman
- **[AuthContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/AuthContext.tsx)**:
  - Menyimpan token di `localStorage` (`testhub_auth_token`).
  - Memverifikasi validitas token saat inisialisasi aplikasi via `GET /api/auth/me`.
  - Menyediakan flag `isCheckingAuth` untuk mencegah flicker redirect sebelum token selesai diperiksa.
- **[ProtectedRoute.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/ProtectedRoute.tsx)**:
  - Memeriksa `isAuthenticated` dan `user.role`.
  - Menyediakan halaman **403 Forbidden** yang elegan jika role tidak memenuhi syarat.
  - Meneruskan `location.pathname` ke `/login` melalui router state (`state.from`) sehingga setelah login pengguna langsung diarahkan kembali ke halaman tujuannya.

---

## 5. Standardisasi Universal Toast & Confirmation Modal (DRY)

Semua panggilan fungsi bawaan browser (`window.alert()` dan `window.confirm()`) telah dieliminasi dan digantikan dengan sistem terpusat.

### A. Toast System ([ToastContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/ToastContext.tsx))
- **Cara Pakai**:
  ```tsx
  import { useToast } from '@/context/ToastContext'

  const toast = useToast()
  toast.success('Judul Notifikasi', 'Deskripsi opsional penjelasan aksi.')
  toast.error('Gagal Memproses', 'Pesan error.')
  toast.warning('Peringatan Validasi', 'Informasi yang perlu diperhatikan.')
  toast.info('Informasi Sistem', 'Pesan umum.')
  ```
- **Fitur**: Auto-dismiss 4 detik, stacking maksimal 5 item, tombol close manual, styling glassmorphism (`backdrop-blur-md`).

### B. Confirmation Modal ([ConfirmContext.tsx](file:///home/sans/coding/quiz_app/frontend/src/context/ConfirmContext.tsx))
- **Cara Pakai**:
  ```tsx
  import { useConfirm } from '@/context/ConfirmContext'

  const { confirm } = useConfirm()

  const handleAction = async () => {
    const isConfirmed = await confirm({
      title: 'Hapus Modul Ujian?',
      message: 'Modul ini akan dihapus permanen dari bank soal.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger', // 'danger' | 'warning' | 'info' | 'primary'
    })

    if (!isConfirmed) return
    // Lanjutkan aksi...
  }
  ```
- **Fitur**: Return Promise `boolean`, dialog overlay dengan `backdrop-blur-md bg-ink/50 dark:bg-black/65`, navigasi keyboard (`Esc` batal, `Enter` konfirmasi), auto focus.

---

## 6. Fitur Edit Soal & Ujian Terintegrasi

### Alur Kerja & Implementasi
- **Komponen**: [TestEditorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestEditorModal.tsx)
- **Endpoint**:
  - `GET /api/admin/tests/:testId` $\rightarrow$ Memuat data ujian beserta seluruh butir pertanyaan dan opsi lengkap dengan flag `is_correct`.
  - `PUT /api/admin/tests/:testId` $\rightarrow$ Menyimpan pembaruan metadata dan memperbarui seluruh relasi `test_questions` dan `question_options` secara transaksional di database.
- **Kemampuan Editor**:
  1. **Metadata Real-time**: Mengubah judul, deskripsi, kategori, durasi waktu (5–300 menit), dan passing grade (1–100%).
  2. **Manipulasi Butir Soal**:
     - Mengubah redaksi pertanyaan (textarea auto-grow).
     - Menyesuaikan bobot poin per soal (1–50 poin) dan tingkat kesulitan (*easy*, *medium*, *hard*).
     - Menentukan jenis soal (*Pilihan Ganda* vs *Esai*).
     - Mengubah opsi jawaban A, B, C, D, E dan menentukan kunci jawaban benar via button radio.
     - Mengisi pembahasan rasionalisasi ilmiah.
     - Menambah butir soal baru atau menghapus butir soal lama.
  3. **AI Injection**: Tombol *"Generate dengan AI"* dapat dipicu langsung dari modal editor untuk menambahkan soal hasil AI ke draf yang sedang disunting.

---

## 7. Unggah Media & Manajemen Gambar Soal

### Spesifikasi Backend & Storage
- **Handler**: `mediaHandler.UploadMedia` di [media.go](file:///home/sans/coding/quiz_app/backend/internal/handlers/media.go)
- **Endpoint Upload**: `POST /api/admin/upload-media` (Form parameter `file`)
- **Endpoint Hapus**: `DELETE /api/admin/media?url=...`
- **Direktori Penyimpanan**: `backend/uploads/questions/`
- **Maksimal Ukuran**: 2MB per gambar
- **Tipe File**: MIME `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- **Akses Statis**: `GET /uploads/questions/:filename` (Di-proxy oleh Vite ke backend di development environment).

### Komponen Frontend: [MediaUploader.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/MediaUploader.tsx)
- **Pratinjau Gambar**: Menampilkan thumbnail instan dengan border clean, nama file, tautan preview layar penuh, dan tombol lepas lampiran (`X`).
- **Validasi Klien**: Menolak file non-gambar atau ukuran melebihi 2MB sebelum request dikirim ke backend.
- **Tampilan di Ujian**: Terintegrasi otomatis pada [QuestionCard.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/test/QuestionCard.tsx) sehingga peserta dapat melihat diagram/gambar soal saat ujian berlangsung.

---

## 8. Struktur File & Manifest Komponen

```
frontend/src/
├── App.tsx                               # Router utama dengan wrapper ToastProvider, ConfirmProvider, AuthProvider
├── index.css                             # Desain token CSS (Cognitive-Calm, border, surface, canvas)
├── types/
│   └── index.ts                          # Tipe User, Question (media_url), Test, TestSession, DifficultyLevel, dll.
├── services/
│   └── api.ts                            # REST API client ke backend Go (/api/admin/*, /api/ai/*, /api/auth/*)
├── context/
│   ├── AuthContext.tsx                   # State login, register, session verification (GET /api/auth/me)
│   ├── ThemeContext.tsx                  # Dark/light mode switcher
│   ├── ToastContext.tsx                  # Global toast notifications (DRY)
│   └── ConfirmContext.tsx                # Promise-based confirm dialog (DRY)
├── components/
│   ├── common/
│   │   ├── Header.tsx                    # Navigasi atas, auth indicator, dark mode toggle
│   │   ├── Footer.tsx                    # Footer aplikasi
│   │   ├── ProtectedRoute.tsx            # Route guard untuk admin & role-based checks
│   │   ├── MediaUploader.tsx             # Pengunggah media gambar soal (POST /api/admin/upload-media)
│   │   ├── Skeleton.tsx                  # Shared shimmer skeletons
│   │   └── Badge.tsx                     # Category & difficulty badges
│   ├── admin/
│   │   ├── AIAssistantModal.tsx          # Modal generator AI, progress bar, skeleton, review card
│   │   ├── AdminOverview.tsx             # Kartu metrik & statistik admin
│   │   ├── TestManagement.tsx            # Tabel manajemen tes (Aksi Edit Soal, publish, delete)
│   │   ├── TestCreatorModal.tsx          # Formulir pembuatan tes baru dengan MediaUploader
│   │   ├── TestEditorModal.tsx           # Modal edit modul ujian & butir soal (PUT /api/admin/tests/:testId)
│   │   └── EssayGradingView.tsx          # Antrean koreksi esai manual peserta dengan useToast
│   └── test/
│       ├── TestHeader.tsx                # Countdown timer ujian & progress
│       ├── QuestionCard.tsx              # Tampilan butir soal (dengan gambar media_url) & opsi pilihan ganda/esai
│       ├── QuestionNav.tsx               # Drawer nomor soal & status (terjawab, ragu-ragu)
│       └── FinishConfirmModal.tsx        # Modal konfirmasi submit lembar jawaban (backdrop-blur-md)
└── pages/
    ├── HomePage.tsx                      # Beranda publik daftar ujian
    ├── PricingPage.tsx                   # Halaman paket harga
    ├── TestPage.tsx                      # Halaman pengerjaan ujian
    ├── ResultsPage.tsx                   # Halaman analisis nilai & pembahasan
    ├── LoginPage.tsx                     # Halaman login admin dengan Quick Fill button
    └── AdminPage.tsx                     # Dashboard pengajar/admin terproteksi
```

---

## 9. Panduan Menjalankan & Verifikasi

### Prasyarat
- **Bun**: `v1.4.0` atau lebih baru
- **Backend Go**: Berjalan di `http://localhost:8000`

### Menjalankan Development Server
```bash
cd /home/sans/coding/quiz_app/frontend
bun run dev
```
Aplikasi dapat diakses di `http://localhost:3000`.

### Menguji Build Produksi & Type-Check
```bash
cd /home/sans/coding/quiz_app/frontend
bun run build
```
Memastikan tidak ada error TypeScript (`tsc -b`) dan bundle Vite terbentuk dengan benar di direktori `dist/`.

### Menguji Aksesibilitas Route & Auth:
1. Akses `http://localhost:3000/admin` langsung di browser tanpa login $\rightarrow$ Verifikasi auto-redirect ke `/login` dengan banner informasi.
2. Di halaman `/login`, gunakan tombol **"Quick Fill (Admin)"** atau masukkan kredensial:
   - Email: `admin@testhub.com`
   - Password: `AdminPassword123!`
3. Klik Masuk $\rightarrow$ Verifikasi diarahkan ke Dashboard `/admin`.
4. Di Dashboard, klik **"+ Buat Ujian Baru"** $\rightarrow$ klik **"Generate dengan AI"** $\rightarrow$ coba generate soal untuk melihat animasi progress bar, timer, dan skeleton loading.
5. Coba hapus sebuah modul di tabel untuk memverifikasi modal konfirmasi custom modern (`ConfirmContext`).

---

## 8. Roadmap & Saran Langkah Berikutnya

Jika Anda adalah agen AI atau developer yang melanjutkan proyek ini, berikut adalah prioritas pengembangan berikutnya:

1. **Streaming Output AI (Server-Sent Events / SSE)**:
   - Saat ini backend mengembalikan JSON utuh setelah seluruh soal selesai dirangkum. Jika ingin kecepatan interaksi lebih tinggi, backend dapat mengalirkan butir soal satu per satu via SSE (`text/event-stream`), dan frontend dapat langsung me-render kartu soal saat setiap butir selesai digenerate.
2. **Export Bank Soal**:
   - Menambahkan fitur export modul ujian ke format PDF atau Excel / CSV untuk kebutuhan cetak offline.
3. **Multi-Role User Management**:
   - Menyediakan panel di Dashboard Admin untuk mengelola akun pengguna lain (mengubah peran dari `user` biasa menjadi `creator`).
4. **PWA / Offline Mode Caching**:
   - Menambahkan Service Worker untuk menyimpan sesi pengerjaan ujian ke IndexedDB saat peserta mengalami kendala koneksi internet tiba-tiba di tengah ujian.

---
*Dokumentasi ini siap dijadikan acuan utama untuk kelanjutan pengembangan arsitektur TestHub.*
