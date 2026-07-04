from pydantic import BaseModel


class LoginResponse(BaseModel):
    token: str
    role: str
    user_id: str
    username: str
