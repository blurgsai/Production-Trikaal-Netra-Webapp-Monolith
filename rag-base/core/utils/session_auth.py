from __future__ import annotations

"""Session authorization utilities"""
from bson import ObjectId
from fastapi import HTTPException, status
from typing import TYPE_CHECKING
from core.utils.logger import Logger

if TYPE_CHECKING:
    from core.clients.chat_db_client import ChatMongoClient

logger = Logger("session-auth").get_logger()


async def verify_user_owns_session(
    session_id: str,
    username: str,
    db_client: ChatMongoClient
) -> bool:
    """Verify that the authenticated user owns the session
    
    Args:
        session_id: Session ID to verify
        username: Username from JWT token
        db_client: MongoDB client instance
        
    Returns:
        True if user owns the session
        
    Raises:
        HTTPException: If session not found or user doesn't own it
    """
    try:
        # Convert session_id to ObjectId
        session_oid = ObjectId(session_id)
    except Exception as e:
        logger.warning(f"Invalid session_id format: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid session ID format: {session_id}"
        )
    
    # Get session from database
    session = db_client.sessions_collection.find_one({"_id": session_oid})
    
    if not session:
        logger.warning(f"Session not found: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}"
        )
    
    # Get user_id from session
    session_user_id = session.get("user_id")
    
    # Look up user by username from JWT token
    user = db_client.db.users.find_one({"username": username})
    
    if not user:
        logger.warning(f"User not found for username: {username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found"
        )
    
    user_id = user["_id"]
    
    # Compare user_id from session with authenticated user's ID
    if session_user_id != user_id:
        logger.warning(
            f"User {username} (ID: {user_id}) attempted to access session {session_id} "
            f"owned by user ID: {session_user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this session"
        )
    
    logger.info(f"User {username} authorized for session {session_id}")
    return True
