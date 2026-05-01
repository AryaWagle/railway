#!/usr/bin/env bash
# Generate synthetic supplier data and train the risk model.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${VIRTUAL_ENV:-}" ] && [ -x ".venv/bin/python" ]; then
    # Prefer the repo-local venv if present and not already active.
    PYTHON=".venv/bin/python"
else
    PYTHON="${PYTHON:-python3}"
fi

echo "==> Generating synthetic supplier data..."
"$PYTHON" backend/data/generate_data.py

echo
echo "==> Training risk model..."
"$PYTHON" backend/ml/train_model.py

echo
echo "Bootstrap complete. Start the backend with: ./scripts/run_backend.sh"
