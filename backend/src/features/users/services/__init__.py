from src.shared.errors import AuthenticationError
from src.shared.security import create_access_token, verify_password


async def authenticate_user(db, username: str, password: str) -> dict:
    user = await db.users.find_one({"username": username})
    if not user:
        raise AuthenticationError()

    if not verify_password(password, user["password"]):
        raise AuthenticationError()

    token = create_access_token(
        {"sub": user["username"], "role": user.get("role", "user")}
    )

    return {
        "token": token,
        "role": user.get("role", "user"),
        "user_id": str(user.get("_id", "")),
        "username": user["username"],
    }
