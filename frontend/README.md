# 🎨 TestHub Frontend (React + TypeScript + Bun)

Frontend SPA untuk **TestHub SaaS Assessment Platform**, dibangun dengan **React 19**, **TypeScript**, **Vite**, **Bun**, dan **Tailwind CSS**.

Sesuai dengan:
- [PRODUCT_REQUIREMENTS_DOCUMENT.md](file:///home/sans/coding/quiz_app/PRODUCT_REQUIREMENTS_DOCUMENT.md)
- [style.md](file:///home/sans/coding/quiz_app/style.md) (Strict Anti-AI Slop, Tri-Color System, Cognitive-Calm)
- [ARCHITECTURE_AND_SCHEMA.md](file:///home/sans/coding/quiz_app/ARCHITECTURE_AND_SCHEMA.md)
- [IMPLEMENTATION_AND_CODE.md](file:///home/sans/coding/quiz_app/IMPLEMENTATION_AND_CODE.md)
- [AI_AGENT_AND_SECURITY.md](file:///home/sans/coding/quiz_app/AI_AGENT_AND_SECURITY.md)

---

## ⚡ Fitur Utama

1. **Katalog Ujian Publik (`/`)**:
   - Filter kategori: CPNS / Kedinasan, UTBK-SNBT, Tes IQ Raven Matrices, BUMN AKHLAK.
   - Fitur pencarian instan dan ringkasan passing grade.
2. **Pengerjaan Soal Tanpa Login / Non-Auth (`/test/:testId`)**:
   - Pembuatan token sesi unik otomatis (US-001).
   - Sticky header dengan timer tabular countdown (`JetBrains Mono` / `tabular-nums`).
   - Progress bar tipis aksen (3px).
   - Pilihan ganda interaktif (state terpilih: border aksen, tint soft, badge solid A/B/C/D).
   - Input jawaban esai analitis dengan penghitung karakter.
   - Drawer navigasi nomor soal dengan penanda status (Terjawab, Ragu-ragu, Belum Dijawab, Aktif).
   - Simpan otomatis (*auto-save*) secara periodik.
   - Modal konfirmasi rekapitulasi sebelum final submit.
3. **Hasil & Analitik Skor (`/results/:resultId`)**:
   - Display typography skor akhir dan status passing grade.
   - Peringkat persentil terhadap seluruh peserta (*"Top 15%"* - US-003).
   - Analisis performa berdasarkan domain kompetensi.
   - Review soal lengkap dengan filter (Semua, Benar, Salah, Ragu).
   - Kotak pembahasan dengan aksen stroke kiri 3px sesuai `style.md`.
4. **Dashboard Pengajar / Admin (`/admin`)**:
   - Login admin dengan opsi 1-klik Demo Login (`/login`).
   - Telemetri performa sistem (p95 < 200ms, DB latency, throughput).
   - Manajemen modul ujian (publikasikan draf, uji coba tampilan peserta, hapus).
   - Formulir pembuat ujian & editor butir soal (Pilihan Ganda & Esai).
   - Workbench koreksi esai dengan template rubrik instan (US-103).
   - Asisten AI Generator Soal sesuai spesifikasi prompt di `AI_AGENT_AND_SECURITY.md`.
5. **Skema Harga & Monetisasi (`/pricing`)**:
   - Rincian paket lisensi: Free, Basic (Rp 75k), Pro Creator (Rp 150k), dan Institusi B2B.
6. **Strict Cognitive-Calm Design System**:
   - Tri-Color System murni untuk Light Mode dan Night/Dark Mode.
   - Bebas neon gradient, zero blurry shadows, tipografi bersih kontras tinggi.
   - Toggle tema Light / Dark mode instan.

---

## 🚀 Menjalankan Project

### Menggunakan Bun (Direkomendasikan):

```bash
# Masuk ke direktori frontend
cd frontend

# Install dependensi
bun install

# Menjalankan server development
bun run dev

# Membangun bundle produksi
bun run build

# Menjalankan linter
bun run lint
```

Server development aktif di: `http://localhost:3000`
