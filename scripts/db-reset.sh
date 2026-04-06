#!/usr/bin/env bash
# db-reset.sh
# Drops the public schema entirely, recreates it, grants privileges,
# wipes the prisma/migrations folder, runs `prisma migrate dev --name init`,
# and finally seeds the database.
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/dbname" bash scripts/db-reset.sh
#
# The script reads DATABASE_URL from the environment. If not set it falls back
# to .env (loaded with dotenv-style parsing below).

set -euo pipefail

# Add sslmode=require for remote Postgres URLs when not explicitly configured.
with_sslmode_if_needed() {
  local url="$1"

  if [[ "$url" == *"localhost"* ]] || [[ "$url" == *"127.0.0.1"* ]]; then
    echo "$url"
    return
  fi

  if [[ "$url" == *"sslmode="* ]]; then
    echo "$url"
    return
  fi

  if [[ "$url" == *"?"* ]]; then
    echo "${url}&sslmode=require"
  else
    echo "${url}?sslmode=require"
  fi
}

# ---------------------------------------------------------------------------
# 1. Resolve DATABASE_URL
# ---------------------------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
  ENV_FILE="$(dirname "$0")/../.env"
  if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC2046
    export $(grep -v '^#' "$ENV_FILE" | grep 'DATABASE_URL' | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or add it to .env" >&2
  exit 1
fi

# Use full connection URL so URL-encoded credentials work reliably.
DATABASE_URL_PSQL="$(with_sslmode_if_needed "$DATABASE_URL")"

echo "=== DB Reset ==="
echo "  Using DATABASE_URL (credentials hidden)"
if [[ "$DATABASE_URL_PSQL" == *"sslmode=require"* ]]; then
  echo "  SSL  : require"
fi
echo ""

# ---------------------------------------------------------------------------
# 3. Drop & recreate the public schema, then grant privileges
# ---------------------------------------------------------------------------
echo ">>> Dropping and recreating public schema..."
psql "$DATABASE_URL_PSQL" <<SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO public;
SQL
echo "    Done."

# ---------------------------------------------------------------------------
# 4. Delete the prisma/migrations folder
# ---------------------------------------------------------------------------
MIGRATIONS_DIR="$(dirname "$0")/../prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  echo ">>> Removing $MIGRATIONS_DIR ..."
  rm -rf "$MIGRATIONS_DIR"
  echo "    Done."
else
  echo ">>> $MIGRATIONS_DIR not found — skipping removal."
fi

# ---------------------------------------------------------------------------
# 5. Run prisma migrate dev --name init
# ---------------------------------------------------------------------------
REPO_ROOT="$(dirname "$0")/.."
echo ">>> Running prisma migrate dev --name init ..."
cd "$REPO_ROOT"
npx prisma migrate dev --name init
echo "    Done."

# ---------------------------------------------------------------------------
# 6. Seed the database
# ---------------------------------------------------------------------------
echo ">>> Seeding database ..."
npm run db:seed
echo "    Done."

echo ""
echo "=== Reset complete ==="
