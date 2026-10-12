# 🎨 TestHub Design System & Styling Guide (`style.md`)

> **Dokumen Panduan Styling & Visual Standard untuk TestHub SaaS Platform**  
> Dibuat berdasarkan: [PRODUCT_REQUIREMENTS_DOCUMENT.md](file:///home/sans/coding/quiz_app/PRODUCT_REQUIREMENTS_DOCUMENT.md)  
> Prinsip: **Minimalis, Konsisten, Bebas "AI-Slop", dan Ramah Kognitif (Cognitive-Calm).**

---

## 1. Filosofi Desain: Anti-"AI Slop" & Cognitive Clarity

Platform ujian dan asesmen (CPNS, SBMPTN, IQ, Sertifikasi) membutuhkan konsentrasi maksimal dari pengguna. Interface yang baik adalah interface yang **tidak mengalihkan fokus dari konten ujian**.

### Apa itu "AI Slop" dalam UI dan Mengapa Kita Menolaknya?
- ❌ **AI Slop**: Gradien neon berlebihan (ungu/cyan/pink), efek glassmorphism/blur di setiap kartu, glow effect, border tebal tak beraturan, elemen mengapung (floating elements) yang tidak perlu, dan bayangan buram raksasa.
- ✅ **TestHub Standard**:
  - **Fungsional & Rapi**: Tipografi tajam, kontras tinggi, hierarki visual jelas.
  - **Zero Visual Noise**: Tidak ada elemen dekoratif yang mengganggu pembacaan soal atau analisis data.
  - **Fast & Responsive**: Desain seringan mungkin untuk target load time < 2s dan p95 < 200ms.

---

## 2. Aturan Palet Warna: Strict Tri-Color System (3 Warna per Mode)

Untuk menjaga konsistensi mutlak dan mencegah pembengkakan palet visual, TestHub menggunakan **tepat 3 peran warna inti** untuk masing-masing mode (Light & Night/Dark Mode).

```
   ┌────────────────────────────────────────────────────────┐
   │ 1. Canvas / Background   : Ruang utama konten          │
   │ 2. Ink / Foreground      : Teks, border, dan kontur    │
   │ 3. Accent / Interactive  : Aksi utama, fokus, progres  │
   └────────────────────────────────────────────────────────┘
```

Variasi visual (seperti kartu, hover, border sekunder) dicapai **hanya dengan tingkat opasitas (alpha channels)** dari warna Ink atau Canvas, bukan dengan menambah warna baru.

---

### 2.1 Light Mode Palette (Tenang, Kontras Tinggi, Kertas Ujian Modern)

Target: Tampilan bersih seperti kertas ujian resmi premium dengan fokus tinggi di siang hari.

| Peran Token | Nama | HEX | HSL | Penggunaan Utama |
|---|---|---|---|---|
| **Base Canvas** | `canvas-light` | `#F8FAFC` | `210° 40% 98%` | Latar belakang seluruh halaman, body, kanvas tes |
| **Solid Ink** | `ink-light` | `#0F172A` | `222° 47% 11%` | Teks heading, paragraf, garis pemisah, border kartu |
| **Action Accent** | `accent-light` | `#1D4ED8` | `224° 76% 48%` | Tombol primer, timer aktif, radio button terpilih, tab aktif |

#### Derivasi Opasitas Light Mode (Zero New Hues):
- **Surface / Card Background**: `#FFFFFF` (atau `canvas-light` murni)
- **Secondary Text (Muted)**: `rgba(15, 23, 42, 0.65)` (Ink pada opasitas 65%)
- **Subtle Border / Divider**: `rgba(15, 23, 42, 0.12)` (Ink pada opasitas 12%)
- **Card Hover / Subtle Surface**: `rgba(15, 23, 42, 0.03)` (Ink pada opasitas 3%)
- **Accent Soft Background**: `rgba(29, 78, 216, 0.08)` (Accent pada opasitas 8%)

---

### 2.2 Night / Dark Mode Palette (Matte Slate, Anti-Eye Strain)

Target: Bukan pitch-black (#000000) yang melelahkan mata, melainkan slate gelap matte dengan aksentuasi tajam.

| Peran Token | Nama | HEX | HSL | Penggunaan Utama |
|---|---|---|---|---|
| **Base Canvas** | `canvas-dark` | `#0B0F17` | `220° 35% 7%` | Latar belakang halaman, header bar, area kerja ujian |
| **Solid Ink** | `ink-dark` | `#F1F5F9` | `210° 40% 96%` | Teks utama, angka timer, border outline, label pertanyaan |
| **Action Accent** | `accent-dark` | `#3B82F6` | `217° 91% 60%` | Status aktif, tombol submit, highlight jawaban, progress bar |

#### Derivasi Opasitas Night Mode (Zero New Hues):
- **Surface / Card Background**: `rgba(241, 245, 249, 0.04)` di atas `canvas-dark`
- **Secondary Text (Muted)**: `rgba(241, 245, 249, 0.60)` (Ink pada opasitas 60%)
- **Subtle Border / Divider**: `rgba(241, 245, 249, 0.12)` (Ink pada opasitas 12%)
- **Card Hover / Interactive State**: `rgba(241, 245, 249, 0.08)` (Ink pada opasitas 8%)
- **Accent Soft Background**: `rgba(59, 130, 246, 0.12)` (Accent pada opasitas 12%)

---

### 2.3 Status & Feedback Monokromatik / Opasitas

Untuk mempertahankan aturan 3 warna tanpa menambahkan warna pelangi:
- **Correct / Lolos / Sukses**: Menggunakan `Accent` dengan penanda ikon checkmark `(✓)` tegas atau badge border solid.
- **Incorrect / Gagal / Alert**: Menggunakan solid outline dan tipografi bold. Jika sistem validasi browser mewajibkan warna semantik kritis, gunakan warna fungsional dengan desaturasi rendah (misal: Red `#DC2626`) khusus untuk pesan error kritis, tanpa menjadikannya elemen estetika UI umum.

---

## 3. Desain Token: Tipografi, Skala, dan Border

### 3.1 Tipografi
Gunakan satu font family sans-serif netral berkualitas tinggi dengan angka tabular (`tabular-nums`) untuk timer ujian dan skor.

- **Font Family**:  
  `font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
- **Monospace / Timer**:  
  `font-mono: 'JetBrains Mono', 'Roboto Mono', monospace;` *(wajib `font-variant-numeric: tabular-nums`)*

| Ukuran | Tailwind Class | Ukuran / Line Height | Penggunaan |
|---|---|---|---|
| **Display** | `text-3xl font-bold` | `30px / 36px` | Skor Akhir, Header Utama Dashboard |
| **Heading 1** | `text-2xl font-semibold` | `24px / 32px` | Judul Tes, Nama Modul |
| **Heading 2** | `text-xl font-medium` | `20px / 28px` | Teks Soal Ujian (Pertanyaan) |
| **Body Large** | `text-base font-normal` | `16px / 24px` | Opsi Jawaban (Pilihan Ganda), Penjelasan |
| **Body Regular** | `text-sm font-normal` | `14px / 20px` | Metadata (Durasi, Kategori, Teks Tabel) |
| **Caption / Mono** | `text-xs font-mono` | `12px / 16px` | Timer Ujian, Session ID, Pill Tags |

---

### 3.2 Spacing & Layout Grid
- **Base Grid**: Kelipatan 4px / 8px.
  - Padding komponen kecil (tombol, input): `py-2 px-4` (8px / 16px).
  - Padding kartu soal: `p-6` (24px) atau `p-8` (32px).
  - Jarak antar soal / layout container: `gap-4` atau `gap-6`.
  - Max Width Container Ujian: `max-w-3xl` (768px) untuk rasio kenyamanan membaca (*measure/line length* maksimal 75 karakter per baris).
  - Max Width Dashboard Admin: `max-w-7xl` (1280px).

---

### 3.3 Border & Radius (Anti-Bubbly)
Hindari sudut terlalu bulat (*full-rounded pills*) pada elemen konten utama. Gunakan sudut terukur:

- **Radius Kartu Soal & Panel**: `rounded-md` (`6px`) atau `rounded-lg` (`8px`).
- **Radius Tombol & Input**: `rounded-md` (`6px`).
- **Radius Badges / Timer Indicator**: `rounded` (`4px`).
- **Border Width**: Standar `1px solid` konsisten. Hindari border 2px/3px tebal kecuali fokus keyboard aksesibilitas.

---

### 3.4 Elevasi & Shadows (Crisp, No Blurry Glow)
Hindari bayangan besar yang membuat elemen terlihat melayang tanpa bobot fisik.

- **Light Mode Shadow**:
  - Standar Card: `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04);`
  - Popover / Dropdown: `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04);`
- **Night Mode Shadow**:
  - Tanpa bayangan hitam yang tidak terlihat; gunakan **border kontras halus**:
  - `border: 1px solid rgba(241, 245, 249, 0.12);`

---

## 4. Panduan Komponen Inti TestHub

### 4.1 Interface Pengerjaan Soal (Test Taking View)
Bagian terpenting dari PRD (US-001 & Non-Auth Test Taker):

1. **Header Sticky Ringkas**:
   - Judul Tes di kiri, **Timer Tabular di kanan**.
   - Indikator progres: Baris ramping 3px di bagian bawah header menggunakan warna `Accent`.
2. **Kartu Pertanyaan**:
   - Background solid, padding luas (`p-6` sampai `p-8`).
   - Nomor soal dan poin di atas pertanyaan dengan teks sekunder.
   - Teks pertanyaan menggunakan `Heading 2` dengan *line-height* longgar untuk kenyamanan membaca soal panjang (misal: soal cerita CPNS/SBMPTN).
3. **Pilihan Jawaban (Radio Item / Option Box)**:
   - Default: Border tipis `1px`, background transparan / subtle.
   - Hover: Border sedikit lebih gelap / terang, tanpa transisi lambat.
   - **State Terpilih (Selected)**:
     - Border berganti ke warna `Accent`.
     - Background mendapat tint `Accent Soft (8-12% opacity)`.
     - Simbol huruf (A, B, C, D, E) berada di dalam kotak penanda kecil yang berubah warna menjadi solid `Accent` dengan teks kontras.
4. **Navigasi Bawah**:
   - Tombol *Sebelumnya* (Ghost/Secondary), *Tandai Ragu-ragu*, dan *Berikutnya* (Primary Accent).

---

### 4.2 Halaman Hasil & Pembahasan (Result & Analytics View)
Berdasarkan PRD (US-002, US-003, Section 4.5):

1. **Score Summary Card**:
   - Angka skor besar dan jelas menggunakan `Display` typography.
   - Percentile badge ringkas: *"Top 15% dari peserta tes"*.
2. **Review Mode**:
   - Daftar nomor soal yang dapat difilter (Semua / Benar / Salah).
   - Kotak penjelasan (*admin-defined explanation*) memiliki latar belakang kontras lembut dengan border tipis di sisi kiri (3px accent stroke).

---

### 4.3 Dashboard Admin & Manajemen Tes (Admin View)
Berdasarkan PRD (Section 4.4, US-101 s/d US-103):

1. **Data Tables**:
   - Zebra striping minimal atau cukup border bawah `1px` per baris.
   - Header tabel huruf kapital kecil (`text-xs font-semibold tracking-wider`).
   - Action buttons (Edit, Delete, Preview) dalam bentuk teks link ringkas atau ikon minimalis.
2. **Form Builder Soal**:
   - Input field tanpa dekorasi berlebih, dengan label jelas di atas input.
   - Indikator fokus: `outline: 2px solid var(--color-accent)`.

---

## 5. Implementasi CSS Variables & Tailwind Config

### 5.1 CSS Variables (`index.css` / `globals.css`)

```css
:root {
  /* ================= LIGHT MODE ================= */
  --bg-canvas: #F8FAFC;
  --text-ink: #0F172A;
  --color-accent: #1D4ED8;

  /* Derived Opacities */
  --surface-card: #FFFFFF;
  --text-muted: rgba(15, 23, 42, 0.65);
  --border-subtle: rgba(15, 23, 42, 0.12);
  --surface-hover: rgba(15, 23, 42, 0.03);
  --accent-tint: rgba(29, 78, 216, 0.08);
}

[data-theme='dark'],
.dark {
  /* ================= NIGHT MODE ================= */
  --bg-canvas: #0B0F17;
  --text-ink: #F1F5F9;
  --color-accent: #3B82F6;

  /* Derived Opacities */
  --surface-card: #131926;
  --text-muted: rgba(241, 245, 249, 0.60);
  --border-subtle: rgba(241, 245, 249, 0.12);
  --surface-hover: rgba(241, 245, 249, 0.06);
  --accent-tint: rgba(59, 130, 246, 0.12);
}

body {
  background-color: var(--bg-canvas);
  color: var(--text-ink);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

---

### 5.2 Tailwind CSS Configuration (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--bg-canvas)',
        },
        ink: {
          DEFAULT: 'var(--text-ink)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          tint: 'var(--accent-tint)',
        },
        surface: {
          DEFAULT: 'var(--surface-card)',
          hover: 'var(--surface-hover)',
        },
        borderline: {
          DEFAULT: 'var(--border-subtle)',
        },
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
```

---

## 6. Tabel Checklist: "AI Slop" vs "TestHub Standard"

| Aspek | ❌ AI Slop (DILARANG) | ✅ TestHub Standard (WAJIB) |
|---|---|---|
| **Warna Utama** | Gradien ungu/indigo/pink/cyan pada tombol & teks | 3 warna tegas: Canvas, Ink, Accent |
| **Background** | Efek blur glassmorphism + lingkaran gradien mengapung | Solid matte clean canvas dengan kontras jelas |
| **Kartu Soal** | Border glowing, rounded raksasa (24px+), shadow kabur | Border 1px halus, radius 6px-8px, shadow minimalis |
| **Pilihan Ganda** | Animasi bouncy berlebihan saat hover | State perubahan warna border & latar belakang instan/subtle |
| **Timer** | Angka melompat-lompat saat berganti detik | Angka tabular (`tabular-nums`) dengan font monospace konsisten |
| **Ikonografi** | Menggunakan emoji random di setiap tombol/judul | Ikon garis fungsional (Lucide / Heroicons outline) seragam |
| **Dark Mode** | Pure black `#000000` dengan teks neon yang silau | Deep slate matte `#0B0F17` dengan teks lembut `#F1F5F9` |

---

## 7. Ringkasan Penggunaan untuk Developer

1. **Selalu gunakan token warna semantik**: Hindari hardcoded HEX di komponen. Gunakan variabel `bg-canvas`, `text-ink`, `border-borderline`, `bg-accent`.
2. **Jangan menambah warna aksen acak**: Jika butuh status sekunder, variasikan intensitas atau gunakan label teks jelas daripada membuat palet warna baru.
3. **Prioritaskan keterbacaan**: Pastikan rasio kontras teks selalu memenuhi standar WCAG AA (minimal kontras 4.5:1 untuk teks biasa dan 3:1 untuk teks besar).
