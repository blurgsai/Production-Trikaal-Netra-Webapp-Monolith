from pydantic import BaseModel


class OverlayResponse(BaseModel):
    id: str
    name: str
    type: str
    source_type: str
    tile_url: str
    attribution: str
    color: str
    opacity: float
    bounds: list[float] | None = None
    max_zoom: int | None = None
    created_at: str


class UrlOverlayRequest(BaseModel):
    name: str
    tile_url: str
    overlay_type: str = "tile"
    attribution: str = ""
    color: str = "#3388ff"
    opacity: float = 1.0


class DensityUploadOptions(BaseModel):
    weight_col: str = "unique_mmsi_count"
    max_zoom: int = 18
    color_ramp: str = "heat"
