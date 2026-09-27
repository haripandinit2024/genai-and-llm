#!/usr/bin/env bash
# Start the FastAPI backend and the Vite dev server together.
# Ctrl+C stops both. Requires python + uvicorn and node + npm dependencies.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${MULTICODE_PORT:-8001}"
FRONTEND_PORT="${VITE_PORT:-5174}"

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "→ installing frontend dependencies (npm install)"
  (cd "$ROOT/frontend" && npm install)
fi

echo "→ backend  http://127.0.0.1:${BACKEND_PORT}  (docs at /docs)"
(cd "$ROOT/backend" && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port "$BACKEND_PORT") &
BACKEND_PID=$!

cleanup() {
  echo
  echo "→ stopping backend (pid ${BACKEND_PID})"
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ frontend http://localhost:${FRONTEND_PORT}"
cd "$ROOT/frontend"
MULTICODE_BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" npm run dev -- --port "$FRONTEND_PORT"
