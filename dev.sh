#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "[dev] Shutting down..."
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "[dev] Frontend stopped"
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && echo "[dev] Backend stopped"
    wait 2>/dev/null
    echo "[dev] Done."
}
trap cleanup EXIT INT TERM

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[dev] Starting backend (uvicorn :5000)..."
(
    cd "$BACKEND_DIR"
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    exec uvicorn src.main:app --host 0.0.0.0 --port 5000 --reload
) &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[dev] Starting frontend (vite)..."
(
    cd "$FRONTEND_DIR"
    exec npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "[dev] Both services are running."
echo "[dev]   Backend  → http://localhost:5000"
echo "[dev]   Frontend → http://localhost:5173 (default vite port)"
echo "[dev] Press Ctrl+C to stop both."
echo ""

wait
