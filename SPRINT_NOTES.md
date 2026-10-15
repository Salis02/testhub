# 🚀 TestHub Sprint Notes & Feature Roadmap

> **Catatan Rekapitulasi Sprint, Fitur Baru yang Selesai, dan Eksplorasi Peluang Fitur Masa Depan**  
> Status Repositori: **Production Grade (Clean Architecture + CodeGraph-Indexed)**  
> Terakhir Diperbarui: **Oktober 2026**

---

## 1. Ringkasan Pencapaian Sprint Ini (Completed)

| Fitur / Modul | Layer | Detail Implementasi & Kode |
|---|---|---|
| **CodeGraph Integration** | Tooling / AI | Integrasi Semantic AST CodeGraph untuk navigasi kode instan (`explore`, `context`, `impact`, `callers`, `callees`). |
| **Konsolidasi Dokumentasi** | Docs | Merampingkan 4 file markdown redundan menjadi single source of truth: [`SYSTEM_ARCHITECTURE.md`](file:///home/sans/coding/quiz_app/SYSTEM_ARCHITECTURE.md). |
| **Audit Log Admin** | Backend + Frontend | Endpoint `GET /api/admin/audit-logs`, pencatatan otomatis audit (`toggle_publish`, `delete_test`, `update_role`), dan model domain. |
| **Fondasi Frontend Terpusat** | Frontend Common | Menghilangkan bottleneck FE: [`formatters.ts`](file:///home/sans/coding/quiz_app/frontend/src/utils/formatters.ts), [`Pagination.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/Pagination.tsx), [`EmptyState.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/EmptyState.tsx), [`Modal.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/Modal.tsx), [`Button.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/Button.tsx), [`usePagination.ts`](file:///home/sans/coding/quiz_app/frontend/src/hooks/usePagination.ts), [`useDebounce.ts`](file:///home/sans/coding/quiz_app/frontend/src/hooks/useDebounce.ts). |
| **Responsivitas Mobile Penuh** | UI/UX | Drawer navigasi mobile di [`Header.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/Header.tsx), de-cluttering [`Footer.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/Footer.tsx) (hemat 50% ruang visual), dan overlay drawer nomor soal di [`TestPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/TestPage.tsx). |
| **Riwayat Ujian Siswa** | Backend API | Migrasi `003`, endpoint `GET /api/user/history` dan `GET /api/user/stats` dengan agregasi skor dan kelulusan. |
| **Manajemen Pengguna Admin** | Backend API | Endpoint `GET /api/admin/users`, `PATCH /api/admin/users/:userId/status`, dan `PUT /api/admin/users/:userId/role` terhubung ke audit log. |

---

## 2. Eksplorasi Peluang Fitur Baru (Next Feature Possibilities)

Berdasarkan analisis kebutuhan pengguna asesmen (PRD), berikut 4 kandidat fitur prioritas tinggi berikutnya:

```
                                  PELUANG FITUR BARU
                                           │
        ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
        ▼                  ▼                               ▼                  ▼
   [ Fitur A ]        [ Fitur B ]                     [ Fitur C ]        [ Fitur D ]
   Bulk Import        IRT Scoring                     Web Proctoring     Adaptive Quiz
   Soal (Excel)       (Standar UTBK)                  (Anti-Curang)      (AI Real-time)
  Efisiensi Guru     Diferensiasi Bobot              Integritas Ujian   Tingkat Kesulitan
  & Bimbel Besar     Nilai Nasional                  Resmi Kedinasan    Menyesuaikan Siswa
```

### 1. Fitur A: Bulk Import / Export Bank Soal (Excel / Word / CSV) — *Priority: HIGH*
- **Kebutuhan Pengguna:** Guru dan bimbingan belajar memiliki puluhan dokumen soal di Word/Excel. Menginput soal satu demi satu melalui antarmuka web memakan waktu berjam-jam.
- **Implementasi Teknis:**
  - Pustaka Go `github.com/xuri/excelize/v2` untuk membaca berkas `.xlsx`.
  - Endpoint `POST /api/admin/tests/:testId/import-questions` yang menerima multipart form-data.
  - Template spreadsheet resmi dengan kolom: *Nomor, Teks Soal, Opsi A, B, C, D, E, Kunci, Bobot, Pembahasan*.

### 2. Fitur B: Item Response Theory (IRT) Scoring Engine — *Priority: HIGH*
- **Kebutuhan Pengguna:** Ujian resmi seleksi nasional (UTBK-SNBT Kemendikbudristek) tidak lagi memakai sistem skor klasik (skor benar dikali poin). Butir soal yang dijawab salah oleh mayoritas peserta akan otomatis bernilai bobot lebih tinggi.
- **Implementasi Teknis:**
  - Ekstensi [`scoring.go`](file:///home/sans/coding/quiz_app/backend/internal/services/scoring.go) dengan algoritma 2PL (*Two-Parameter Logistic Model*: tingkat kesukaran dan daya pembeda butir soal).
  - Background worker kalkulasi bobot pasca-selesai tryout akbar.

### 3. Fitur C: Anti-Cheat & Web Proctoring Suite — *Priority: MEDIUM*
- **Kebutuhan Pengguna:** Ujian berbayar / bersertifikat resmi membutuhkan garansi bahwa peserta tidak membuka tab lain atau meminta bantuan AI saat mengerjakan soal.
- **Implementasi Teknis:**
  - Window blur listener: Mencatat frekuensi pergantian tab (*tab switch counter*) ke database.
  - Full-screen enforcement: Menampilkan dialog peringatan jika peserta keluar dari mode layar penuh.
  - Clipboard copy-paste blocker pada teks butir soal.

### 4. Fitur D: Computerized Adaptive Testing (CAT) Dinamis — *Priority: MEDIUM*
- **Kebutuhan Pengguna:** Pada tes IQ atau asesmen bakat, butir soal berikutnya menyesuaikan performa peserta: jika menjawab benar, soal berikutnya semakin sulit; jika salah, tingkat kesulitan menurun.
- **Implementasi Teknis:**
  - Endpoint session dinamis `POST /api/sessions/:sessionId/next-question`.

---

## 3. Cheatsheet CodeGraph untuk Sprint Selanjutnya

Saat mulai mengerjakan fitur baru di sprint mendatang, gunakan perintah navigasi cepat berikut:

```bash
# 1. Menelusuri seluruh rute & middleware yang aktif
codegraph explore "SetupRouter"

# 2. Menelusuri logika penilaian scoring engine
codegraph explore "CalculateScore"

# 3. Menelusuri manajemen pengguna & hak akses
codegraph explore "UserRepository"

# 4. Menelusuri controller ujian publik & sesi
codegraph explore "PublicHandler"

# 5. Menganalisis dampak perubahan sebelum refactoring
codegraph impact "AdminHandler"
```
