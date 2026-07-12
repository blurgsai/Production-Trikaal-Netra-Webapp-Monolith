import json
import sqlite3
import uuid
from datetime import datetime, timezone

from src.shared.config import METADATA_DB_PATH


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(METADATA_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_overlays_db() -> None:
    conn = _get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS overlays (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            type         TEXT NOT NULL,
            source_type  TEXT NOT NULL,
            file_path    TEXT,
            tile_url     TEXT NOT NULL,
            attribution  TEXT DEFAULT '',
            color        TEXT DEFAULT '#3388ff',
            opacity      REAL DEFAULT 1.0,
            bounds       TEXT,
            created_at   TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()
    _migrate_add_bounds_column()


def _migrate_add_bounds_column() -> None:
    """Add bounds column if it doesn't exist (idempotent migration)."""
    conn = _get_db()
    cols = {row[1] for row in conn.execute("PRAGMA table_info(overlays)")}
    if "bounds" not in cols:
        conn.execute("ALTER TABLE overlays ADD COLUMN bounds TEXT")
        conn.commit()
    conn.close()


def backfill_overlay_bounds(overlay_id: str, bounds: list[float]) -> None:
    """Store bounds for an existing overlay (used for migration/backfill)."""
    bounds_json = json.dumps(bounds) if bounds else None
    conn = _get_db()
    conn.execute(
        "UPDATE overlays SET bounds = ? WHERE id = ?",
        (bounds_json, overlay_id),
    )
    conn.commit()
    conn.close()


def _parse_bounds(row: dict) -> dict:
    """Parse the bounds JSON string column into a list (or None)."""
    raw = row.get("bounds")
    if raw and isinstance(raw, str):
        try:
            row["bounds"] = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            row["bounds"] = None
    return row


def list_overlays() -> list[dict]:
    conn = _get_db()
    rows = conn.execute(
        "SELECT id, name, type, source_type, tile_url, attribution, color, opacity, bounds, created_at "
        "FROM overlays ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [_parse_bounds(dict(row)) for row in rows]


def get_overlay(overlay_id: str) -> dict | None:
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM overlays WHERE id = ?", (overlay_id,)
    ).fetchone()
    conn.close()
    return _parse_bounds(dict(row)) if row else None


def insert_file_overlay(
    name: str, source_type: str, file_path: str, attribution: str, color: str, opacity: float, tile_url: str | None = None,
    overlay_id: str | None = None, bounds: list[float] | None = None,
) -> dict:
    if overlay_id is None:
        overlay_id = uuid.uuid4().hex[:12]

    if tile_url is None:
        if source_type in ("mbtiles", "sqlite", "directory"):
            tile_url = f"/tiles/{overlay_id}/{{z}}/{{x}}/{{y}}.png"
        else:
            tile_url = f"/overlays/{overlay_id}/data"

    created_at = datetime.now(timezone.utc).isoformat()
    bounds_json = json.dumps(bounds) if bounds else None

    conn = _get_db()
    conn.execute(
        "INSERT INTO overlays (id, name, type, source_type, file_path, tile_url, attribution, color, opacity, bounds, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (overlay_id, name, "file", source_type, file_path, tile_url, attribution, color, opacity, bounds_json, created_at),
    )
    conn.commit()
    conn.close()

    return {
        "id": overlay_id,
        "name": name,
        "type": "file",
        "source_type": source_type,
        "file_path": file_path,
        "tile_url": tile_url,
        "attribution": attribution,
        "color": color,
        "opacity": opacity,
        "bounds": bounds,
        "created_at": created_at,
    }


def insert_url_overlay(
    name: str, tile_url: str, overlay_type: str, attribution: str, color: str, opacity: float
) -> dict:
    overlay_id = uuid.uuid4().hex[:12]
    created_at = datetime.now(timezone.utc).isoformat()

    conn = _get_db()
    conn.execute(
        "INSERT INTO overlays (id, name, type, source_type, file_path, tile_url, attribution, color, opacity, bounds, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (overlay_id, name, "url", "url", None, tile_url, attribution, color, opacity, None, created_at),
    )
    conn.commit()
    conn.close()

    return {
        "id": overlay_id,
        "name": name,
        "type": "url",
        "source_type": "url",
        "tile_url": tile_url,
        "attribution": attribution,
        "color": color,
        "opacity": opacity,
        "bounds": None,
        "created_at": created_at,
    }


def delete_overlay(overlay_id: str) -> bool:
    overlay = get_overlay(overlay_id)
    if not overlay:
        return False

    conn = _get_db()
    cursor = conn.execute("DELETE FROM overlays WHERE id = ?", (overlay_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0
