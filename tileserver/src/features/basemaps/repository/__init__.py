import sqlite3
import uuid
from datetime import datetime, timezone

from src.shared.config import METADATA_DB_PATH


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(METADATA_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS basemaps (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            type         TEXT NOT NULL,
            source_type  TEXT NOT NULL DEFAULT 'mbtiles',
            file_path    TEXT,
            tile_url     TEXT NOT NULL,
            attribution  TEXT DEFAULT '',
            created_at   TEXT NOT NULL
        )
        """
    )

    columns = {row[1] for row in conn.execute("PRAGMA table_info(basemaps)").fetchall()}
    if "source_type" not in columns:
        conn.execute("ALTER TABLE basemaps ADD COLUMN source_type TEXT NOT NULL DEFAULT 'mbtiles'")

    conn.commit()
    conn.close()


def list_basemaps() -> list[dict]:
    conn = _get_db()
    rows = conn.execute(
        "SELECT id, name, type, source_type, tile_url, attribution, created_at FROM basemaps ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_basemap(basemap_id: str) -> dict | None:
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM basemaps WHERE id = ?", (basemap_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def insert_file_basemap(name: str, source_type: str, file_path: str, attribution: str = "") -> dict:
    basemap_id = uuid.uuid4().hex[:12]
    tile_url = f"/tiles/{basemap_id}/{{z}}/{{x}}/{{y}}.png"
    created_at = datetime.now(timezone.utc).isoformat()

    conn = _get_db()
    conn.execute(
        "INSERT INTO basemaps (id, name, type, source_type, file_path, tile_url, attribution, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (basemap_id, name, "file", source_type, file_path, tile_url, attribution, created_at),
    )
    conn.commit()
    conn.close()

    return {
        "id": basemap_id,
        "name": name,
        "type": "file",
        "source_type": source_type,
        "file_path": file_path,
        "tile_url": tile_url,
        "attribution": attribution,
        "created_at": created_at,
    }


def insert_url_basemap(name: str, tile_url: str, attribution: str) -> dict:
    basemap_id = uuid.uuid4().hex[:12]
    created_at = datetime.now(timezone.utc).isoformat()

    conn = _get_db()
    conn.execute(
        "INSERT INTO basemaps (id, name, type, source_type, file_path, tile_url, attribution, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (basemap_id, name, "url", "url", None, tile_url, attribution, created_at),
    )
    conn.commit()
    conn.close()

    return {
        "id": basemap_id,
        "name": name,
        "type": "url",
        "source_type": "url",
        "tile_url": tile_url,
        "attribution": attribution,
        "created_at": created_at,
    }


def delete_basemap(basemap_id: str) -> bool:
    basemap = get_basemap(basemap_id)
    if not basemap:
        return False

    conn = _get_db()
    cursor = conn.execute("DELETE FROM basemaps WHERE id = ?", (basemap_id,))
    conn.commit()
    conn.close()
    return cursor.rowcount > 0
