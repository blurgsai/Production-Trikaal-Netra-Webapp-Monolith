#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
TILESERVER_DIR="$ROOT_DIR/tileserver"
TILESERVER_IMAGE="trikaal-tileserver"
TILESERVER_CONTAINER="trikaal-tileserver-dev"

BACKEND_PID=""
FRONTEND_PID=""

# ── Helpers ──────────────────────────────────────────────────────────────────

kill_port() {
    local port="$1"
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "[dev] Killing process(es) on port $port (pid: $pids)..."
        echo "$pids" | xargs kill 2>/dev/null || true
        sleep 1
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
}

# ── Pre-start cleanup: stop everything from a previous run ───────────────────
echo "[dev] Cleaning up previous processes..."

# Stop & remove tileserver Docker container if it exists
if docker ps -aq -f name="$TILESERVER_CONTAINER" | grep -q .; then
    echo "[dev] Stopping existing tileserver container..."
    docker stop "$TILESERVER_CONTAINER" 2>/dev/null || true
    docker rm "$TILESERVER_CONTAINER" 2>/dev/null || true
fi

# Kill anything on backend (5000) and frontend (5173) ports
kill_port 5000
kill_port 5173
kill_port 8001

# ── Read JWT config from backend .env so tileserver can verify tokens ─────────
JWT_SECRET_VAL=""
JWT_ALGORITHM_VAL="HS256"
if [ -f "$BACKEND_DIR/.env" ]; then
    JWT_SECRET_VAL=$(grep -E '^JWT_SECRET=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d'=' -f2- || true)
    JWT_ALGORITHM_VAL=$(grep -E '^JWT_ALGORITHM=' "$BACKEND_DIR/.env" 2>/dev/null | cut -d'=' -f2- || true)
fi
[ -z "$JWT_SECRET_VAL" ] && JWT_SECRET_VAL="change-me"
[ -z "$JWT_ALGORITHM_VAL" ] && JWT_ALGORITHM_VAL="HS256"

# ── Cleanup on exit ──────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo "[dev] Shutting down..."
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "[dev] Frontend stopped"
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && echo "[dev] Backend stopped"
    docker stop "$TILESERVER_CONTAINER" 2>/dev/null && echo "[dev] Tileserver container stopped"
    wait 2>/dev/null
    echo "[dev] Done."
}
trap cleanup EXIT INT TERM

# ── Backend (FastAPI — direct) ───────────────────────────────────────────────
echo "[dev] Starting backend (uvicorn :5000)..."
(
    cd "$BACKEND_DIR"
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    exec uvicorn src.main:app --host 0.0.0.0 --port 5000 --reload
) &
BACKEND_PID=$!

# ── Frontend (Vite — direct) ─────────────────────────────────────────────────
echo "[dev] Starting frontend (vite)..."
(
    cd "$FRONTEND_DIR"
    exec npm run dev
) &
FRONTEND_PID=$!

# ── Tileserver (Docker container with volume mount) ──────────────────────────
echo "[dev] Building tileserver Docker image..."
docker build -t "$TILESERVER_IMAGE" "$TILESERVER_DIR"

mkdir -p "$TILESERVER_DIR/data"

echo "[dev] Starting tileserver (Docker :8001)..."
docker run -d \
    --name "$TILESERVER_CONTAINER" \
    -p 8001:8001 \
    -v "$TILESERVER_DIR":/app \
    -v "$TILESERVER_DIR/data":/app/data \
    -e JWT_SECRET="$JWT_SECRET_VAL" \
    -e JWT_ALGORITHM="$JWT_ALGORITHM_VAL" \
    -e TILESERVER_DATA_DIR=/app/data \
    --restart unless-stopped \
    "$TILESERVER_IMAGE" \
    uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload

echo ""
echo "[dev] All services are running."
echo "[dev]   Backend     → http://localhost:5000   (direct uvicorn)"
echo "[dev]   Frontend    → http://localhost:5173   (direct vite)"
echo "[dev]   Tileserver  → http://localhost:8001   (Docker container)"
echo "[dev] Press Ctrl+C to stop all."
echo ""

wait
