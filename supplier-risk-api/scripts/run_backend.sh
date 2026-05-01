#!/usr/bin/env bash
# Start the FastAPI backend on http://127.0.0.1:8000.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${VIRTUAL_ENV:-}" ] && [ -x ".venv/bin/python" ]; then
    # Prefer the repo-local venv if present and not already active.
    PYTHON=".venv/bin/python"
else
    PYTHON="${PYTHON:-python3}"
fi
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
APP_ENV="${APP_ENV:-development}"
RELOAD="${RELOAD:-}"

if [ -z "$RELOAD" ]; then
    if [ "$APP_ENV" = "production" ]; then
        RELOAD="false"
    else
        RELOAD="true"
    fi
fi

if [ ! -f backend/ml/risk_model.joblib ]; then
    echo "Model not found. Running bootstrap first..."
    bash "$(dirname "$0")/bootstrap.sh"
fi

echo "==> Starting FastAPI on http://${HOST}:${PORT}"
if [ "$RELOAD" = "true" ]; then
    exec "$PYTHON" -m uvicorn backend.app.main:app --host "$HOST" --port "$PORT" --reload
else
    exec "$PYTHON" -m uvicorn backend.app.main:app --host "$HOST" --port "$PORT"
fi
