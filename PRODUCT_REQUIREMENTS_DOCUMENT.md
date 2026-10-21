# 📋 TestHub Product Requirements Document (PRD)

> **Spesifikasi Kebutuhan Produk, Analisis Kebutuhan Pengguna, dan Strategi Profitabilitas SaaS**  
> Status: **Production Ready (Core MVP & Refactored Clean Architecture)**  
> Target: **100K Pengguna, 1K+ RPS, Infrastruktur VPS 2GB, High-Margin Profitability**

---

## 1. Ringkasan Eksekutif & Sasaran Bisnis

**TestHub** adalah platform SaaS asesmen dan tryout modern untuk menyelenggarakan ujian seleksi nasional (CPNS, SBMPTN, IQ, dan BUMN). Platform dirancang dengan **dua pilar utama**:
1. **User Experience Unggul (Cognitive-Calm & Frictionless)**: Peserta dapat mengerjakan ujian seketika tanpa rintangan login rumit, dengan penilaian instan dan analitik mendalam.
2. **Model Bisnis Sangat Menguntungkan (*High-Margin Profitability*)**: Biaya infrastruktur super hemat (Go + Redis di single VPS 2GB < Rp 200rb/bln) dipadukan dengan aliran pendapatan mikrotransaksi QRIS, Season Pass, dan bagi hasil marketplace kreator (margin kotor > 90%).

---

## 2. Eksplorasi Kebutuhan Pengguna (*Jobs to be Done*)

### 2.1 Siswa / Peserta Ujian (*Students & Examinees*)
* **Pain Points**: Tryout bimbel konvensional mahal (ratusan ribu), proses registrasi berbelit-belit, pembahasan kurang mendalam, dan tidak tahu peringkat nasional riil.
* **Kebutuhan Kunci**:
  - **Simulasi CAT Realistis**: Aturan skor persis ujian resmi (CPNS: TWK/TIU +5/0, TKP skala 1–5; UTBK: pembobotan IRT).
  - **Leaderboard & Ranking Nasional Instan**: Benchmark langsung melawan ribuan peserta lain untuk mengukur peluang kelulusan.
  - **Diagnostic Report (Weakness Heatmap)**: Identifikasi jelas sub-topik kelemahan (misal: "Lemah di Silogisme & Deret, kuat di TWK").
  - **Sertifikat & Unduh Hasil PDF**: Bukti hasil tryout resmi ber-QR Code untuk portofolio & dibagikan ke media sosial (*pemicu pertumbuhan viral organik*).
  - **Pembahasan Kunci Jawaban Interaktif**: Akses kembali pembahasan butir soal dan opsi retry khusus butir yang salah.

### 2.2 Guru / Pengajar / Bimbel (*Quiz Creators*)
* **Pain Points**: Google Form tidak memiliki timer anti-curang, penilaian esai manual memakan waktu, dan materi kuis mudah dibajak/disebarkan gratis tanpa monetisasi.
* **Kebutuhan Kunci**:
  - **Monetisasi Modul Ujian**: Kemampuan menetapkan harga pada modul tes buatan sendiri dan mencairkan pendapatan secara transparan.
  - **Bulk Import Bank Soal**: Mengunggah berkas soal massal via Excel/Word/CSV tanpa input satu per satu.
  - **Anti-Cheat / Focus Mode**: Pelacakan pergantian tab (*tab blur counter*), proteksi salin teks (*copy-paste block*), dan pengacakan opsi.
  - **Analisis Butir Soal (*Item Discrimination Index*)**: Metrik analitik tingkat kesukaran soal untuk mengevaluasi kualitas pengajaran.

### 2.3 Pemilik Platform / Founder (*Profitability & Business Growth*)
* **Tujuan**: Menghasilkan *cash flow* harian yang dapat diprediksi dengan rasio profit tinggi terhadap biaya operasional server.
* **Kebutuhan Kunci**:
  - **Payment Gateway Lokal (QRIS / E-Wallet)**: Pembayaran instan tanpa kartu kredit via Midtrans / Xendit.
  - **Admin Subscription Override & Management**: Kemampuan admin memberikan, mengubah status, memperpanjang, atau mencabut langganan user secara manual (untuk pembayaran transfer bank offline, voucher khusus, deal institusi, atau kompensasi gangguan).
  - **Dashboard Monetisasi & Payout**: Rekapitulasi omzet kotor, fee platform, dan manajemen penarikan saldo kreator.
  - **Proteksi Akses (Paywall Enforcement)**: Penguncian otomatis modul kuis berbayar sampai pembayaran terverifikasi webhook atau di-override admin.

---

## 3. Strategi Monetisasi & Profit Engine (Model Bisnis)

```
                              ALIRAN PENDAPATAN TESTHUB
                                          │
       ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
       ▼                  ▼                               ▼                  ▼
 [ Pay-Per-Tryout ]  [ Season Pass ]             [ Creator Revenue ]   [ B2B Bimbel / ]
 [ Mikrotransaksi ]  [ Subscription ]            [ Share (Komisi) ]    [ Sekolah Pass ]
   Rp 10K - 25K        Rp 49K - 99K                   20% - 30%          Rp 1.5jt - 5jt
   Via QRIS instan     Akses 3 bulan musim            Dari setiap        Paket lisensi
   Volume Masif        CPNS / UTBK akbar              penjualan guru     tahunan institusi
```

### 1. Mikrotransaksi Pay-Per-Tryout (Frictionless B2C — Volume Tinggi)
- Peserta membeli tiket sekali pakai seharga **Rp 10.000 – Rp 25.000** menggunakan QRIS langsung dari halaman tes.
- **Skema Profit:** Event Tryout Akbar CPNS dengan 5.000 peserta = **Rp 50.000.000 – Rp 125.000.000 omzet kotor**, biaya server tetap < Rp 200.000.

### 2. Pass Musim Seleksi / Unlimited Pass (B2C — Retensi Tinggi)
- Akses penuh selama 3–6 bulan ke seluruh bank soal, riwayat analitik tak terbatas, dan unduh sertifikat PDF seharga **Rp 49.000 – Rp 99.000 / musim**.

### 3. Komisi Marketplace Kreator (Marketplace Revenue Share)
- Guru dan Bimbel menjual paket latihan khusus di marketplace TestHub.
- Platform mengambil potongan **komisi 20% – 30%** dari tiap transaksi. Biaya pembuatan konten = Rp 0 bagi pemilik platform.

### 4. Lisensi Institusi B2B (Sekolah, Kampus, Bimbel Lokal)
- Paket tahunan **Rp 1.500.000 – Rp 5.000.000 / tahun** mencakup kuota 500–2.000 siswa, dashboard rekap guru, dan custom logo bimbel.

---

## 4. Matriks Spesifikasi Fitur & Roadmap Prioritas

| Prioritas | Fitur | Sasaran Pengguna | Dampak Profitabilitas & ROI | Status |
|:---:|---|---|---|:---:|
| **P0** | Core Engine: Start Sesi Non-Auth, Auto-Grading, Admin CRUD, AI Modal | Siswa, Guru | Fondasi platform ujian berkinerja tinggi | ✅ Selesai |
| **P0** | Refactored Architecture: TanStack Query v5, Zustand, Zod, Repository Pattern | Developer, AI | Stabilitas 10 tahun & pencegahan technical debt | ✅ Selesai |
| **P1** | **Payment Gateway QRIS & Paywall Enforcement** | Siswa, Admin | **Monetisasi Langsung**: Membuka gembok tes berbayar seketika | ✅ Selesai (FE + BE) |
| **P1** | **Admin Manual Subscription Override** | Admin | **Fleksibilitas B2B / Offline**: Grant, extend, revoke akses | ✅ Selesai (FE + BE) |
| **P1** | **Sertifikat Kelulusan & Verifikasi Publik** | Siswa, Publik | **Pemicu Viralitas**: UUID verifikasi resmi & anti-pemalsuan | ✅ Selesai (FE + BE) |
| **P1** | **Leaderboard & Ranking Nasional Instan** | Siswa | **Meningkatkan Retensi**: Benchmarking kompetitif peserta | ✅ Selesai (FE + BE) |
| **P1.5** | **Behavioral Psychological Homepage & Trust Engine** | Siswa, Publik | **Optimasi Konversi (CRO)**: +35% Checkout QRIS, -40% Bounce Rate | 🚀 Sprint Aktif |
| **P2** | **Weakness Diagnostic Report (Heatmap Topik)** | Siswa, Guru | **Alasan Upgrade**: Memberi nilai tambah dibanding tryout gratis | 📋 Terjadwal |
| **P2** | **Creator Monetization & Payout Dashboard** | Guru, Admin | **Marketplace Expansion**: Komisi pasif dari konten kreator | 📋 Terjadwal |
| **P2** | **Bulk Import Soal (Excel / Word / CSV)** | Guru | **Efisiensi Onboarding**: Memperbanyak bank soal dalam hitungan menit | 📋 Terjadwal |
| **P3** | **Anti-Cheat Focus Mode (Tab blur & Copy lock)** | Guru, Siswa | **Nilai Jual B2B**: Standar ujian sekolah / sertifikasi resmi | 📋 Terjadwal |
| **P3** | **Streaming AI Question Generator (SSE)** | Guru | **Pengalaman Interaktif**: Peningkatan fitur asisten AI | 📋 Terjadwal |

---

## 5. Kriteria Penerimaan Kunci (*Acceptance Criteria*)

- **AC-01 (Paywall & Pembayaran Instan)**: Saat peserta mengklik modul berbayar, modal QRIS muncul; setelah QRIS di-scan dan dibayar, sesi ujian langsung aktif dalam < 3 detik tanpa refresh manual.
- **AC-02 (Integritas Ujian)**: Kunci jawaban dan teks pembahasan tidak boleh bocor pada network inspector browser sebelum status ujian selesai.
- **AC-03 (Auto-Submit Saat Waktu Habis)**: Countdown timer mencapai `00:00:00` otomatis mengunci pengerjaan dan mengirim lembar jawaban ke server.
- **AC-04 (Keandalan Skalabilitas)**: Single VPS 2GB mampu melayani lonjakan 1.000 RPS saat Tryout Akbar serentak tanpa *service crash*.
- **AC-05 (Admin Manual Subscription Override)**: Admin dapat secara manual mengaktifkan, memperpanjang, atau mencabut langganan pengguna dengan alasan audit yang tercatat di database, dan hak akses tes langsung aktif seketika tanpa melalui payment gateway.
- **AC-06 (Verifikasi Sertifikat)**: Siapa saja dapat memverifikasi keaslian nilai sertifikat kelulusan melalui endpoint `/api/verify/certificate/:certificateId`.

---

## 6. Spesifikasi Pengelompokan Akses Berdasarkan Role

Untuk menjaga arsitektur bersih (*Clean Architecture*) dan mencegah eskalasi hak akses, API TestHub dibagi menjadi 3 tingkatan role:

| Tingkatan Role | Lingkup Pengguna | Proteksi Middleware | Cakupan Fitur Utama |
|---|---|---|---|
| **🌐 Public** | Peserta ujian anonim & pengunjung umum | Rate Limiting per-IP (`10–30 req/m`) | Registrasi/Login, Katalog Ujian, Leaderboard Instan, Mesin Sesi Ujian & Auto-grading, Verifikasi Sertifikat Publik, Invoice & Webhook Pembayaran QRIS, AI Question Assistant. |
| **👤 User (Examinee)** | Pengguna terdaftar terautentikasi | `AuthRequired(JWTSecret)` | Profil Pengguna (`/api/user/me`), Riwayat Langganan & Modul Ujian Aktif (`/api/user/subscriptions`). |
| **👑 Admin & Creator** | Pengajar & Pengelola Platform | `AuthRequired` + `RequireAdmin` | Ringkasan Statistik Platform, CRUD Modul & Bank Soal, Unggah Media Gambar, Antrean Penilaian Esai Manual, Manajemen Langganan & Manual Grant Override. |

> 📖 **Kontrak Endpoint & Skema Request/Response Lengkap:** Lihat [SYSTEM_ARCHITECTURE.md](file:///home/sans/coding/quiz_app/SYSTEM_ARCHITECTURE.md).


