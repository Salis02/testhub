# 🚀 TestHub Deployment & DevOps Orchestration Guide

> **Panduan Orkestrasi Lingkungan, Konfigurasi Produksi, dan Deployment 2GB VPS**  
> Referensi File: [Makefile](file:///home/sans/coding/quiz_app/Makefile) | [docker-compose.yml](file:///home/sans/coding/quiz_app/docker-compose.yml) | [docker-compose.prod.yml](file:///home/sans/coding/quiz_app/docker-compose.prod.yml) | [nginx/nginx.conf](file:///home/sans/coding/quiz_app/nginx/nginx.conf)

---

## 1. Perintah Cepat (Makefile Cheatsheet)

Seluruh orkestrasi pembangunan, migrasi, dan eksekusi dikelola melalui [Makefile](file:///home/sans/coding/quiz_app/Makefile):

| Perintah | Deskripsi | Target Runtime |
|---|---|---|
| `make dev` / `make dev-backend` | Menjalankan API backend Go secara lokal di port `8000` | Native Host (`go run`) |
| `make dev-frontend` | Menjalankan Vite dev server di port `5173` dengan hot-reload | Native Host (`bun run dev`) |
| `make setup` | Setup otomatis: cek `.env`, jalankan migrasi DB, dan seed data | Native Host |
| `make migrate` | Menjalankan migrasi SQL skema database | PostgreSQL |
| `make seed` | Mengisi data catalog kuis dan akun default admin | PostgreSQL |
| `make test` | Menjalankan suite pengujian Go backend di `backend/tests/` | Go Test Engine |
| `make build-backend` | Meng-compile binary Go ke `backend/bin/` (`server`, `migrate`, `seed`) | Binary Linux |
| `make build-frontend` | Build bundle produksi React ke `frontend/dist/` | Vite + Bun |
| `make docker-dev` | Menjalankan stack Docker Compose lokal di background | Docker Daemon |
| `make docker-down` | Menghentikan container Docker Compose | Docker Daemon |

---

## 2. Port & Service Mapping

| Layanan | Port Host | Port Kontainer | Protokol / Akses |
|---|---|---|---|
| **PostgreSQL 15** | `5432` | `5432` | TCP (Penyimpanan relasional & transaksi) |
| **Redis 7** | `6379` | `6379` | TCP (Cache sesi, rate limit counter) |
| **Backend Go API** | `8000` | `8000` | HTTP (`/api/*`, `/health`, `/uploads/*`) |
| **Frontend Vite (Dev)** | `5173` | - | HTTP (Hot module replacement) |
| **Frontend Nginx (Prod)** | `3000` / `80` | `80` | HTTP (Statis SPA React build) |
| **Nginx Reverse Proxy** | `80` / `443` | `80` / `443` | HTTP/HTTPS (Entry point produksi SSL) |

---

## 3. Matriks Konfigurasi Environment (`.env`)

Konfigurasi dibaca dari root [`.env`](file:///home/sans/coding/quiz_app/.env) (gunakan [backend/.env.example](file:///home/sans/coding/quiz_app/backend/.env.example) sebagai template):

| Variabel | Deskripsi | Nilai Default Dev | Rekomendasi Produksi |
|---|---|---|---|
| `PORT` | Port listening API server | `8000` | `8000` (dibalik Nginx) |
| `ENVIRONMENT` | Lingkungan runtime aplikasi | `development` | `production` (mengaktifkan Gin ReleaseMode) |
| `DB_HOST` | Host PostgreSQL | `localhost` | `postgres` (jika Docker) / IP internal private |
| `DB_PORT` | Port PostgreSQL | `5432` | `5432` |
| `DB_USER` | Username database | `postgres` | User khusus non-root |
| `DB_PASSWORD` | Password database | - | Minimal 24 karakter acak |
| `DB_NAME` | Nama database | `testhub` | `testhub` |
| `DB_POOL_SIZE` | Maksimum koneksi pool | `20` | `20` - `50` (sesuaikan memori VPS) |
| `DB_MAX_IDLE_CONNS`| Koneksi idle standby | `5` | `10` |
| `REDIS_URL` | Alamat host & port Redis | `localhost:6379` | `redis:6379` (atau auth protected) |
| `JWT_SECRET` | Kunci enkripsi token login | *dev-key* | **Wajib diubah** (min. 32 karakter acak) |
| `JWT_EXPIRY` | Masa berlaku akses token | `24h` | `24h` |
| `RATE_LIMIT_REQUESTS` | Batas request rate limiter | `100` | `100` |
| `RATE_LIMIT_WINDOW` | Jendela waktu rate limit | `1m` | `1m` |
| `GEMINI_API_KEY` | API Key LLM Gemini (AI Generator) | Opsional | Dapatkan dari Google AI Studio |
| `GROQ_API_KEY` | Alternatif LLM Groq (Llama 3) | Opsional | Dapatkan dari Groq Console |

---

## 4. Arsitektur Reverse Proxy (Nginx)

Konfigurasi produksi terpusat pada [nginx/nginx.conf](file:///home/sans/coding/quiz_app/nginx/nginx.conf):
- **`/`**: Routing ke kontainer Frontend SPA (HTML5 history fallback `try_files $uri /index.html`).
- **`/api/`**: Proxy pass ke backend Go (`http://backend:8000`) dengan injeksi header `X-Real-IP`, `X-Forwarded-For`, dan timeout 30s.
- **`/uploads/`**: Melayani media ilustrasi soal kuis dengan header cache statis 7 hari (`Cache-Control: public, max-age=604800`).
- **Rate Limit Zone**: Pembatasan `limit_req zone=api_limit burst=5 nodelay` pada pembuatan sesi kuis anonim (`/api/tests/*/start`).
- **Header Keamanan**: Mengaktifkan `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, dan `X-XSS-Protection`.

---

## 5. Prosedur Backup & Maintenance

Skrip automasi pemeliharaan tersimpan di direktori [scripts/](file:///home/sans/coding/quiz_app/scripts):

```bash
# 1. Inisialisasi Database Pertama Kali
./scripts/init-db.sh

# 2. Pemeriksaan Kesehatan Sistem Lengkap (Postgres, Redis, API)
./scripts/health-check.sh

# 3. Backup Database PostgreSQL Otomatis (Dump Gzip berstempel waktu)
./scripts/backup.sh

# 4. Deploy Pembaruan Sistem (Git Pull -> Build -> Container Rolling)
./scripts/deploy.sh
```

---

## 6. Panduan Optimasi VPS 2GB (Target 100K Users / 1K RPS)

1. **Alokasi Memori (Total 2048 MB)**:
   - PostgreSQL 15: `shared_buffers = 256MB`, `work_mem = 4MB` (~500 MB)
   - Redis 7: `maxmemory 128mb`, `maxmemory-policy allkeys-lru` (~150 MB)
   - Go Backend Binary: Ringan & efisien (~80 - 150 MB)
   - Nginx & OS Kernel: (~300 MB)
   - Cadangan Buffer & Page Cache: (~900 MB)
2. **Pengaturan Swap**: Aktifkan swap file 2GB (`/swapfile`) pada server VPS Linux untuk mencegah OOM-killer saat lonjakan beban bersamaan.
3. **Koneksi Pool Database**: Batasi `DB_POOL_SIZE=25` agar PostgreSQL tidak kehabisan RAM akibat koneksi gantung (*idle client connection*).
4. **Resilient In-Memory Fallback**: Jika Redis down, backend otomatis beralih ke cache memory lokal tanpa menyebabkan aplikasi crash.
