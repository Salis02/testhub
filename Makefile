# Makefile for TestHub SaaS Platform
.PHONY: help setup dev prod logs down clean test migrate seed build-backend build-frontend

PROJECT_NAME := testhub
ENV_FILE := .env

# Colors
YELLOW := \033[0;33m
GREEN := \033[0;32m
BLUE := \033[0;34m
NC := \033[0m

help:
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)TestHub - SaaS Testing & Assessment Platform$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)Commands:$(NC)"
	@echo "  $(YELLOW)make setup$(NC)          - Setup environment, migrate and seed data"
	@echo "  $(YELLOW)make dev$(NC)            - Run backend locally on port 8000"
	@echo "  $(YELLOW)make dev-backend$(NC)    - Alias for make dev"
	@echo "  $(YELLOW)make kill-backend$(NC)   - Kill any process occupying port 8000"
	@echo "  $(YELLOW)make restart-backend$(NC)- Free port 8000 and run backend"
	@echo "  $(YELLOW)make dev-frontend$(NC)   - Run React frontend (Vite/Bun) on port 5173"
	@echo "  $(YELLOW)make migrate$(NC)        - Run database migrations"
	@echo "  $(YELLOW)make seed$(NC)           - Seed initial admin and quiz catalog"
	@echo "  $(YELLOW)make test$(NC)           - Run Go test suite"
	@echo "  $(YELLOW)make build-backend$(NC)  - Build backend binaries into bin/"
	@echo "  $(YELLOW)make build-frontend$(NC) - Build React frontend bundle"
	@echo "  $(YELLOW)make docker-dev$(NC)     - Start full Docker Compose stack"
	@echo "  $(YELLOW)make docker-down$(NC)    - Stop Docker Compose stack"
	@echo ""

setup: check-env migrate seed
	@echo "$(GREEN)✓ TestHub backend setup complete!$(NC)"

check-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Creating .env from backend/.env.example...$(NC)"; \
		cp backend/.env.example $(ENV_FILE); \
	fi

migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	cd backend && GOTOOLCHAIN=local go run cmd/migrate/main.go
	@echo "$(GREEN)✓ Migrations complete!$(NC)"

seed:
	@echo "$(BLUE)Seeding catalog & admin user...$(NC)"
	cd backend && GOTOOLCHAIN=local go run cmd/seed/main.go
	@echo "$(GREEN)✓ Seed data loaded!$(NC)"

test:
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd backend && GOTOOLCHAIN=local go test ./tests -v
	@echo "$(GREEN)✓ Tests passed!$(NC)"

build-backend:
	@echo "$(BLUE)Building backend server binary...$(NC)"
	mkdir -p backend/bin
	cd backend && GOTOOLCHAIN=local go build -o bin/server cmd/server/main.go
	cd backend && GOTOOLCHAIN=local go build -o bin/migrate cmd/migrate/main.go
	cd backend && GOTOOLCHAIN=local go build -o bin/seed cmd/seed/main.go
	@echo "$(GREEN)✓ Binaries built in backend/bin/$(NC)"

build-frontend:
	@echo "$(BLUE)Building frontend...$(NC)"
	cd frontend && (which bun >/dev/null 2>&1 && bun run build || npm run build)
	@echo "$(GREEN)✓ Frontend built!$(NC)"

dev-backend: dev

dev-frontend:
	@echo "$(GREEN)Starting TestHub Frontend (Vite) on :5173...$(NC)"
	cd frontend && (which bun >/dev/null 2>&1 && bun run dev || npm run dev)

dev:
	@echo "$(GREEN)Starting TestHub API server on :8000...$(NC)"
	cd backend && GOTOOLCHAIN=local go run cmd/server/main.go

kill-backend:
	@echo "$(YELLOW)Stopping any running backend server on port 8000...$(NC)"
	@fuser -k 8000/tcp 2>/dev/null || true
	@echo "$(GREEN)✓ Port 8000 is clean!$(NC)"

restart-backend: kill-backend dev

docker-dev:
	docker compose up -d

docker-down:
	docker compose down

