from pydantic import BaseModel
from typing import Dict, Optional, Any

class PlaybackQuery(BaseModel):
    start_time: str
    end_time: str
    geometry: Dict[str, Any]
    filters: Optional[Dict[str, Any]] = {}

class MinutePlaybackQuery(BaseModel):
    base_time: str  # Base time for the playback session
    minute_offset: int  # Minute offset from base_time (0, 1, 2, etc.)
    geometry: Dict[str, Any]
    filters: Optional[Dict[str, Any]] = {} 