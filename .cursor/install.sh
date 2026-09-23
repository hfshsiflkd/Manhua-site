#!/usr/bin/env bash
# Cloud Agent install: idempotent repository bootstrap after checkout.
# Installs Node dependencies and writes local (gitignored) dev env files.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Installing backend dependencies"
( cd backend && npm ci )

echo "==> Installing frontend dependencies"
( cd frontend && npm ci )

# Backend env (gitignored). Postgres driver + local dev database.
if [ ! -f backend/.env ]; then
  echo "==> Writing backend/.env"
  cat > backend/.env <<'EOF'
DB_DRIVER=postgres
DATABASE_URL=postgresql://arc:arc@127.0.0.1:5432/arc_dev
JWT_SECRET=dev-local-jwt-secret-0123456789abcdef
JWT_EXPIRES_IN=30d
PORT=9000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF
fi

# Frontend env (gitignored). Points the Next app at the local Express API.
if [ ! -f frontend/.env.local ]; then
  echo "==> Writing frontend/.env.local"
  cat > frontend/.env.local <<'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:9000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_INTERNAL_URL=http://localhost:9000/api
SESSION_BRIDGE_SECRET=dev-session-bridge-secret-0123456789abcdef0123456789abcdef
EOF
fi

echo "==> install.sh complete"
