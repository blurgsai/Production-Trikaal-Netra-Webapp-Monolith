from __future__ import annotations

from src.features.vessel_flags.clients import (
    delete_flag_by_id,
    fetch_flags_by_vessel,
    insert_flag,
)
from src.features.vessel_flags.models import VALID_FLAGS, map_flag_from_doc


async def create_flag(db, vessel_id: str, user_id: str, flag: str, comment: str) -> dict:
    normalized = flag.lower().strip()
    if normalized not in VALID_FLAGS:
        raise ValueError(f"Invalid flag '{flag}'. Must be one of: {', '.join(VALID_FLAGS)}")
    doc = await insert_flag(db, vessel_id, user_id, normalized, comment.strip())
    return map_flag_from_doc(doc)


async def list_flags(db, vessel_id: str) -> list[dict]:
    docs = await fetch_flags_by_vessel(db, vessel_id)
    return [map_flag_from_doc(doc) for doc in docs]


async def remove_flag(db, flag_id: str) -> bool:
    return await delete_flag_by_id(db, flag_id)
