# 🎨 TestHub Design System & Styling Guide (`style.md`)

> **Prinsip:** Minimalis, Konsisten, Bebas "AI-Slop", dan Ramah Kognitif (*Cognitive-Calm*).  
> **Target UX:** Konsentrasi maksimal peserta asesmen ujian resmi (CPNS, SBMPTN, IQ, Sertifikasi) tanpa polusi visual (*Zero Visual Noise*).

---

## 1. Aturan Warna: Strict Tri-Color System (3 Warna per Mode)

Variasi visual (kartu, hover, border) dihasilkan **hanya melalui tingkat opasitas (alpha channel)** dari Ink atau Canvas, **bukan** menambah warna pelangi baru.

### 1.1 Palet Light Mode
| Token | Nama Token | HEX | HSL | Penggunaan Utama |
|---|---|---|---|---|
| **Base Canvas** | `canvas-light` | `#F8FAFC` | `210° 40% 98%` | Latar belakang seluruh halaman, body |
| **Solid Ink** | `ink-light` | `#0F172A` | `222° 47% 11%` | Teks heading, paragraf, garis pemisah |
| **Action Accent**| `accent-light` | `#1D4ED8` | `224° 76% 48%` | Tombol primer, timer aktif, radio terpilih |

* **Derivasi Opasitas Light:** Surface Card (`#FFFFFF`), Text Muted (`rgba(15, 23, 42, 0.65)`), Border Subtle (`rgba(15, 23, 42, 0.12)`), Card Hover (`rgba(15, 23, 42, 0.03)`), Accent Soft (`rgba(29, 78, 216, 0.08)`).

### 1.2 Palet Night / Dark Mode
| Token | Nama Token | HEX | HSL | Penggunaan Utama |
|---|---|---|---|---|
| **Base Canvas** | `canvas-dark` | `#0B0F17` | `220° 35% 7%` | Latar belakang matte slate anti silau |
| **Solid Ink** | `ink-dark` | `#F1F5F9` | `210° 40% 96%` | Teks utama, border outline, label |
| **Action Accent**| `accent-dark` | `#3B82F6` | `217° 91% 60%` | Status aktif, tombol submit, highlight |

* **Derivasi Opasitas Dark:** Surface Card (`rgba(241, 245, 249, 0.04)`), Text Muted (`rgba(241, 245, 249, 0.60)`), Border Subtle (`rgba(241, 245, 249, 0.12)`), Card Hover (`rgba(241, 245, 249, 0.08)`), Accent Soft (`rgba(59, 130, 246, 0.12)`).

---

## 2. Token Tipografi & Spacing

- **Font Sans:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
- **Font Mono (Timer):** `'JetBrains Mono', 'Roboto Mono', monospace;` *(wajib `font-variant-numeric: tabular-nums` agar timer tidak bergetar)*.

| Skala | Tailwind Class | Ukuran / Line Height | Penggunaan |
|---|---|---|---|
| **Display** | `text-3xl font-bold` | `30px / 36px` | Skor Akhir, Header Utama Dashboard |
| **Heading 1** | `text-2xl font-semibold` | `24px / 32px` | Judul Tes, Nama Modul |
| **Heading 2** | `text-xl font-medium` | `20px / 28px` | Teks Soal Ujian (Pertanyaan) |
| **Body Large** | `text-base font-normal` | `16px / 24px` | Opsi Jawaban (Pilihan Ganda), Pembahasan |
| **Body Regular** | `text-sm font-normal` | `14px / 20px` | Metadata (Durasi, Kategori, Tabel) |
| **Caption/Mono** | `text-xs font-mono` | `12px / 16px` | Timer Ujian, Session ID, Badges |

* **Layout Container:** Max width ujian `max-w-3xl` (768px, optimal untuk kenyamanan membaca soal panjang). Max width dashboard `max-w-7xl` (1280px).
* **Border Radius:** Kartu `rounded-lg` (`8px`), Tombol & Input `rounded-md` (`6px`), Badges `rounded` (`4px`). Hindari sudut bulat berlebih (*no bubbly pills*).

---

## 3. Implementasi CSS Variables & Tailwind

```css
:root {
  --bg-canvas: #F8FAFC;
  --text-ink: #0F172A;
  --color-accent: #1D4ED8;
  --surface-card: #FFFFFF;
  --text-muted: rgba(15, 23, 42, 0.65);
  --border-subtle: rgba(15, 23, 42, 0.12);
  --surface-hover: rgba(15, 23, 42, 0.03);
  --accent-tint: rgba(29, 78, 216, 0.08);
}
[data-theme='dark'], .dark {
  --bg-canvas: #0B0F17;
  --text-ink: #F1F5F9;
  --color-accent: #3B82F6;
  --surface-card: #131926;
  --text-muted: rgba(241, 245, 249, 0.60);
  --border-subtle: rgba(241, 245, 249, 0.12);
  --surface-hover: rgba(241, 245, 249, 0.06);
  --accent-tint: rgba(59, 130, 246, 0.12);
}
```

```javascript
// tailwind.config.js extend colors
colors: {
  canvas: { DEFAULT: 'var(--bg-canvas)' },
  ink: { DEFAULT: 'var(--text-ink)', muted: 'var(--text-muted)' },
  accent: { DEFAULT: 'var(--color-accent)', tint: 'var(--accent-tint)' },
  surface: { DEFAULT: 'var(--surface-card)', hover: 'var(--surface-hover)' },
  borderline: { DEFAULT: 'var(--border-subtle)' },
}
```

---

## 4. Checklist Kepatuhan Visual: "AI Slop" vs "TestHub Standard"

| Aspek | ❌ AI Slop (DILARANG) | ✅ TestHub Standard (WAJIB) |
|---|---|---|
| **Warna** | Gradien ungu/pink neon acak pada tombol | 3 warna tegas: Canvas, Ink, Accent |
| **Latar** | Efek blur glassmorphism berlebihan | Solid matte clean canvas dengan kontras tajam |
| **Border & Card**| Border glowing tebal, rounded raksasa | Border 1px halus, radius 6px–8px |
| **Timer** | Angka bergetar/melompat saat detik berganti | Tabular nums (`tabular-nums`) font monospace |
| **Dark Mode** | Pure black `#000000` kontras menyilaukan | Matte slate `#0B0F17` ramah mata (*Cognitive-Calm*) |
| **Kode Kelas** | Arbitrary hex liar (`bg-[#4f46e5]`) | Token semantik (`bg-canvas`, `text-ink`, `border-borderline`) |
