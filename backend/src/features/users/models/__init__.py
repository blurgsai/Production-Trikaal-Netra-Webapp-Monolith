from pydantic import BaseModel, Field


class LoginResponse(BaseModel):
    token: str
    role: str
    user_id: str
    username: str


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: str = Field(default="operator", pattern="^(admin|supervisor|operator)$")


class UserUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=6)
    role: str | None = Field(default=None, pattern="^(admin|supervisor|operator)$")


class UserResponse(BaseModel):
    id: str
    username: str
    role: str


class MapConfigPayload(BaseModel):
    selected_base_map_id: str | None = None
    active_layer_ids: list[str] | None = None
    layer_order: list[str] | None = None
    vessel_config: dict | None = None
    map_control_settings: dict | None = None
