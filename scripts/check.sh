#!/usr/bin/env bash
# Full verification: backend tests, frontend typecheck and production build.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ backend: pytest"
(cd "$ROOT/backend" && python -m pytest -q)

echo "→ frontend: typecheck"
(cd "$ROOT/frontend" && npx tsc --noEmit)

echo "→ frontend: production build"
(cd "$ROOT/frontend" && npm run build)

echo
echo "✅ all checks passed"
