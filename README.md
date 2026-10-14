# 🎯 TestHub - Production Testing & Assessment Platform

> **Platform SaaS asesmen dan tryout modern berkinerja tinggi (CPNS, SBMPTN, IQ, dan Custom BUMN) dengan auto-grading instan, penilaian esai manual, AI Question Assistant, dan monetisasi multi-channel.**  
> Target: **100K Pengguna, 1K+ RPS, Infrastruktur Single VPS 2GB (< Rp 200rb/bln), Margin Kotor > 90%**

---

## 📚 Indeks Dokumentasi

| Dokumen | Fokus Utama |
|---|---|
| [PRODUCT_REQUIREMENTS_DOCUMENT.md](file:///home/sans/coding/quiz_app/PRODUCT_REQUIREMENTS_DOCUMENT.md) | **PRD & Bisnis:** Analisis kebutuhan pengguna (siswa/guru/admin), 4 model monetisasi, dan roadmap prioritas ROI. |
| [ARCHITECTURE_AND_SCHEMA.md](file:///home/sans/coding/quiz_app/ARCHITECTURE_AND_SCHEMA.md) | **Sistem & Data:** Diagram sistem, skema PostgreSQL 15, Redis cache, kamus kontrak API 3-role, dan SOP backend. |
| [IMPLEMENTATION_AND_CODE.md](file:///home/sans/coding/quiz_app/IMPLEMENTATION_AND_CODE.md) | **Panduan Koding:** Status modul, panduan ekstensi fitur baru, arsitektur repository, dan checklist anti-debt. |
| [FRONTEND_ARCHITECTURE.md](file:///home/sans/coding/quiz_app/FRONTEND_ARCHITECTURE.md) | **Arsitektur Frontend:** Standar React 19, TanStack Query v5, Zustand v5, Zod validation, dan SOP frontend. |
| [AI_AGENT_AND_SECURITY.md](file:///home/sans/coding/quiz_app/AI_AGENT_AND_SECURITY.md) | **AI & Keamanan:** Arsitektur generator soal 3-tier (Gemini/Groq/Fallback), validasi soal, dan threat model. |
| [DEPLOYMENT_AND_MAKEFILE.md](file:///home/sans/coding/quiz_app/DEPLOYMENT_AND_MAKEFILE.md) | **DevOps & Infra:** Cheatsheet Makefile, Docker Compose, Nginx reverse proxy, dan panduan tuning VPS 2GB. |
| [style.md](file:///home/sans/coding/quiz_app/style.md) | **Design System:** Strict Tri-Color palette per mode, tipografi tabular, CSS variables, dan standar anti-AI-slop. |

---

## ⚡ Tech Stack Ringkas

- **Backend:** Go 1.22+ (Gin Web Framework, `sqlx`, PostgreSQL 15, Redis 7 dengan in-memory fallback, `golang-jwt/v5`, Bcrypt).
- **Frontend:** React 19, Bun runtime, Vite 8, TypeScript, TanStack Query v5, Zustand v5, React Hook Form v7 + Zod, Tailwind CSS.
- **Infrastruktur:** Nginx reverse proxy, Docker & Docker Compose, single VPS Linux.

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### Prasyarat
- Go 1.22+ & Bun (atau Node.js 18+)
- PostgreSQL (port 5432) & Redis (port 6379, opsional dengan auto-memory fallback)

### 1. Backend & Database
```bash
# Setup otomatis (buat .env, jalankan migrasi DB, dan seed data)
make setup

# Jalankan server backend (http://localhost:8000)
make dev
```

### 2. Frontend
```bash
# Menjalankan dev server frontend (http://localhost:3000 / 5173)
make dev-frontend

# Type-check & build produksi frontend
make build-frontend
```

### 3. Akun Admin Default
- **Email:** `admin@testhub.com`
- **Password:** `AdminPassword123!`

---

## 🛠️ Alur Ekstensi Fitur Baru (Clean Architecture)

```
1. Migrasi DB      -> backend/migrations/00X_nama_fitur.sql
2. Model & DTO     -> backend/internal/models/models.go & dto.go
3. Repository      -> backend/internal/repository/nama_repository.go
4. HTTP Handler    -> backend/internal/handlers/nama_handler.go
5. Registrasi Rute -> backend/internal/handlers/routes.go
6. Unit Test       -> backend/tests/api_test.go
7. Integrasi UI    -> frontend/src/services/client.ts & domain components
```
