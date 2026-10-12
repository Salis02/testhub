#!/bin/bash
set -e

echo "🔧 Initializing TestHub database..."

cd "$(dirname "$0")/../backend"
GOTOOLCHAIN=local go run cmd/migrate/main.go
GOTOOLCHAIN=local go run cmd/seed/main.go

echo "✅ Database initialization & seed complete!"
