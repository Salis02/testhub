# 📋 TestHub Product Requirements Document (PRD)

> **Spesifikasi Kebutuhan Produk, Fitur Inti, dan Kriteria Keberhasilan Platform Asesmen SaaS**  
> Status: **Production Ready (Core MVP & Admin Tools Completed)**  
> Target: **100K Pengguna, 1K+ RPS, Infrastruktur VPS 2GB**

---

## 1. Ringkasan Eksekutif & Sasaran

**TestHub** adalah platform SaaS terpadu untuk menyelenggarakan berbagai modul ujian berstandar nasional (CPNS, SBMPTN, IQ, dan Custom BUMN) dengan sistem auto-grading instan, analitik performa kategori, evaluasi esai manual, dan integrasi generator soal AI cerdas.

### Metrik Kunci
- **Arsitektur Pengguna**: Alur ujian publik mandiri tanpa login (*Non-Authenticated Session Token*).
- **Target Beban**: 1000+ request per detik pada single VPS 2GB (efisiensi Go + Redis).
- **Waktu Respons**: Latensi p95 < 200ms untuk penyimpanan jawaban dan kalkulasi skor.

---

## 2. Persona Pengguna

1. **Peserta Ujian (*Individual Test Taker*)**:
   - Siswa/mahasiswa/pencari kerja (usia 16–35 tahun) yang membutuhkan latihan ujian cepat tanpa hambatan registrasi rumit.
   - Kebutuhan: Akses instan ke katalog tryout, interface fokus tanpa gangguan, timer akurat, dan pembahasan kunci jawaban mendalam setelah ujian.
2. **Pengelola / Guru / Kreator (*Quiz Admin & Creator*)**:
   - Guru, institusi, atau kreator konten kuis (usia 25+).
   - Kebutuhan: Dashboard pembuatan tes, editor butir soal A–E, upload diagram/gambar soal, penentuan passing grade, dan antrean penilaian esai.

---

## 3. Spesifikasi Fitur Inti & Status Implementasi

| Modul | Spesifikasi Kebutuhan | Status |
|---|---|:---:|
| **Katalog & Filter** | Halaman utama publik dengan pencarian judul kuis dan filter kategori (CPNS, SBMPTN, IQ, BUMN). | ✅ Selesai |
| **Sesi Anonim** | Pembuatan token sesi unik berbasis UUID tanpa registrasi awal (`POST /api/tests/:id/start`). | ✅ Selesai |
| **Antarmuka Ujian** | Tampilan ujian *cognitive-calm*, timer countdown otomatis, navigasi nomor, flag ragu-ragu, dan render media gambar. | ✅ Selesai |
| **Penyimpanan Jawaban** | Auto-save jawaban real-time ke database PostgreSQL secara idempoten (anti-duplikasi). | ✅ Selesai |
| **Auto-Grading Pilihan Ganda**| Evaluasi nilai instan saat ujian diselesaikan berdasarkan formula bobot dan kriteria kelulusan. | ✅ Selesai |
| **Pembahasan & Analitik** | Halaman hasil menampilkan skor total, persentil, breakdown kategori, dan ulasan pembahasan butir soal. | ✅ Selesai |
| **Editor Modul Ujian** | Admin modal untuk update metadata ujian, butir soal, opsi A–E, kunci jawaban, dan upload gambar soal (maks 2MB). | ✅ Selesai |
| **Upload Media Soal** | Pengunggahan gambar ilustrasi/grafik soal (`POST /api/admin/upload-media`) dengan validasi MIME-type aman. | ✅ Selesai |
| **AI Question Generator** | Asisten AI sintesis bank soal berstandar nasional (Gemini 2.5 Flash / Groq) dengan dynamic progress bar & abort controller. | ✅ Selesai |
| **Antrean Penilaian Esai** | Interface admin untuk memeriksa jawaban esai peserta dan memberikan skor serta feedback kustom. | ✅ Selesai |

---

## 4. Kriteria Penerimaan Kunci (*Acceptance Criteria*)

- **AC-01 (Mulai Tanpa Login)**: Pengunjung dapat mengklik kuis apapun di homepage dan langsung memulai pengerjaan dalam < 2 detik tanpa formulir registrasi.
- **AC-02 (Integritas Ujian)**: Kunci jawaban dan teks pembahasan tidak boleh bocor pada inspeksi inspect-element/network devtools selama sesi ujian berstatus aktif.
- **AC-03 (Auto-Submit Saat Waktu Habis)**: Ketika countdown timer mencapai `00:00:00`, aplikasi otomatis mengunci form dan mengirimkan seluruh jawaban tersimpan.
- **AC-04 (Penilaian Akurat)**: Skor pilihan ganda terhitung seketika tanpa jeda pemrosesan latar belakang yang lama.

---

## 5. Model Monetisasi (Freemium + Subscription)

1. **Free Tier**: Akses 3 kuis gratis per bulan, skor dasar, retensi riwayat hasil 24 jam.
2. **Basic (Peserta Mandiri)**: Akses kuis tanpa batas, pembahasan mendalam, unduh sertifikat PDF, retensi riwayat 1 tahun ($4.99 - $6.99/bln).
3. **Pro (Kreator Konten)**: Pembuatan kuis mandiri, dashboard analitik peserta, ekspor data, hingga 100 soal AI/bln ($9.99 - $12.99/bln).
4. **Institution (B2B Sekolah/Bimbel)**: Lisensi tahunan, opsi white-label, bulk user management, integrasi API kustom.

---

## 6. Persyaratan Kualitas & SLA Teknis

- **Uptime Target**: 99.5% ketersediaan layanan.
- **Kecepatan Muat**: < 2 detik pada koneksi internet seluler 4G.
- **Keamanan**: Wajib HTTPS, proteksi XSS/SQL Injection, rate limiting per-IP, dan sanitasi file upload.
- **Desain & UX**: Wajib mematuhi [style.md](file:///home/sans/coding/quiz_app/style.md) (Strict Tri-Color per mode, bebas AI-slop).
