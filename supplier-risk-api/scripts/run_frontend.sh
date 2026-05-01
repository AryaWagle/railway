#!/usr/bin/env bash
# Start the Streamlit dashboard on http://127.0.0.1:8501.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${VIRTUAL_ENV:-}" ] && [ -x ".venv/bin/python" ]; then
    # Prefer the repo-local venv if present and not already active.
    PYTHON=".venv/bin/python"
else
    PYTHON="${PYTHON:-python3}"
fi
PORT="${PORT:-8501}"
HOST="${HOST:-0.0.0.0}"
export RISK_API_URL="${RISK_API_URL:-http://127.0.0.1:8000}"
APP_ENV="${APP_ENV:-development}"

echo "==> Starting Streamlit on http://${HOST}:${PORT}"
echo "    Backend: $RISK_API_URL"
if [ "$APP_ENV" = "production" ]; then
    exec "$PYTHON" -m streamlit run frontend/app.py \
      --server.port "$PORT" \
      --server.address "$HOST" \
      --server.fileWatcherType none \
      --browser.gatherUsageStats false \
      --client.showErrorDetails false \
      --client.toolbarMode minimal
else
    exec "$PYTHON" -m streamlit run frontend/app.py --server.port "$PORT" --server.address "$HOST"
fi
