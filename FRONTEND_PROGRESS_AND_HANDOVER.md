# 🎨 TestHub Frontend Architecture & Handover Guide (10-Year Enterprise Edition)

> **Panduan Teknis Frontend React 19, Sistem State, dan Serah Terima AI Agent / Tim Pengembang**  
> Runtime: **Bun v1.4.2**, **Vite 8**, **React 19**, **TypeScript**, **Tailwind CSS v3**  
> State Management: **TanStack Query v5** (Server State) + **Zustand v5** (Client Session State)  
> Form & Validation: **React Hook Form v7** + **Zod Schema Validation**  
> Panduan Visual: [style.md](file:///home/sans/coding/quiz_app/style.md) (*Strict Tri-Color, Cognitive-Calm, Zero AI-Slop*)  
> Roadmap & Technical Debt: [FRONTEND_TECH_DEBT_AND_REFACTORING.md](file:///home/sans/coding/quiz_app/FRONTEND_TECH_DEBT_AND_REFACTORING.md)

---

## 1. Arsitektur Frontend & Peta Berkas (Current State)

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

## 2. Fondasi Arsitektur 10-Tahun (Key Technical Pillars)

### 2.1 Pembersihan Dual-Backend & Fail-Fast Networking
- **Tidak ada lagi simulasi palsu database di `localStorage`**: Seluruh data tersimpan konsisten di PostgreSQL backend melalui Go REST API.
- **Unified Token Sync**: Menyinkronkan kunci storage `'testhub_auth_token'` dan `'testhub_admin_token'` melalui `client.ts` (`getStoredToken()`, `setStoredToken()`, `clearStoredToken()`).

### 2.2 Server State Management (TanStack Query v5)
- Menggantikan fetching manual `useState` + `useEffect` di [AdminPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx) dan [HomePage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx).
- Cache tersentralisasi dengan garbage collection otomatis, deduplikasi request serentak, dan invalidasi terarah pasca-mutasi (`togglePublish`, `deleteTest`, `createTest`, `gradeEssay`).

### 2.3 Form Hardening & Immutability (React Hook Form + Zod)
- [TestCreatorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestCreatorModal.tsx) dan [TestEditorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestEditorModal.tsx) menggunakan `useForm` + `useFieldArray` + `zodResolver(TestFormSchema)`.
- Mengeliminasi bug mutasi langsung objek nested (`updated[qIndex].options[optIndex].text = ...`) yang berpotensi memicu stale closures di React 19.
- Subkomponen [QuestionFormField.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/QuestionFormField.tsx) menjamin kode DRY antara modal pembuatan dan modal penyuntingan soal.

### 2.4 High-Frequency Render Protection (Zustand Session Store)
- [useTestSessionStore.ts](file:///home/sans/coding/quiz_app/frontend/src/stores/useTestSessionStore.ts) mengisolasi countdown timer dan status autosave dari render tree virtual DOM.
- Komponen [TestCountdownTimer.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/test/TestCountdownTimer.tsx) hanya men-subscribe `secondsLeft`, sehingga perubahan detik tidak lagi me-render ulang card soal maupun drawer daftar nomor soal (0 re-renders per detik).

---

## 3. Panduan Menjalankan Sistem Secara Mandiri

### 🖥️ Terminal 1: Backend Go
```bash
cd /home/sans/coding/quiz_app/backend

# Jalankan server API (berjalan di http://localhost:8000)
go run cmd/server/main.go
```

> **Catatan Seeder (jika database baru di-setup):**
> ```bash
> go run cmd/migrate/main.go up
> go run cmd/seed/main.go
> ```
> Kredensial default:
> - **Admin:** `admin@testhub.id` / `admin123`
> - **Peserta:** `budi@gmail.com` / `user123`

---

### 💻 Terminal 2: Frontend Vite
```bash
cd /home/sans/coding/quiz_app/frontend

# Jalankan server frontend Vite (berjalan di http://localhost:3000)
bun run dev
```

Buka peramban di: **`http://localhost:3000`**

---

## 4. Validasi Produksi & Build

Untuk memastikan integritas type safety seluruh codebase:
```bash
cd /home/sans/coding/quiz_app/frontend
bun run build
```
Output:
- `tsc -b`: **0 error**
- `vite build`: Berhasil mengompilasi seluruh bundle tanpa kegagalan.
