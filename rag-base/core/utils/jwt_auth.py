"""JWT Authentication utilities"""
import jwt
import os
from typing import Optional
from fastapi import HTTPException, status, Header
from dotenv import load_dotenv
from core.utils.logger import Logger

load_dotenv()

logger = Logger("jwt-auth").get_logger()

JWT_SECRET = os.getenv("JWT_SECRET", "jwt-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


def decode_token(token: str) -> dict:
    """Decode and verify JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload containing 'sub' (username) and 'role'
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        logger.debug(f"Token decoded successfully for user: {payload.get('sub')}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency to get current user from JWT token
    
    Args:
        authorization: Authorization header with Bearer token
        
    Returns:
        Dict with 'username' and 'role' from token payload
        
    Raises:
        HTTPException: If authorization header is missing or token is invalid
    """
    if not authorization:
        logger.warning("Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.warning(f"Invalid Authorization header format: {authorization}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    payload = decode_token(token)
    
    username = payload.get("sub")
    role = payload.get("role")
    
    if not username:
        logger.warning("Token missing 'sub' field")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Authenticated user: {username} (role: {role})")
    return {
        "username": username,
        "role": role
    }
