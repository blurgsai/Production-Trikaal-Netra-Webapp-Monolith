#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# start.sh — Single-command startup for offline GeoServer replication
#
# Brings up PostGIS + GeoServer + pgAdmin, waits for health, then runs
# provisioning scripts to create workspaces, stores, and layers via REST API.
#
# Usage: ./start.sh [--no-init]
#   --no-init   Skip GeoServer REST API provisioning (use existing config)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RUN_INIT=true
if [ "${1:-}" = "--no-init" ]; then
    RUN_INIT=false
fi

# ── Ensure .env exists ────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo "[start] No .env found — copying from .env.example"
    cp .env.example .env
    echo "[start] Edit .env to change passwords, then re-run ./start.sh"
fi

# ── Create runtime directories ────────────────────────────────────────────────
mkdir -p logs data

# ── Pull images (offline-friendly: uses cache if available) ───────────────────
echo "[start] Pulling Docker images..."
docker compose pull 2>/dev/null || true

# ── Start services ────────────────────────────────────────────────────────────
echo "[start] Starting services..."
docker compose up -d

# ── Wait for GeoServer to be healthy ──────────────────────────────────────────
GEOSERVER_PORT=$(grep -E '^GEOSERVER_PORT=' .env 2>/dev/null | cut -d'=' -f2 || echo 8080)
GEOSERVER_PORT=${GEOSERVER_PORT:-8080}

echo "[start] Waiting for GeoServer to be ready (port $GEOSERVER_PORT)..."
MAX_RETRIES=30
attempt=0
until curl -s -f -o /dev/null "http://localhost:${GEOSERVER_PORT}/geoserver/" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $MAX_RETRIES ]; then
        echo "[start] ERROR: GeoServer not ready after $MAX_RETRIES attempts"
        docker compose logs geoserver --tail 20
        exit 1
    fi
    echo "[start]   Attempt $attempt/$MAX_RETRIES — waiting..."
    sleep 10
done
echo "[start] GeoServer is ready!"

# ── Run provisioning scripts ──────────────────────────────────────────────────
if [ "$RUN_INIT" = true ]; then
    echo "[start] Running GeoServer provisioning scripts..."
    for script in scripts/init-*.sh; do
        if [ -f "$script" ] && [ -x "$script" ]; then
            echo "[start]   Running: $script"
            "$script" "$GEOSERVER_PORT"
        fi
    done
    echo "[start] Provisioning complete."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
POSTGIS_PORT=$(grep -E '^POSTGIS_PORT=' .env 2>/dev/null | cut -d'=' -f2 || echo 5432)
POSTGIS_PORT=${POSTGIS_PORT:-5432}
PGADMIN_PORT=$(grep -E '^PGADMIN_PORT=' .env 2>/dev/null | cut -d'=' -f2 || echo 5050)
PGADMIN_PORT=${PGADMIN_PORT:-5050}

echo ""
echo "[start] All services are running:"
echo "  GeoServer  → http://localhost:${GEOSERVER_PORT}/geoserver"
echo "  PostGIS    → localhost:${POSTGIS_PORT}"
echo "  pgAdmin    → http://localhost:${PGADMIN_PORT}"
echo ""
echo "  GeoServer credentials: admin / geoserver (default)"
echo "  PostGIS credentials:   postgres / (see .env)"
echo ""
echo "  Stop with: ./stop.sh"
