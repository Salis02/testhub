# 🚀 DEPLOYMENT GUIDE & MAKEFILE
## Production-Ready Setup for TestHub on 2GB VPS

---

## 1. DIRECTORY STRUCTURE

```
testhub/
├── Makefile                    # Main orchestration
├── docker-compose.yml          # Development services
├── docker-compose.prod.yml     # Production services
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── backend/                    # Go Server
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── models/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── database/
│   │   ├── cache/
│   │   └── config/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   ├── 002_add_indexes.sql
│   │   └── ...
│   ├── go.mod
│   ├── go.sum
│   ├── Dockerfile
│   └── .env.example
│
├── nginx/
│   ├── nginx.conf
│   └── Dockerfile
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
│
├── scripts/
│   ├── init-db.sh
│   ├── health-check.sh
│   ├── backup.sh
│   └── deploy.sh
│
└── .github/
    └── workflows/
        ├── test.yml
        └── deploy.yml
```

---

## 2. MAKEFILE - Complete Setup

```makefile
# testhub/Makefile
.PHONY: help setup dev prod logs down clean test migrate backup

# Variables
PROJECT_NAME := testhub
DOCKER_COMPOSE := docker-compose
DOCKER_COMPOSE_PROD := docker-compose -f docker-compose.prod.yml
ENV_FILE := .env

# Colors for output
YELLOW := \033[0;33m
GREEN := \033[0;32m
BLUE := \033[0;34m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)TestHub - SaaS Testing Platform$(NC)"
	@echo "$(BLUE)═══════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)Available Commands:$(NC)"
	@echo "  $(YELLOW)make setup$(NC)          - Initial setup (first time only)"
	@echo "  $(YELLOW)make dev$(NC)            - Start development environment"
	@echo "  $(YELLOW)make prod$(NC)           - Start production environment"
	@echo "  $(YELLOW)make logs$(NC)           - View logs (specify SERVICE=)"
	@echo "  $(YELLOW)make test$(NC)           - Run tests"
	@echo "  $(YELLOW)make migrate$(NC)        - Run database migrations"
	@echo "  $(YELLOW)make backup$(NC)         - Backup database"
	@echo "  $(YELLOW)make down$(NC)           - Stop all services"
	@echo "  $(YELLOW)make clean$(NC)          - Clean up containers and volumes"
	@echo "  $(YELLOW)make build-frontend$(NC) - Build frontend only"
	@echo "  $(YELLOW)make build-backend$(NC)  - Build backend only"
	@echo ""

## Setup & Installation
setup: check-env create-env docker-build migrate
	@echo "$(GREEN)✓ Setup complete! Run 'make dev' to start.$(NC)"

check-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "$(YELLOW)Creating .env file...$(NC)"; \
		cp .env.example $(ENV_FILE); \
		echo "$(YELLOW)Please update .env with your configuration$(NC)"; \
	else \
		echo "$(GREEN)✓ .env file exists$(NC)"; \
	fi

create-env:
	@echo "$(BLUE)Generating secure tokens...$(NC)"
	@echo "GENERATE_TOKENS_HERE"

docker-build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache

## Development
dev:
	@echo "$(GREEN)Starting development environment...$(NC)"
	$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend API: http://localhost:8000"
	@echo "  Adminer (DB): http://localhost:8080"
	@echo "  Redis CLI: redis-cli -p 6379"
	@echo ""
	@echo "$(YELLOW)Run 'make logs SERVICE=backend' to view logs$(NC)"

## Production
prod: docker-build
	@echo "$(GREEN)Starting production environment...$(NC)"
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "$(GREEN)✓ Production services started$(NC)"
	@sleep 5
	@make health-check

health-check:
	@echo "$(BLUE)Checking health...$(NC)"
	@./scripts/health-check.sh

## Database & Migrations
migrate:
	@echo "$(BLUE)Running database migrations...$(NC)"
	$(DOCKER_COMPOSE) exec backend /app/backend migrate
	@echo "$(GREEN)✓ Migrations completed$(NC)"

rollback:
	@echo "$(BLUE)Rolling back database...$(NC)"
	$(DOCKER_COMPOSE) exec backend /app/backend migrate down
	@echo "$(GREEN)✓ Rollback completed$(NC)"

seed-data:
	@echo "$(BLUE)Seeding test data...$(NC)"
	$(DOCKER_COMPOSE) exec backend /app/backend seed
	@echo "$(GREEN)✓ Seed data loaded$(NC)"

## Testing
test:
	@echo "$(BLUE)Running tests...$(NC)"
	$(DOCKER_COMPOSE) exec backend go test ./... -v
	@echo "$(GREEN)✓ Tests completed$(NC)"

test-coverage:
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(DOCKER_COMPOSE) exec backend go test ./... -v -coverprofile=coverage.out
	$(DOCKER_COMPOSE) exec backend go tool cover -html=coverage.out
	@echo "$(GREEN)✓ Coverage report generated$(NC)"

## Logs & Monitoring
logs:
	@if [ -z "$(SERVICE)" ]; then \
		$(DOCKER_COMPOSE) logs -f; \
	else \
		$(DOCKER_COMPOSE) logs -f $(SERVICE); \
	fi

logs-prod:
	@if [ -z "$(SERVICE)" ]; then \
		$(DOCKER_COMPOSE_PROD) logs -f; \
	else \
		$(DOCKER_COMPOSE_PROD) logs -f $(SERVICE); \
	fi

## Backup & Restore
backup:
	@echo "$(BLUE)Creating database backup...$(NC)"
	@./scripts/backup.sh
	@echo "$(GREEN)✓ Backup completed$(NC)"

restore:
	@echo "$(YELLOW)Restoring from backup (specify BACKUP_FILE=)...$(NC)"
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "Usage: make restore BACKUP_FILE=backup_2026_10_11.sql"; \
	else \
		$(DOCKER_COMPOSE) exec -T postgres psql -U postgres -d testhub < $(BACKUP_FILE); \
		echo "$(GREEN)✓ Restore completed$(NC)"; \
	fi

## Build Targets
build-frontend:
	@echo "$(BLUE)Building frontend...$(NC)"
	cd frontend && npm run build
	@echo "$(GREEN)✓ Frontend built$(NC)"

build-backend:
	@echo "$(BLUE)Building backend...$(NC)"
	cd backend && go build -o bin/server cmd/server/main.go
	@echo "$(GREEN)✓ Backend built$(NC)"

## Deployment
deploy:
	@echo "$(GREEN)Deploying to production...$(NC)"
	@./scripts/deploy.sh
	@echo "$(GREEN)✓ Deployment completed$(NC)"

## Cleanup
down:
	@echo "$(YELLOW)Stopping all services...$(NC)"
	$(DOCKER_COMPOSE) down

down-prod:
	@echo "$(YELLOW)Stopping production services...$(NC)"
	$(DOCKER_COMPOSE_PROD) down

clean:
	@echo "$(YELLOW)Cleaning up...$(NC)"
	$(DOCKER_COMPOSE) down -v
	docker system prune -f
	@echo "$(GREEN)✓ Cleanup completed$(NC)"

## Database Console
psql:
	@$(DOCKER_COMPOSE) exec postgres psql -U postgres -d testhub

redis-cli:
	@$(DOCKER_COMPOSE) exec redis redis-cli

## Version & Info
version:
	@echo "$(BLUE)TestHub Version$(NC)"
	@echo "Frontend: $$(cd frontend && npm list react 2>/dev/null | grep react | head -1)"
	@echo "Backend: Go $$(go version 2>/dev/null | awk '{print $$3}')"

# Dev commands
install-deps:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	cd frontend && npm install
	cd ../backend && go mod download
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

lint:
	@echo "$(BLUE)Running linters...$(NC)"
	cd frontend && npm run lint
	cd ../backend && go vet ./...
	@echo "$(GREEN)✓ Linting completed$(NC)"

format:
	@echo "$(BLUE)Formatting code...$(NC)"
	cd frontend && npm run format
	cd ../backend && go fmt ./...
	@echo "$(GREEN)✓ Formatting completed$(NC)"

security-check:
	@echo "$(BLUE)Security scanning...$(NC)"
	cd frontend && npm audit
	cd ../backend && go list -json -m all | nancy sleuth
	@echo "$(GREEN)✓ Security check completed$(NC)"

.DEFAULT_GOAL := help
```

---

## 3. DOCKER COMPOSE - Development

```yaml
# testhub/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ${PROJECT_NAME}_postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - testhub_network

  redis:
    image: redis:7-alpine
    container_name: ${PROJECT_NAME}_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - testhub_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ${PROJECT_NAME}_backend
    environment:
      PORT: 8000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ENVIRONMENT: development
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: go run cmd/server/main.go
    networks:
      - testhub_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    container_name: ${PROJECT_NAME}_frontend
    ports:
      - "3000:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost:8000
    networks:
      - testhub_network
    depends_on:
      - backend

  # For database management
  adminer:
    image: adminer
    container_name: ${PROJECT_NAME}_adminer
    ports:
      - "8080:8080"
    networks:
      - testhub_network
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:

networks:
  testhub_network:
    driver: bridge
```

---

## 4. DOCKER COMPOSE - Production

```yaml
# testhub/docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: testhub_postgres_prod
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c work_mem=8MB"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - testhub_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: testhub_redis_prod
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data_prod:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - testhub_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        - ENV=production
    container_name: testhub_backend_prod
    environment:
      PORT: 8000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ENVIRONMENT: production
      LOG_LEVEL: info
    expose:
      - "8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    networks:
      - testhub_network
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    container_name: testhub_frontend_prod
    expose:
      - "3000"
    environment:
      VITE_API_URL: https://${DOMAIN}/api
    restart: always
    networks:
      - testhub_network

  nginx:
    image: nginx:alpine
    container_name: testhub_nginx_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - frontend
      - backend
    restart: always
    networks:
      - testhub_network
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

volumes:
  postgres_data_prod:
  redis_data_prod:

networks:
  testhub_network:
    driver: bridge
```

---

## 5. .ENV TEMPLATE

```bash
# testhub/.env.example

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=testuser
DB_PASSWORD=SecurePassword123!@#
DB_NAME=testhub
DB_POOL_SIZE=20
DB_MAX_IDLE_CONNS=5

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=RedisPassword123

# JWT & Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Server
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=debug
DOMAIN=localhost

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@testhub.com

# Payment (Stripe)
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=testhub-uploads

# Google reCAPTCHA
RECAPTCHA_SITE_KEY=xxxxx
RECAPTCHA_SECRET_KEY=xxxxx

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Session
SESSION_TIMEOUT=24h
```

---

## 6. INITIALIZATION SCRIPTS

### scripts/init-db.sh
```bash
#!/bin/bash
set -e

echo "🔧 Initializing database..."

# Run migrations
docker-compose exec -T backend go run cmd/migrate/main.go up

# Seed development data (only if dev environment)
if [ "$ENVIRONMENT" = "development" ]; then
    echo "📊 Seeding test data..."
    docker-compose exec -T backend go run cmd/seed/main.go
fi

echo "✅ Database initialization complete!"
```

### scripts/backup.sh
```bash
#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y_%m_%d_%H_%M_%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "💾 Creating database backup..."
docker-compose exec -T postgres pg_dump -U ${DB_USER} ${DB_NAME} > ${BACKUP_FILE}

# Compress backup
gzip ${BACKUP_FILE}

echo "✅ Backup created: ${BACKUP_FILE}.gz"

# Keep only last 7 backups
find $BACKUP_DIR -name "backup_*.sql.gz" -type f -mtime +7 -delete

echo "🧹 Old backups cleaned up"
```

### scripts/deploy.sh
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Build images
make docker-build

# Run migrations
make migrate

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Run health check
./scripts/health-check.sh

echo "✅ Deployment complete!"
```

---

## 7. SETUP INSTRUCTIONS

### Step 1: Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd testhub

# Run setup (creates .env, builds images, runs migrations)
make setup

# View available commands
make help
```

### Step 2: Development
```bash
# Start development environment
make dev

# Check logs
make logs SERVICE=backend

# Run tests
make test

# Run migrations
make migrate
```

### Step 3: Production Deployment

#### On VPS (2GB RAM, 1 Core)

```bash
# SSH into VPS
ssh root@your-vps-ip

# Install prerequisites
sudo apt-get update
sudo apt-get install -y \
    docker.io \
    docker-compose \
    git \
    curl

# Clone and setup
git clone <repo-url> /opt/testhub
cd /opt/testhub

# Copy and edit .env
cp .env.example .env
nano .env  # Edit with real values

# Deploy
make deploy
```

#### Nginx Configuration
```nginx
# nginx/nginx.conf
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    location /api/tests/*/start {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://backend;
    }
}
```

---

## 8. MONITORING & HEALTH CHECKS

### Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

echo "🏥 Checking system health..."

# Check PostgreSQL
if ! nc -z postgres 5432 2>/dev/null; then
    echo "❌ PostgreSQL not responding"
    exit 1
fi

# Check Redis
if ! nc -z redis 6379 2>/dev/null; then
    echo "❌ Redis not responding"
    exit 1
fi

# Check Backend API
if ! curl -f http://backend:8000/health 2>/dev/null; then
    echo "❌ Backend API not responding"
    exit 1
fi

echo "✅ All systems healthy!"
```

---

## 9. SCALING GUIDE (When you grow)

### Horizontal Scaling
```bash
# Add more backend instances
docker run -d \
  --name backend-2 \
  --network testhub_network \
  -e PORT=8001 \
  -e DB_HOST=postgres \
  testhub-backend:latest

# Update nginx upstream
upstream backend {
    server backend:8000;
    server backend-2:8001;
}
```

### Vertical Scaling
- Upgrade VPS: 4GB → 8GB → 16GB
- Increase database pool size
- Increase Redis memory limit
- Add read replicas for PostgreSQL

---

**End of Deployment Guide**
