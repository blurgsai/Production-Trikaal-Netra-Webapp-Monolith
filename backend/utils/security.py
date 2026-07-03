import bcrypt
from datetime import datetime, timedelta
import jwt
from config import settings


def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')  # encode to bytes
    salt = bcrypt.gensalt()                     # generate salt
    hashed = bcrypt.hashpw(password_bytes, salt)  # hash password with salt
    return hashed.decode('utf-8')               # decode to string for storage


def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_bytes, hashed_bytes)  # verify password matches hash
    

def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=240)) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception:
        return {}
