#!/bin/bash
set -e

echo "🏥 Checking TestHub system health..."

if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend API is responding at http://localhost:8000/health"
else
    echo "❌ Backend API is not responding"
    exit 1
fi
