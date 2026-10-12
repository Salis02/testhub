#!/bin/bash
set -e

echo "🚀 Deploying TestHub..."

cd "$(dirname "$0")/.."
make build-backend
make migrate
make seed

echo "✅ Deployment completed successfully!"
