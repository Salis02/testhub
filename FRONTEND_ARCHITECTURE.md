# 🎨 TestHub Frontend Architecture & State Guide

> **Dokumen Arsitektur Frontend React 19, Sistem State, dan Panduan Pengembang**  
> Runtime: **Bun v1.4.2**, **Vite 8**, **React 19**, **TypeScript**, **Tailwind CSS v3**  
> State Management: **TanStack Query v5** (Server State) + **Zustand v5** (Client Session State)  
> Form & Validation: **React Hook Form v7** + **Zod Runtime Validation**  
> Panduan Desain: [style.md](file:///home/sans/coding/quiz_app/style.md) (*Strict Tri-Color, Cognitive-Calm, Zero AI-Slop*)

---

## 1. Peta Modul & Struktur Berkas

```
frontend/src/
├── App.tsx                     # QueryClientProvider, BrowserRouter, Auth/Theme/Toast providers
├── index.css                   # Token CSS (Strict Tri-Color, derived opacities)
├── types/index.ts              # Interface Domain (User, Test, Question, Option, Session, AuthResponse)
├── schemas/                    # Single Source of Truth Validasi Runtime (Zod)
│   └── test.schema.ts          # Zod schema untuk TestForm, Question, Option, passing score, rules
├── services/                   # Modular API Layer (Bebas Dual-Backend / localStorage Mock)
│   ├── client.ts               # Core HTTP Client, ApiError, synchronized token management
│   ├── tests.api.ts            # Public test catalog & detail endpoint
│   ├── sessions.api.ts         # Exam session lifecycle, submissions, result evaluation
│   ├── admin.api.ts            # Admin dashboard metrics, test & question CRUD, image uploads
│   ├── ai.api.ts               # AI Agent question generation proxy
│   ├── auth.api.ts             # Auth service & profile fetching
│   └── api.ts                  # Facade adapter backward-compatible
├── stores/                     # Client Session State Management
│   └── useTestSessionStore.ts  # Zustand store: isolasi per-detik countdown timer, auto-save status
├── context/
│   ├── AuthContext.tsx         # JWT token state & authentication lifecycle
│   ├── ThemeContext.tsx        # Dark/light mode switcher
│   ├── ToastContext.tsx        # Universal global notification toasts (DRY)
│   └── ConfirmContext.tsx      # Universal Promise-based confirmation dialogs (DRY)
├── components/
│   ├── common/                 # Header, Footer, ProtectedRoute, MediaUploader, Badge, Skeleton
│   ├── admin/                  # AIAssistantModal, TestEditorModal, TestCreatorModal, QuestionFormField, TestManagement
│   └── test/                   # TestCountdownTimer, TestHeader, QuestionCard, QuestionNav, FinishConfirmModal
└── pages/
    ├── HomePage.tsx            # Katalog tryout publik (TanStack Query + AbortSignal)
    ├── TestPage.tsx            # Antarmuka ujian berwaktu (Zustand 60 FPS isolation)
    ├── ResultsPage.tsx         # Hasil nilai, persentil, dan pembahasan soal
    ├── LoginPage.tsx           # Form masuk admin (dengan Quick Fill)
    └── AdminPage.tsx           # Dashboard pengajar & bank soal (TanStack Query mutations & invalidations)
```

---

## 2. Fondasi Arsitektur Enterprise (4 Pilar Utama)

### 🟢 Pilar 1: Network & Client Layer (`client.ts`)
- **Pembersihan Total Dual-Backend**: Lebih dari 700 baris kode mock database palsu telah dihapus dari `src/services/api.ts`. Semua data tersimpan konsisten di PostgreSQL backend melalui Go REST API.
- **Unified Token Sync**: Menyinkronkan kunci storage `'testhub_auth_token'` dan `'testhub_admin_token'` melalui `client.ts` (`getStoredToken()`, `setStoredToken()`, `clearStoredToken()`).
- **Fail-Fast Error Handling**: Class `ApiError` mempertahankan status HTTP asli dari Go backend untuk konsistensi penanganan di UI toast.

### 🟢 Pilar 2: Server State via TanStack Query v5
- Terpasang di root aplikasi [App.tsx](file:///home/sans/coding/quiz_app/frontend/src/App.tsx) dengan konfigurasi cache optimal (`staleTime: 2 menit`, `retry: 1`, `refetchOnWindowFocus: false`).
- Di [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx):
  - Menggantikan fetching manual dengan `useQuery(['admin', 'stats'])`, `useQuery(['admin', 'tests'])`, dan `useQuery(['admin', 'essays'])`.
  - Mutasi aksi (`togglePublish`, `deleteTest`, `createTest`, `gradeEssay`) menggunakan `useMutation` dengan invalidasi cache terarah via `queryClient.invalidateQueries`.
- Di [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx):
  - Query pencarian tes menggunakan `useQuery` dengan dukungan `signal: AbortSignal` untuk mencegah race conditions saat user mengetik cepat.

### 🟢 Pilar 3: Form Hardening & Immutability (`react-hook-form` + `zod`)
- [test.schema.ts](file:///home/sans/coding/quiz_app/frontend/src/schemas/test.schema.ts):
  - Validasi judul minimal 4 karakter, durasi 5–300 menit, passing score 1–100%.
  - `superRefine` pada pertanyaan: memastikan soal pilihan ganda memiliki minimal 2 opsi jawaban dan tepat 1 opsi ditandai `is_correct: true`.
- [QuestionFormField.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/QuestionFormField.tsx):
  - Komponen modular reusable antara modal pembuatan dan modal penyuntingan soal.
  - Memanfaatkan `useFormContext` dan `useFieldArray`.
  - Mengeliminasi bug mutasi langsung objek nested (`updated[qIdx].options[optIdx] = ...`) yang memicu stale closures di React 19.

### 🟢 Pilar 4: Session State Isolation via Zustand
- [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts):
  - Mengelola state aktif pengerjaan ujian, daftar soal, jawaban terkirim, status auto-save, dan perhitungan waktu.
- [TestCountdownTimer.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/test/TestCountdownTimer.tsx):
  - Berlangganan langsung ke Zustand selector `useTestSessionStore((s) => s.secondsLeft)`.
  - Halaman utama [TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx), card pertanyaan, dan drawer nomor soal **tidak lagi me-render ulang setiap detik** (0 re-renders per detik saat countdown berjalan).

---

## 3. Fitur Keamanan & Pola Komponen UX

1. **Role-Based Access Control (RBAC)**:
   - Rute terproteksi `/admin/*` dibungkus [`ProtectedRoute`](file:///home/sans/coding/quiz_app/frontend/src/components/common/ProtectedRoute.tsx).
   - Validasi sesi instan via `GET /api/auth/me`. Pengunjung tanpa izin di-redirect ke `/login` dengan menyimpan state `from` untuk return path.
2. **Universal DRY Toast & Confirm Modal**:
   - Menghilangkan pemanggilan `window.alert()` dan `window.confirm()`.
   - Menggunakan `useToast()` (`success`, `error`, `warning`, `info`) dan `useConfirm()` (Promise-based dialog dengan keyboard `Esc`/`Enter` & `backdrop-blur-md`).
3. **Upload Media Soal ([MediaUploader.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/common/MediaUploader.tsx))**:
   - Terhubung ke `POST /api/admin/upload-media` (maks. 2MB, MIME check, preview thumbnail, hapus lampiran).
   - Ditampilkan responsif di [`QuestionCard.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/test/QuestionCard.tsx).
4. **AI Question Assistant Modal ([AIAssistantModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/AIAssistantModal.tsx))**:
   - Multi-card shimmer skeleton loader, kurva progres dinamis (0–100%), dan pembatalan inferensi upstream via `AbortController`.

---

## 4. Panduan Menjalankan & Verifikasi Build

```bash
# 1. Menjalankan Dev Server Frontend
cd frontend && bun run dev
# Akses: http://localhost:3000

# 2. Type-Checking & Build Bundle Produksi
cd frontend && bun run build
# Hasil: 0 TypeScript errors, bundle Vite terkompilasi optimal di dist/
```
