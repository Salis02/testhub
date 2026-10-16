# 🎨 TestHub Design System & Tasteful UX Guide (`style.md`)

> **Filosofi Inti: "Tasteful Cognitive-Calm" (Target Nilai UX: 9+/10)**  
> Mengeliminasi *AI-Slop* (warna neon pelangi, efek blur lebay, dan animasi lambat) **TIDAK SAMA** dengan membuat antarmuka kering, kaku, dingin, dan hampa feedback (*wireframe flat 6/10*).  
> TestHub memadukan **ketenangan kognitif peserta ujian resmi** dengan **fisikalitas interaksi yang snappy, hierarki kedalaman berlapis (layered elevation), dan umpan balik taktil yang memuaskan**.

---

## 1. Empat Pilar UX Taste (The 4 Pillars of UX Craftsmanship)

### 1.1 Tactile Affordance & Micro-Interactions (Fisikalitas Interaksi)
* Setiap elemen yang dapat diklik atau ditekan harus memberikan umpan balik taktil seketika:
  * **Active Recoil:** Menggunakan utility `.btn-press` (`active:scale-[0.98]` dengan durasi `120ms` cubic-bezier).
  * **Snappy Transitions:** Durasi transisi interaktif maksimal `150ms–200ms` menggunakan kurva `cubic-bezier(0.16, 1, 0.3, 1)`. Hindari transisi lambat (>300ms) yang membuat aplikasi terasa berat/lemot.
  * **Cursor Affordance:** Seluruh elemen interaktif wajib menyertakan `cursor-pointer`, dan elemen non-aktif wajib `cursor-not-allowed opacity-40 select-none`.

### 1.2 Aksesibilitas Keyboard & Dual-Layer Focus Rings
* Pengguna yang menggunakan keyboard (Tab / Shift-Tab / Enter / Space) harus mendapatkan indikator fokus yang sangat jelas tanpa menimbulkan lingkaran biru acak saat diklik mouse:
  * **Utility Class:** `.focus-ring` (memanfaatkan pseudo-class `:focus-visible`).
  * **Visual Style:** Cincin ganda: 2px offset warna canvas (`var(--bg-canvas)`) + 2px ring solid aksen (`var(--color-accent)`).

### 1.3 Hierarki Kedalaman Berlapis (Layered Elevation & Depth)
Elemen antarmuka disusun dalam tingkat elevasi yang presisi tanpa blur glassmorphism yang mengotori layar:
* **Level 0 (Canvas Base):** Latar belakang halaman (`bg-canvas`).
* **Level 1 (Surface Card):** Kartu modul ujian, panel soal (`bg-surface surface-card shadow-card border border-borderline`).
  * *Dark Mode Rim Highlight:* Pada dark mode, permukaan kartu memiliki inset light boundary `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05)` agar tidak menyatu dengan kegelapan latar.
* **Level 2 (Interactive Card Lift):** Saat hover pada kartu ujian di katalog, kartu terangkat halus: `hover:-translate-y-0.5 hover:shadow-card-hover hover:border-accent/40`.
* **Level 3 (Sticky Header & Dropdown):** Navigasi atas yang menempel saat scroll (`shadow-subtle backdrop-blur-md bg-canvas/90`).
* **Level 4 (Modal Dialog Window):** Jendela konfirmasi atau checkout pembayaran (`shadow-modal border border-borderline z-50`).
* **Level 5 (Floating Feedback):** Toast notifikasi dan quick timer countdown (`shadow-popover`).

### 1.4 Cognitive-Calm Semantic Harmony (Palet Status Fungsional)
Sistem tri-color dasar diperkaya dengan status semantik yang terkalibrasi saturasi rendah (*low-saturation*) dan memiliki background soft-tint (`8%–12%` alpha) agar informatif tanpa berteriak:
* **Success (Lulus, Jawaban Benar, Tersimpan):** Emerald (`#059669` light / `#10B981` dark) + `bg-success-subtle` + `border-success-border`.
* **Warning (Ragu-ragu, Timer < 5 Menit):** Amber (`#D97706` light / `#F59E0B` dark) + `bg-warning-subtle` + `border-warning-border`.
* **Danger (Salah, Hapus, Timer Kritis < 1 Menit):** Rose (`#DC2626` light / `#EF4444` dark) + `bg-danger-subtle` + `border-danger-border`.
* **Info (Informasi, Petunjuk Teknis):** Sky/Slate (`#0284C7` light / `#38BDF8` dark) + `bg-info-subtle` + `border-info-border`.

---

## 2. Token Warna & Spesifikasi Variabel CSS

```css
:root {
  /* ================= BASE TRI-COLOR (LIGHT) ================= */
  --bg-canvas: #F8FAFC;        /* Latar belakang kanvas matte */
  --text-ink: #0F172A;         /* Teks utama, garis pemisah */
  --color-accent: #1D4ED8;     /* Tombol primer, status aktif */

  /* Derived Surface & Alpha */
  --surface-card: #FFFFFF;
  --text-muted: rgba(15, 23, 42, 0.65);
  --border-subtle: rgba(15, 23, 42, 0.12);
  --surface-hover: rgba(15, 23, 42, 0.03);
  --accent-tint: rgba(29, 78, 216, 0.08);

  /* Semantic Harmony (Light) */
  --color-success: #059669;
  --success-subtle: rgba(5, 150, 105, 0.08);
  --success-border: rgba(5, 150, 105, 0.22);

  --color-warning: #D97706;
  --warning-subtle: rgba(217, 119, 6, 0.08);
  --warning-border: rgba(217, 119, 6, 0.22);

  --color-danger: #DC2626;
  --danger-subtle: rgba(220, 38, 38, 0.08);
  --danger-border: rgba(220, 38, 38, 0.22);

  --color-info: #0284C7;
  --info-subtle: rgba(2, 132, 199, 0.08);
  --info-border: rgba(2, 132, 199, 0.22);
}

[data-theme='dark'],
.dark {
  /* ================= BASE TRI-COLOR (DARK) ================= */
  --bg-canvas: #0B0F17;        /* Matte slate anti silau */
  --text-ink: #F1F5F9;         /* Teks kontras tinggi */
  --color-accent: #3B82F6;     /* Biru aksen terang */

  /* Derived Surface & Alpha */
  --surface-card: #131926;
  --text-muted: rgba(241, 245, 249, 0.60);
  --border-subtle: rgba(241, 245, 249, 0.12);
  --surface-hover: rgba(241, 245, 249, 0.06);
  --accent-tint: rgba(59, 130, 246, 0.12);

  /* Semantic Harmony (Dark) */
  --color-success: #10B981;
  --success-subtle: rgba(16, 185, 129, 0.12);
  --success-border: rgba(16, 185, 129, 0.28);

  --color-warning: #F59E0B;
  --warning-subtle: rgba(245, 158, 11, 0.12);
  --warning-border: rgba(245, 158, 11, 0.28);

  --color-danger: #EF4444;
  --danger-subtle: rgba(239, 68, 68, 0.12);
  --danger-border: rgba(239, 68, 68, 0.28);

  --color-info: #38BDF8;
  --info-subtle: rgba(56, 189, 248, 0.12);
  --info-border: rgba(56, 189, 248, 0.28);
}
```

---

## 3. Ergonomi Asesmen & Ujian Resmi

### 3.1 Kartu Pilihan Ganda (Question Option Card)
1. **Letter Box:** Kotak huruf (A, B, C, D, E) berukuran `w-8 h-8 rounded-md font-mono text-xs font-semibold`.
   - Default: `bg-canvas text-ink border border-borderline`.
   - Selected: `bg-accent text-white shadow-subtle`.
2. **Card Container States:**
   - **Default:** `border border-borderline bg-surface hover:border-accent/40 hover:bg-surface-hover btn-press focus-ring`.
   - **Selected:** `border-accent bg-accent-tint ring-1 ring-accent/30 shadow-subtle`.
   - **Check Icon:** Ikon centang (`CheckCircle2`) muncul halus di sebelah kanan saat dipilih.
   - **Keyboard Shortcut Hint:** Hint angka/huruf `[1]`, `[2]`, `[3]` muncul saat hover di desktop.

### 3.2 Timer Ujian 3-Tier Urgency
Wajib menggunakan `font-variant-numeric: tabular-nums` agar tidak ada getaran layout per detik:
* **Normal (> 5 Menit):** `bg-surface text-ink border-borderline shadow-subtle` dengan ikon aksen.
* **Warning (≤ 5 Menit):** `bg-warning-subtle text-warning border-warning-border` untuk memberi kesadaran waktu tanpa panik.
* **Critical (≤ 1 Menit):** `bg-danger-subtle text-danger border-danger-border animate-pulse` sebagai sinyal finalisasi segera.

### 3.3 Indikator Autosave & Navigasi Halaman
* Status penyimpanan jawaban otomatis ditampilkan dengan dot hijau halus (`w-1.5 h-1.5 rounded-full bg-success`) dan font mono `text-[11px]`.
* Saat berpindah nomor soal, layar otomatis melakukan scroll halus ke puncak kontainer soal (`window.scrollTo({ top: 0, behavior: 'smooth' })`).

---

## 4. Tipografi & Skala Spacing

* **Font Utama:** `'Inter', system-ui, -apple-system, sans-serif`
* **Font Monospace:** `'JetBrains Mono', 'Roboto Mono', monospace` *(wajib untuk Timer, Skor, ID Sesi, Nomor Soal)*.

| Token | Class | Line Height | Keterangan UX |
|---|---|---|---|
| **Display** | `text-3xl font-bold` | `1.2` | Skor akhir hasil ujian |
| **Heading 1** | `text-xl sm:text-2xl font-semibold` | `1.3` | Judul modul tryout / modal |
| **Heading 2** | `text-lg sm:text-xl font-medium` | `1.6` | Pertanyaan soal ujian (optimal membaca lama) |
| **Body Large**| `text-sm sm:text-base font-normal`| `1.5` | Opsi pilihan jawaban & pembahasan |
| **Body Small**| `text-xs sm:text-sm text-ink-muted`| `1.5` | Deskripsi modul, petunjuk teknis |
| **Caption**   | `text-[11px] font-mono` | `1.4` | Timer, badges, status autosave |

---

## 5. Komparasi Kualitas UX: "Kering 6/10" vs "AI Slop" vs "TestHub 9+/10"

| Dimensi | ❌ Kering & Hampa (6/10) | ❌ AI Slop Liar | ✅ TestHub Tasteful (9+/10) |
|---|---|---|---|
| **Interaksi Tombol** | Statis, tidak ada rasa klik, tanpa focus ring | Animasi membal lambat, glow neon menyilaukan | `.btn-press` (`active:scale-[0.98]`), `.focus-ring` (cincin ganda presisi) |
| **Kedalaman Kartu** | Rata total (*flat border* tanpa bayangan), tampak mentah | Drop shadow ungu tebal, glassmorphism buram | Layered ambient shadow (`shadow-card`, `shadow-card-hover`), dark mode rim highlight |
| **Pilihan Jawaban** | Radio button standar browser yang kecil dan kaku | Tombol warna-warni kontras tinggi membuat pusing | Card seleksi luas, letter box mono, indikator centang, hint shortcut keyboard |
| **Status Ujian** | Hanya hitam-putih, status ragu-ragu tidak terbaca | Merah/hijau neon mencolok merusak konsentrasi | Palet semantik terkalibrasi (`subtle tint` 8-12%, border kontras nyaman) |
| **Timer** | Angka bergeser/goyang saat detik berganti | Countdown berkedip-kedip liar sejak menit pertama | `tabular-nums` stabil, 3-tier urgensi (tenang → waspada → kritis) |
| **Transisi Modal** | Muncul mendadak tanpa transisi (*jarring*) | Zoom lambat 500ms dengan efek rotasi | Backdrop blur halus, spring zoom `200ms cubic-bezier(0.16, 1, 0.3, 1)` |
