#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "======================================================================"
echo "  E-COMMERCE SALES ANALYSIS & CUSTOMER SEGMENTATION PLATFORM (RFM)   "
echo "  Real R Analytics Engine + FastAPI + React + Tailwind + Plotly.js     "
echo "======================================================================"

# 1. Setup PATH
export PATH="$DIR/.tools/node/bin:$PATH"
export PYTHONPATH="$DIR/backend:$PYTHONPATH"

# 2. Check Python venv
if [ ! -d "$DIR/venv" ]; then
    echo "[!] Setting up Python virtual environment..."
    python3 -m venv "$DIR/venv"
    "$DIR/venv/bin/pip" install -r "$DIR/backend/requirements.txt"
fi

# 3. Check R environment
echo "[+] Validating Rscript..."
if command -v /usr/local/bin/Rscript >/dev/null 2>&1; then
    RSCRIPT="/usr/local/bin/Rscript"
else
    RSCRIPT="$(which Rscript 2>/dev/null || echo '')"
fi

if [ -z "$RSCRIPT" ]; then
    echo "[ERROR] Rscript not found in standard system paths!"
    exit 1
fi
echo "[+] Using Rscript: $RSCRIPT"

# 4. Start Server
PORT=${PORT:-8000}
echo "[+] Starting FastAPI Application Server on http://localhost:$PORT..."
echo "    - Web Dashboard:  http://localhost:$PORT"
echo "    - API Docs:       http://localhost:$PORT/docs"
echo "    - Press Ctrl+C to terminate."
echo "======================================================================"

exec "$DIR/venv/bin/uvicorn" app.main:app --app-dir "$DIR/backend" --host 0.0.0.0 --port "$PORT" --reload
