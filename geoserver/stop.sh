#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# stop.sh — Clean shutdown of all GeoServer replication services
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[stop] Stopping services..."
docker compose down

echo "[stop] All services stopped."
echo "[stop] Volumes preserved. To wipe data, run: docker compose down -v"
