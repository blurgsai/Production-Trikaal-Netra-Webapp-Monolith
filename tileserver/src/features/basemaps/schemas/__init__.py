from pydantic import BaseModel


class BaseMapResponse(BaseModel):
    id: str
    name: str
    type: str
    source_type: str
    tile_url: str
    attribution: str
    created_at: str


class UrlTileRequest(BaseModel):
    name: str
    tile_url: str
    attribution: str = ""
