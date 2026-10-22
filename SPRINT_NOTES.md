# 🚀 TestHub Sprint Notes & Active Backlog

> **Fokus Utama: Sprint Aktif Redesign Homepage & Behavioral Psychology Engine (CRO & Trust)**  
> Status Repositori: **Production Grade (Clean Architecture + CodeGraph-Indexed)**  
> Terakhir Diperbarui: **Oktober 2026**

---

## 1. Sprint Aktif: Redesign Homepage & Behavioral Psychology Engine (CRO & Trust)

> **Fokus Sprint:** Mentransformasi tampilan awal TestHub dari sekadar *"Katalog Teknis"* menjadi *"Mesin Pemicu Emosi, Trust, & Konversi Pembayaran"* menggunakan prinsip Behavioral Economics (Loss Aversion, Social Proof, Transparent Pricing, Cognitive Ease).  
> **Target KPI Bisnis:** +25% Click-Through Rate (CTR) Mulai Ujian, -40% Bounce Rate Pengunjung Baru, +35% Konversi Checkout Invoice QRIS.

```
                  ARSITEKTUR HOMEPAGE BARU (BEHAVIORAL UX)
                                     │
    ┌────────────────────────────────┼────────────────────────────────┐
    ▼                                ▼                                ▼
[ ZONA 1: HERO ]             [ ZONA 2: TRUST ]               [ ZONA 3: CATALOG ]
Loss Aversion Copy           Akreditasi Standar              Badge Akses Transparan
+ Live Social Pulse          Resmi (BKN / Kemdikbud)         (GRATIS vs PREMIUM)
                                     │
    ┌────────────────────────────────┴────────────────────────────────┐
    ▼                                                                 ▼
[ ZONA 4: THE "AHA!" MOMENT ]                         [ ZONA 5: RISK REVERSAL ]
Interactive Teaser Radar                              Accordion FAQ Cepat
Kelemahan & Sertifikat                                (Anonim, HP, Auto-save)
```

### 📋 Status Implementasi Frontend (Real Data Integrated — 100% Selesai)

| ID Tiket | Komponen / Berkas | Spesifikasi Desain & Logika | Status | Prinsip Psikologis |
|---|---|---|:---:|---|
| **FE-HP-01** | [`HomePage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx) (Hero) | **Emotional Hero & Live Social Proof (Real Data):**<br>• Headline: *"Ketahui Kelemahanmu Hari Ini, Bukan di Lembar Pengumuman Tes Asli."*<br>• Subtitle: *"Simulasi CAT CPNS, UTBK-SNBT, dan BUMN dengan persentil nasional riil. 100% tanpa login awal, mulai dalam 10 detik."*<br>• Live pulse badge terhubung ke `GET /api/public/stats`: `active_examinees` (peserta aktif sekarang) + `monthly_examinees` (peserta bulan ini) dengan auto-polling react-query setiap 30s. | ✅ Selesai | *Loss Aversion* (Kahneman) & *Bandwagon Effect* |
| **FE-HP-02** | [`HomePage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx) (Trust Bar) | **Authority & Compliance Strip:**<br>• Terpasang tepat di bawah pencarian hero.<br>• 3 checklist otoritas minimalis:<br>&nbsp;&nbsp;1. `[✓] KepmenPAN-RB No. 321 (SKD 2026)`<br>&nbsp;&nbsp;2. `[✓] Format Item Penalaran Matematika BPPP Kemendikbud`<br>&nbsp;&nbsp;3. `[✓] Core Values AKHLAK 6 Pilar BUMN`. | ✅ Selesai | *Authority Bias* (Cialdini) — Menghilangkan rasa takut soal tidak relevan |
| **FE-HP-03** | [`HomePage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/HomePage.tsx) (Card) | **Smart Catalog & Zero Bait-and-Switch Pricing (Real Metrics):**<br>• Modul gratis: Badge hijau `GRATIS / FREE ACCESS`.<br>• Modul berbayar: Badge solid amber `PREMIUM • Rp 15.000`.<br>• Metrik tantangan & sosial: `Durasi`, `Total Soal`, `Passing: 65%`, dan `{total_takers} Peserta` (riil dari database).<br>• Flagship card: Badge dinamis `TRYOUT AKBAR MINGGU INI` berdasarkan modul dengan taker terbanyak (`is_flagship`). | ✅ Selesai | *Price Transparency* & *Challenge Bias* (Menghilangkan kekecewaan kaget paywall) |
| **FE-HP-04** | [`AhaMomentSection.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/home/AhaMomentSection.tsx) | **The "AHA!" Moment Interactive Preview:**<br>• Seksi interaktif 3 tab:<br>&nbsp;&nbsp;1. **Peta Radar Kelemahan**: Analisis diagnostik topik (Silogisme, Numerik, TKP).<br>&nbsp;&nbsp;2. **Persentil Nasional Instan**: Benchmark kompetitif ranking reaktif berdasar total peserta riil dari backend.<br>&nbsp;&nbsp;3. **Sertifikat Ber-UUID Resmi**: Mockup sertifikat kelulusan digital dengan QR-code verifikasi. | ✅ Selesai | *Instant Gratification* & *The Endowment Effect* |
| **FE-HP-05** | [`HomeFAQ.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/home/HomeFAQ.tsx) | **Risk Reversal FAQ Accordion:**<br>• Jawaban taktil & snappy atas 4 kecemasan calon peserta:<br>&nbsp;&nbsp;Q1: *Wajib registrasi dulu?* → A: Tidak. Langsung klik dan mulai, token sesi dibuat otomatis.<br>&nbsp;&nbsp;Q2: *Bisa lewat smartphone?* → A: 100% responsif, drawer soal ramah jempol.<br>&nbsp;&nbsp;Q3: *Bagaimana jika internet putus?* → A: Auto-save offline di perangkat, otomatis sync saat online.<br>&nbsp;&nbsp;Q4: *Modul gratis vs berbayar?* → A: Modul gratis tanpa batas, modul premium via QRIS instan / Season Pass. | ✅ Selesai | *Friction Elimination* (Menghapus keraguan sebelum klik) |

---

## 2. Status Implementasi Backend Homepage (100% Selesai & Teruji)

| ID Tiket | Modul / Handler | Spesifikasi Fitur | Status | Catatan Teknis |
|---|---|---|:---:|---|
| **BE-HP-01** | `handlers/public.go` | **Live Concurrent Examinees API (`GET /api/public/stats` & `GET /api/public/live-stats`):** Menghitung sesi aktif (`test_sessions.is_active = true AND expires_at > NOW()`) dan peserta bulanan/total secara riil. | ✅ Selesai | Ditunjang read-through cache Redis 30 detik untuk throughput tinggi. |
| **BE-HP-02** | `repository/exam_repository.go` | **Enrichment Metrik Sosial pada Katalog (`GET /api/tests`):** Field `total_takers`, `pass_rate_percentage`, dan `is_flagship` dihitung dinamis dari agregasi `test_results`. | ✅ Selesai | Subquery aggregation & window function SQL efisien tanpa N+1 query. |
| **BE-HP-03** | `cache/redis.go` | **Read-Through Caching untuk Metrik Publik:** Caching Redis `public:stats` (TTL 30 detik) dan invalidasi otomatis saat submit ujian atau create session. | ✅ Selesai | Zero DB overhead untuk polling traffic tinggi dari ribuan visitor homepage. |

---

## 3. Status Implementasi AI Multi-Provider & Essay Auto-Grader (100% Selesai & Teruji)

| ID Tiket | Modul / Berkas | Spesifikasi Fitur | Status | Catatan Teknis & Ketahanan |
|---|---|---|:---:|---|
| **BE-AI-01** | `services/ai_agent.go` | **Alokasi Token Dinamis & Thinking Buffer (8.192 Tokens):** Formula token dinamis (`count * 650 + 2500` max 8.192) untuk Gemini 2.5 Flash dan Groq. Menjamin ~2.800 thinking tokens tidak memotong output JSON. | ✅ Selesai | Mengeliminasi bug `unexpected end of JSON input` saat generate 10 soal. |
| **BE-AI-02** | `services/ai_agent.go` | **Auto-Complement Fallback Guardrail:** Jika LLM hanya mengembalikan sebagian soal (misal 8 dari 10), backend otomatis melengkapi sisa butir soal via bank kurasi lokal deterministik. | ✅ Selesai | Menjamin integritas jumlah butir soal selalu tepat sesuai yang diminta pengajar. |
| **BE-AI-03** | `handlers/ai.go` & `services/ai_agent.go` | **AI Essay Auto-Grader Engine (`POST /api/ai/grade-essay`):** Evaluasi lembar esai dengan 3 rubrik terkalibrasi (Substansi 40, Analisis 30, Sistematika 30), auto-grading 0-100, dan umpan balik konstruktif. | ✅ Selesai | 3-tier resilient: Gemini 2.5 Flash $\rightarrow$ Groq LLaMA $\rightarrow$ Heuristic Rubric Engine. |
| **FE-AI-01** | `components/admin/EssayGradingView.tsx` | **Interactive AI Auto-Grader Workbench:** Tombol satu klik `✨ Nilai Otomatis dengan AI`, kartu detail rubrik 3 dimensi, dan auto-populasi skor + catatan instruktur yang tetap editable. | ✅ Selesai | Mencegah bottleneck penilaian manual instruktur pada asesmen berbasis esai. |

---

## 4. Status Implementasi Emotional Bonding & Direct PDF Engine (100% Selesai & Teruji)

| ID Tiket | Modul / Berkas | Spesifikasi Desain & Logika | Status | Catatan Teknis & Dampak Bisnis |
|---|---|---|:---:|---|
| **FE-CERT-01** | [`pdfExport.ts`](file:///home/sans/coding/quiz_app/frontend/src/utils/pdfExport.ts) & [`CertificateModal.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/common/CertificateModal.tsx) | **Scalable Modular Client-Side PDF Engine:**<br>• Diekstrak ke modul utilitas terpusat `utils/pdfExport.ts` yang scalable untuk seluruh kebutuhan aplikasi (sertifikat, laporan hasil, transkrip).<br>• Mendukung orientasi landscape/portrait, resolusi DPI dinamis (scale 2.5x), metadata dokumen, dan *auto-page slicing* untuk dokumen multi-halaman.<br>• Dynamic lazy import `jspdf` & `html2canvas` (0 kB overhead bundle awal).<br>• Diintegrasikan ke `CertificateModal` dan tombol "Unduh Laporan (PDF)" di `ResultsPage`. | ✅ Selesai | Mengeliminasi kebingungan peserta ("hanya Ctrl+P") dan siap dipakai untuk seluruh fitur ekspor masa depan. |
| **FE-EMO-01** | [`ScoreSummary.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/results/ScoreSummary.tsx) | **Empathetic Growth Coach & Refleksi Perjuangan:**<br>• Mengubah kotak merah vonis kegagalan menjadi evaluasi konstruktif.<br>• Perhitungan otomatis selisih poin (`scoreGap`) dan deteksi domain kompetensi terlemah untuk rekomendasi fokus latihan berikutnya.<br>• Suntikan dorongan psikologis kolektif (*"Kamu tidak berjuang sendirian"*). | ✅ Selesai | Mencegah drop-off peserta pasca-ujian dan membangun retensi jangka panjang. |
| **FE-EMO-02** | [`GritCardModal.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/results/GritCardModal.tsx) & [`ResultsPage.tsx`](file:///home/sans/coding/quiz_app/frontend/src/pages/ResultsPage.tsx) | **Story-Ready Grit Card (9:16 Viral Loop):**<br>• Format mobile story 9:16 estetik untuk Instagram Story & X/Twitter.<br>• Menampilkan rank persentil, akurasi, waktu latihan, kutipan dedikasi pejuang (dapat dikustomisasi), dan QR verifikasi.<br>• Tombol satu klik "Unduh Gambar Story (PNG)" dan "Salin Caption Story". | ✅ Selesai | Pemicu viralitas organik (K-Factor > 0.6) dari tradisi *studygram* pejuang CPNS/PTN tanpa biaya iklan. |
| **FE-EMO-03** | [`QuestionReviewList.tsx`](file:///home/sans/coding/quiz_app/frontend/src/components/results/QuestionReviewList.tsx) | **Tanya Kak TestHub (AI Coach di Pembahasan):**<br>• Tombol interaktif expander `💡 Bedah Jebakan & Cara Cepat`.<br>• Menyajikan Pola Pikir 30 Detik, deteksi jebakan soal (*common traps*), dan afirmasi semangat suportif per butir soal. | ✅ Selesai | Mengubah pembahasan kering menjadi pengalaman dimentori kawan belajar. |

---

## 5. Backlog Fitur Masa Depan (Future Roadmap)

| ID Tiket | Modul / Handler | Spesifikasi Fitur | Prioritas |
|---|---|---|:---:|
| **Fitur A** | `handlers/admin.go` | **Bulk Import / Export Soal (Excel / Word / CSV):** Import spreadsheet via `excelize/v2`. | Backlog |
| **Fitur B** | `services/scoring.go` | **Item Response Theory (IRT) Scoring:** Pembobotan dinamis butir soal standar UTBK-SNBT. | Backlog |
| **Fitur C** | `frontend/test/` | **Anti-Cheat & Web Proctoring Suite:** Tab-switch listener, fullscreen mode, copy-paste blocker. | Backlog |
| **Fitur D** | `handlers/session.go` | **Computerized Adaptive Testing (CAT) Dinamis:** Adaptasi tingkat kesukaran soal per butir. | Backlog |
| **Fitur E** | `frontend/components/results/` | **The Mistake Vault (Bank Dosa Soal):** Koleksi soal salah pribadi dengan Spaced Repetition. | Backlog |
| **Fitur F** | `components/admin/QuestionFormField.tsx` | **AI Distractor Generator:** Generator 4 pilihan pengecoh rasional otomatis saat guru mengetik pertanyaan manual. | Backlog |

