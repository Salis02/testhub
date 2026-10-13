# 🎨 TestHub Frontend Architecture & Handover Guide

> **Panduan Teknis Frontend React 19, Sistem State, dan Serah Terima AI Agent**  
> Runtime: **Bun v1.4.2**, **Vite 8**, **React 19**, **TypeScript**, **Tailwind CSS v3**  
> Panduan Visual: [style.md](file:///home/sans/coding/quiz_app/style.md) (*Strict Tri-Color, Cognitive-Calm, Zero AI-Slop*)

---

## 1. Arsitektur Frontend & File Map

```
frontend/src/
├── App.tsx                     # Routing utama & wrapper Context Providers
├── index.css                   # Token CSS (Strict Tri-Color, derived opacities)
├── types/index.ts              # Interface Domain (User, Test, Question, Option, Session)
├── services/api.ts             # API Client terpusat (REST fetch wrapper)
├── context/
│   ├── AuthContext.tsx         # JWT token storage & route state validation
│   ├── ThemeContext.tsx        # Dark/light mode switcher
│   ├── ToastContext.tsx        # Global notification toasts (DRY)
│   └── ConfirmContext.tsx      # Promise-based confirmation dialogs (DRY)
├── components/
│   ├── common/                 # Header, Footer, ProtectedRoute, MediaUploader, Badge, Skeleton
│   ├── admin/                  # AIAssistantModal, TestEditorModal, TestManagement, EssayGradingView
│   └── test/                   # TestHeader, QuestionCard, QuestionNav, FinishConfirmModal
└── pages/
    ├── HomePage.tsx            # Katalog tryout publik & filter kategori
    ├── TestPage.tsx            # Antarmuka pengerjaan ujian berwaktu
    ├── ResultsPage.tsx         # Hasil nilai, persentil, dan pembahasan soal
    ├── LoginPage.tsx           # Form masuk admin (dengan Quick Fill)
    └── AdminPage.tsx           # Dashboard pengajar & manajemen tes (RBAC)
```

---

## 2. Fitur Kunci & Pola Komponen (Design Patterns)

### 2.1 Role-Based Access Control (RBAC)
- **Rute Publik**: `/`, `/test/:testId`, `/results/:resultId`, `/login`, `/pricing`.
- **Rute Terproteksi**: `/admin/*` dibungkus [`ProtectedRoute`](file:///home/sans/coding/quiz_app/frontend/src/components/common/ProtectedRoute.tsx).
- **Alur Guard**: Validasi token via `GET /api/auth/me`. Jika tidak sah, diarahkan ke `/login` dengan menyimpan state redirect `state.from`. Menampilkan halaman 403 Forbidden jika role bukan `admin` atau `creator`.
- **Kredensial Default**: `admin@testhub.com` / `AdminPassword123!`.

### 2.2 Pola Universal Toast & Confirmation Modal (DRY)
Menggantikan seluruh `window.alert()` dan `window.confirm()` bawaan browser:
- **Toast**: `const toast = useToast(); toast.success('Judul', 'Deskripsi')` (auto-dismiss 4s, glassmorphism `backdrop-blur-md`).
- **Confirm**: `const { confirm } = useConfirm(); const ok = await confirm({ title, message, variant: 'danger' })` (Promise-based, keyboard `Esc`/`Enter` support).

### 2.3 AI Question Assistant Modal ([AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx))
- **Dynamic Progressing**: Menampilkan kurva persentase dinamis (0–100%) dan stopwatch waktu tunggu aktif (*elapsed seconds*).
- **Multi-Card Shimmer Skeleton**: Kerangka butir soal beranimasi pulse saat menunggu respons model LLM.
- **Abort Controller**: Tombol *Batal* mengeksekusi `abortControllerRef.current.abort()` untuk memutus request HTTP upstream seketika.

### 2.4 Upload & Penayangan Gambar Soal ([MediaUploader.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/MediaUploader.tsx))
- Terhubung ke endpoint `POST /api/admin/upload-media` (maksimal 2MB, gambar PNG/JPG/WebP/SVG).
- Menampilkan pratinjau instan thumbnail dengan opsi hapus lampiran.
- Terintegrasi langsung di [`QuestionCard.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/test/QuestionCard.tsx) saat peserta mengerjakan ujian.

---

## 3. Verifikasi & Pengujian Cepat

```bash
# 1. Menjalankan Dev Server Frontend
cd frontend && bun run dev
# Akses: http://localhost:5173 atau http://localhost:3000

# 2. Type-Checking & Build Bundle Produksi
cd frontend && bun run build
# Hasil: 0 TypeScript errors, bundle terbentuk di frontend/dist/
```

---

## 4. Panduan Ekstensi untuk Pengembang / AI Agent Berikutnya

1. **Modernisasi Arsitektur & Pelunasan Technical Debt**: Ikuti panduan komprehensif di [FRONTEND_TECH_DEBT_AND_REFACTORING.md](file:///home/sans/coding/quiz_app/FRONTEND_TECH_DEBT_AND_REFACTORING.md) untuk mendekomposisi `api.ts`, memasang TanStack Query v5, validasi Zod + React Hook Form, dan store Zustand.
2. **Streaming Output (SSE)**: Ganti polling/loading tunggal AI generator dengan Server-Sent Events (`text/event-stream`) agar kartu soal dapat dirender bertahap satu per satu.
3. **Export Bank Soal**: Tambahkan generator PDF berbasis `jspdf` atau `@react-pdf/renderer` pada halaman hasil kuis untuk mencetak sertifikat tryout.
4. **PWA / Offline Mode**: Simpan draf jawaban sementara ke `IndexedDB` peserta agar pengerjaan ujian tahan gangguan jaringan internet.
