#!/usr/bin/env bash
# Cloud Agent start: per-boot runtime initialization.
# Starts PostgreSQL and ensures the local dev role, database, and schema exist.
# Idempotent: safe to run on every boot.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PG_VERSION=16
PG_CLUSTER=main

# Install PostgreSQL if the base image / snapshot does not already have it.
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "==> Installing PostgreSQL ${PG_VERSION}"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

echo "==> Starting PostgreSQL cluster ${PG_VERSION}/${PG_CLUSTER}"
sudo pg_ctlcluster "${PG_VERSION}" "${PG_CLUSTER}" start 2>/dev/null || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "==> Ensuring role 'arc' and database 'arc_dev'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='arc'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE arc LOGIN PASSWORD 'arc' SUPERUSER;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='arc_dev'" | grep -q 1 \
  || sudo -u postgres createdb -O arc arc_dev

echo "==> Applying schema (idempotent; schema.sql uses IF NOT EXISTS)"
PGPASSWORD=arc psql -h 127.0.0.1 -U arc -d arc_dev -v ON_ERROR_STOP=1 \
  -f backend/scripts/mongo-pg/schema.sql >/dev/null

echo "==> start.sh complete: Postgres ready on 127.0.0.1:5432 (db arc_dev)"
