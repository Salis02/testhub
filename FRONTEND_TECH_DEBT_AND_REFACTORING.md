# 🛠️ TestHub Frontend Technical Debt Audit & Refactoring Blueprint

> **Dokumen Audit Teknis, Analisis Utang Kode, dan Panduan Refactoring Skala Produksi**  
> Ditulis oleh: **Senior Fullstack IT Architect**  
> Sasaran: **Mengubah arsitektur frontend prototipe menjadi Enterprise/Production Ready**  
> Referensi Kode: [frontend/src/services/api.ts](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts) | [TestPage.tsx](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx) | [TestCreatorModal.tsx](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestCreatorModal.tsx)

---

## 1. Executive Summary & Audit Scorecard

Saat ini, frontend TestHub berada di **fase transisi kritis**: dari *Rapid Prototyping / MVP* menuju *Production Scale*. Fitur aplikasi berjalan dengan baik, tetapi **fondasi kode mulai rapuh**. Jika dipaksakan menambah 2–3 modul besar berikutnya (misal: pembayaran Stripe/Midtrans, sertifikat PDF, realtime proctoring), tim pengembang akan terjebak dalam *debugging spiral*.

### 📊 Kartu Skor Kesehatan Kode (Code Health Scorecard)

| Area Arsitektur | Status Saat Ini | Skor Kesehatan | Dampak Risiko |
|---|---|:---:|---|
| **API & Networking Layer** | Monolitik (`api.ts` ~800 baris) + Simulasi `localStorage` | **4 / 10** | **Kritis** (Split-brain data, silent failures) |
| **Server State & Caching** | Manual `useState` + `useEffect` fetching | **5 / 10** | **Tinggi** (Waterfall refetch, race conditions) |
| **Form Management & Validation**| Input terkontrol manual + string check seadanya | **4 / 10** | **Tinggi** (Mutasi objek nested, edge-case bocor) |
| **Test Session State** | 10 `useState` di satu halaman [`TestPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx) | **5 / 10** | **Sedang** (Re-render cascade, interval drift) |
| **UI Components & Styling** | Tailwind CSS + Tri-Color ([style.md](file:///home/sans/coding/quiz_app/style.md)) + DRY Modals | **9 / 10** | **Rendah** (Sangat rapi, modular, bebas AI-slop) |

---

## 2. Analisis Mendalam 5 Utang Teknis Utama (Root Cause Analysis)

### 🔴 Debt 1: Dual-Backend Syndrome di `api.ts` (Split-Brain Bug)
File [`api.ts`](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts) membengkak menjadi hampir 800 baris bukan hanya karena jumlah endpoint, melainkan karena **mengimplementasikan 2 backend paralel sekaligus**:
1. Mengirim `fetch` ke server Go (`http://localhost:8000/api/...`).
2. Jika server error / token 401 / jaringan timeout, ia masuk ke blok `catch` dan **diam-diam beralih menjalankan simulator database di `localStorage`**.

```typescript
// ❌ POLA BERBAHAYA DI api.ts SAAT INI:
async listTests(category?: string, query?: string) {
  try {
    const res = await fetch(...)
    if (res.ok) return await res.json()
  } catch {
    // Silent fallback: menyembunyikan error jaringan/server!
  }
  // Simulasi query DB manual di browser...
  let tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
  return tests.filter(...)
}
```

* **Bahaya di Produksi:**
  - **Split-Brain Data:** Admin mengira modul tes berhasil dibuat atau peserta mengira ujian tersimpan, padahal database PostgreSQL tidak pernah menerimanya (hanya tersimpan di browser lokal peserta). Begitu peserta mengganti HP/laptop, hasil ujian hilang.
  - **Maintenance Overhead:** Setiap perubahan skema di Go backend harus ditulis dua kali (di backend Go dan di logika simulator TypeScript `api.ts`).

---

### 🔴 Debt 2: State Manual Sprawl & Re-render Cascades
Pada [`TestPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx), komponen memegang **10 `useState` terpisah**:
```typescript
const [session, setSession] = useState<TestSession | null>(null)
const [questions, setQuestions] = useState<Question[]>([])
const [currentIndex, setCurrentIndex] = useState(0)
const [submissions, setSubmissions] = useState<Record<string, UserSubmission>>({})
const [secondsLeft, setSecondsLeft] = useState<number>(0)
const [loading, setLoading] = useState(true)
const [isDrawerOpen, setIsDrawerOpen] = useState(false)
const [isModalOpen, setIsModalOpen] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Tersinkronisasi')
```

* **Bahaya di Produksi:**
  - **Re-render Setiap Detik:** Perubahan `secondsLeft` setiap 1000ms memicu re-evaluasi seluruh virtual DOM halaman ujian (termasuk drawer soal dan card soal).
  - **State Inconsistency:** Mengatur `setLoading(true)` dan `setLoading(false)` manual di puluhan blok `try-finally` rentan meninggalkan tombol dalam kondisi *infinite loading* jika ada exception tak tertangkap.

---

### 🔴 Debt 3: Validasi Form Manual & Mutasi Objek Nested
Di [`TestCreatorModal.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestCreatorModal.tsx) dan [`TestEditorModal.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/admin/TestEditorModal.tsx), validasi hanya mengandalkan pengecekan seadanya:
```typescript
if (!title.trim()) {
  toast.warning('Validasi Diperlukan', 'Judul modul ujian tidak boleh kosong.')
  return
}
```

* **Bahaya di Produksi:**
  - **Data Cacat Lolos ke Server:** Tidak ada pengecekan apakah butir soal memiliki teks kosong, apakah ada opsi yang kosong, apakah tepat ada 1 kunci `is_correct: true`, atau apakah skor total valid.
  - **Direct Mutation Anti-Pattern (React 19 Risk):**
    ```typescript
    // ❌ Mutasi referensi objek langsung di dalam array state:
    const updated = [...questions]
    updated[qIdx].options[optIdx].option_text = e.target.value
    setQuestions(updated)
    ```
    Objek `options[optIdx]` dimutasi langsung sebelum kloning. Di React 19 Concurrent rendering, ini dapat menyebabkan UI melewatkan re-render (*stale closure*).

---

### 🔴 Debt 4: Waterfall Refetching Tanpa Cache Invalidation
Pada [`AdminPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/AdminPage.tsx#L62-L85):
```typescript
const handleTogglePublish = async (testId: string) => {
  await api.adminTogglePublish(testId)
  await loadData() // ❌ Menarik ULANG: Stats + Seluruh Tes + Seluruh Esai sekaligus!
}
```

* **Bahaya di Produksi:**
  - Setiap interaksi kecil memicu 3 network request berat secara serakah.
  - Tidak ada *deduplication request*: jika dua komponen meminta daftar tes bersamaan, dua HTTP request terpisah dikirim ke backend.
  - Ketiadaan *Optimistic UI*: Pengguna harus menunggu round-trip jaringan sebelum switch tombol berubah posisi.

---

### 🔴 Debt 5: Race Conditions & Type Drift
- **Race Condition:** Fetch di `useEffect` tidak memiliki `AbortController`. Jika user mengetik filter pencarian di `HomePage` dengan cepat, respons dari request lambat pertama bisa tiba setelah respons request cepat kedua, menimpa hasil filter yang benar.
- **Runtime Type Drift:** TypeScript hanya memvalidasi tipe saat compile time (`bun run build`). Jika backend Go mengubah struktur JSON di runtime, aplikasi langsung crash dengan error `Cannot read properties of undefined` tanpa pesan fallback yang jelas.

---

## 3. Arsitektur Target (Production-Grade Architecture)

```
                    ARSITEKTUR FRONTEND ENTERPRISE
                    
      [ Komponen UI & Halaman (Presentational / Views) ]
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  [ Forms Layer ]    [ Server State ]     [ Client Store ]
  React Hook Form    TanStack Query v5       Zustand
        +                  │                   │
    Zod Schema      (Cache, Invalidate,   (Active Exam Session,
  (Runtime DTO)     Optimistic Updates)    Timer, Local Auto-Save)
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
               [ Domain API Services ]
          ├── services/tests.api.ts
          ├── services/sessions.api.ts
          ├── services/admin.api.ts
          └── services/ai.api.ts
                           │
                           ▼
               [ Core HTTP Client ]
             services/client.ts (Fetch/Axios)
         (JWT Auth, Interceptors, Normalizer)
                           │
                           ▼
                  [ Go Backend API ]
```

---

## 4. Rencana Refactoring Bertahap (Step-by-Step Blueprint)

### 📦 Dependensi yang Diperlukan
Jalankan di direktori `frontend/`:
```bash
bun add @tanstack/react-query react-hook-form @hookform/resolvers zod zustand
```

---

### 🚀 FASE 1: Dekomposisi `api.ts` & Core HTTP Client (Prioritas 1)

Pisahkan monolitik `api.ts` menjadi berkas per domain di `frontend/src/services/`:

#### A. Buat `src/services/client.ts` (Core HTTP Client)
```typescript
// src/services/client.ts
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '') + '/api'

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('testhub_auth_token')
  
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Tangani 401 Unauthorized terpusat
  if (res.status === 401) {
    localStorage.removeItem('testhub_auth_token')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?reason=expired`
    }
    throw new ApiError(401, 'Sesi Anda telah berakhir. Silakan login kembali.')
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message = errorData?.error || `Request gagal dengan status ${res.status}`
    throw new ApiError(res.status, message, errorData)
  }

  return res.json()
}
```

#### B. Pecah Domain Service
- `src/services/tests.api.ts`: `listTests`, `getTestById`
- `src/services/sessions.api.ts`: `startTest`, `getSessionQuestions`, `submitAnswer`, `finishTest`, `getResult`
- `src/services/admin.api.ts`: `getAdminStats`, `createTest`, `updateTest`, `deleteTest`, `uploadMedia`
- `src/services/ai.api.ts`: `generateQuestions`

> **Prinsip Utama:** Buang seluruh simulasi `localStorage` dari production client. Jika server offline, tampilkan error terstandar (*Fail Fast*) alih-alih berpura-pura sukses menyimpan ke browser lokal.

---

### 🚀 FASE 2: Adopsi TanStack Query v5 untuk Server State (Prioritas 2)

#### A. Setup Provider di `App.tsx`
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 Menit cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* Router & Contexts */}
  </QueryClientProvider>
)
```

#### B. Mengubah `AdminPage.tsx` Menjadi Reaktif & Bersih
```tsx
// ❌ DULU: 40 baris manual state & loadData()
// ✅ SEKARANG:
export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient()

  // 1. Data fetching otomatis dengan auto-cache & deduping
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  })

  const { data: tests, isLoading: loadingTests } = useQuery({
    queryKey: ['admin', 'tests'],
    queryFn: adminApi.listTests,
  })

  // 2. Mutasi cerdas dengan cache invalidation terarah (tanpa waterfall)
  const toggleMutation = useMutation({
    mutationFn: (testId: string) => adminApi.togglePublish(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] }) // Hanya refetch tes!
      toast.success('Status Diperbarui', 'Status publikasi tes berhasil diubah.')
    },
  })

  // ...
}
```

---

### 🚀 FASE 3: Standardisasi Validasi Form dengan React Hook Form + Zod (Prioritas 3)

#### A. Definisikan Skema Zod ([`src/schemas/test.schema.ts`](file:///home/sans/coding/quiz_app/frontend/src/types/index.ts))
```typescript
import { z } from 'zod'

export const OptionSchema = z.object({
  id: z.string().optional(),
  option_letter: z.enum(['A', 'B', 'C', 'D', 'E']),
  option_text: z.string().min(1, 'Pilihan jawaban tidak boleh kosong'),
  is_correct: z.boolean(),
})

export const QuestionSchema = z.object({
  question_number: z.number(),
  question_text: z.string().min(10, 'Teks soal minimal 10 karakter'),
  question_type: z.enum(['multiple_choice', 'essay']),
  difficulty_level: z.enum(['easy', 'medium', 'hard']),
  points: z.number().min(1).max(100),
  explanation: z.string().optional(),
  media_url: z.string().optional(),
  options: z.array(OptionSchema).refine(
    (opts) => opts.filter((o) => o.is_correct).length === 1,
    'Tepat harus ada 1 kunci jawaban benar'
  ),
})

export const TestFormSchema = z.object({
  title: z.string().min(5, 'Judul minimal 5 karakter').max(120),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter'),
  category: z.enum(['cpns', 'sbmptn', 'iq', 'custom']),
  duration_minutes: z.number().min(5).max(300),
  passing_score_percentage: z.number().min(1).max(100),
  questions: z.array(QuestionSchema).min(1, 'Modul harus memiliki minimal 1 soal'),
})

export type TestFormValues = z.infer<typeof TestFormSchema>
```

#### B. Implementasikan di `TestCreatorModal.tsx`
```tsx
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TestFormSchema, TestFormValues } from '@/schemas/test.schema'

export const TestCreatorModal: React.FC = () => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TestFormValues>({
    resolver: zodResolver(TestFormSchema),
    defaultValues: { category: 'cpns', duration_minutes: 30, questions: [...] }
  })

  // useFieldArray mengelola mutasi array soal tanpa bug mutasi manual
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  })

  const onSubmit = async (values: TestFormValues) => {
    // 100% Data terjamin valid, bebas edge-case
    await createTestMutation.mutateAsync(values)
  }

  // Tampilkan errors.title?.message langsung di bawah input
}
```

---

### 🚀 FASE 4: Zustand Store Khusus Sesi Ujian (`TestPage.tsx`) (Prioritas 4)

Pindahkan alur pengerjaan ujian ke store terisolasi [`src/stores/useTestSessionStore.ts`](file:///home/sans/coding/quiz_app/frontend/src):
```typescript
import { create } from 'zustand'
import { Question, TestSession, UserSubmission } from '@/types'

interface TestSessionState {
  session: TestSession | null
  questions: Question[]
  currentIndex: number
  submissions: Record<string, UserSubmission>
  secondsLeft: number
  autoSaveStatus: 'synced' | 'saving' | 'error'
  
  // Actions
  initSession: (session: TestSession, questions: Question[], subs: Record<string, UserSubmission>) => void
  setCurrentIndex: (index: number) => void
  tickTimer: () => void
  selectAnswer: (questionId: string, optionId: string) => void
  toggleFlag: (questionId: string) => void
}

export const useTestSessionStore = create<TestSessionState>((set, get) => ({
  session: null,
  questions: [],
  currentIndex: 0,
  submissions: {},
  secondsLeft: 0,
  autoSaveStatus: 'synced',

  initSession: (session, questions, submissions) =>
    set({ session, questions, submissions, secondsLeft: session.test.duration_minutes * 60 }),

  setCurrentIndex: (currentIndex) => set({ currentIndex }),

  tickTimer: () =>
    set((state) => ({ secondsLeft: Math.max(0, state.secondsLeft - 1) })),

  selectAnswer: (questionId, optionId) => {
    // Update atomic & picu background debounced save
    set((state) => ({
      submissions: {
        ...state.submissions,
        [questionId]: {
          ...state.submissions[questionId],
          question_id: questionId,
          selected_option_id: optionId,
          answered_at: new Date().toISOString(),
        },
      },
    }))
  },

  toggleFlag: (questionId) => {
    set((state) => {
      const current = state.submissions[questionId]
      return {
        submissions: {
          ...state.submissions,
          [questionId]: {
            ...current,
            question_id: questionId,
            is_flagged: !current?.is_flagged,
          },
        },
      }
    })
  },
}))
```

> **Dampak Luar Biasa:** [`TestPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx) menyusut dari **300 baris menjadi < 100 baris kode presentasional murni**. Komponen Timer hanya berlangganan ke `secondsLeft`, sehingga tidak me-render ulang card soal setiap detik!

---

## 5. Matriks Komparasi Sebelum vs Sesudah Refactoring

| Aspek Frontend | 🔴 Sebelum Refactoring | 🟢 Setelah Refactoring |
|---|---|---|
| **Networking** | 1 file `api.ts` raksasa (790 baris) | Terbagi modular (`tests.api.ts`, `sessions.api.ts`, dll) |
| **Error Handling** | Silent fallback ke localStorage | Fail-fast transparan dengan kode status HTTP asli |
| **Data Fetching** | Manual `useEffect` + `useState(loading/error)` | 1 baris deklaratif `useQuery(...)` |
| **Form Inputs** | Puluhan `value` + `onChange` manual | `useForm()` + `register()` yang ringan |
| **Validasi Form** | `if (!title.trim())` seadanya | Skema Zod komprehensif (kunci benar, rentang skor) |
| **Ujian State** | 10 `useState` di halaman utama | Store terpusat Zustand (`useTestSessionStore`) |
| **Performa Render** | Re-render seluruh halaman tiap 1 detik | Isolated re-render hanya pada widget timer |

---

## 6. Action Plan & Roadmap Eksekusi

1. **Sprint 1 (Fondasi Jaringan)**: Pasang HTTP client terpadu ([`client.ts`](file:///home/sans/coding/quiz_app/frontend/src/services/api.ts)), pisahkan file domain service, dan matikan silent fallback localStorage.
2. **Sprint 2 (Server State)**: Pasang `@tanstack/react-query`, refactor data fetching di `HomePage` dan `AdminPage`.
3. **Sprint 3 (Form Hardening)**: Pasang `react-hook-form` + `zod`, terapkan skema validasi ketat di `TestCreatorModal` dan `TestEditorModal`.
4. **Sprint 4 (Exam Performance)**: Pasang `zustand`, pindahkan state `TestPage` ke `useTestSessionStore` untuk pengerjaan ujian yang mulus 60 FPS tanpa lag input.
