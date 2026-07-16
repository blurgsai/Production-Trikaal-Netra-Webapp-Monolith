from typing import Any

from pydantic import BaseModel, Field


class DatabaseUploadCreateRequest(BaseModel):
    database_name: str = Field(..., min_length=1, max_length=100)
    mmsi: str = Field(..., min_length=1, max_length=50)
    data: Any = Field(default_factory=dict)


class DatabaseUploadUpdateRequest(BaseModel):
    database_name: str | None = Field(default=None, min_length=1, max_length=100)
    mmsi: str | None = Field(default=None, min_length=1, max_length=50)
    data: Any = Field(default=None)


class DatabaseUploadResponse(BaseModel):
    id: str = Field(alias="_id")
    database_name: str
    mmsi: str
    data: Any
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True


class PaginatedDatabaseUploadResponse(BaseModel):
    items: list[DatabaseUploadResponse]
    total: int


class VesselImageCreateRequest(BaseModel):
    imo: str = Field(..., min_length=1, max_length=50)
    file: str  # This will be handled as multipart form data in the router


class VesselImageUpdateRequest(BaseModel):
    imo: str = Field(..., min_length=1, max_length=50)


class VesselImageResponse(BaseModel):
    id: str = Field(alias="_id")
    imo: str
    file_name: str
    file_size: int
    mime_type: str
    uploaded_at: str
    updated_at: str

    class Config:
        populate_by_name = True


class PaginatedVesselImageResponse(BaseModel):
    items: list[VesselImageResponse]
    total: int
