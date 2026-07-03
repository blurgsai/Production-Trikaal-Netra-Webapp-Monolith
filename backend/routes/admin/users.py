from fastapi import APIRouter, HTTPException, status, Depends, Query
from db import db
from utils.auth import get_current_user
from typing import List, Dict, Optional
from bson import ObjectId
from math import ceil
from itsdangerous import URLSafeTimedSerializer
import os
from datetime import datetime
from utils.security import hash_password

router = APIRouter(prefix="/users", tags=["admin"])


SECRET_KEY = os.getenv("USER_ACTIVATION_TOKEN_SECRET", "secret-key")
ACTIVATION_SALT = os.getenv("USER_ACTIVATION_SALT", "activate-account")
serializer = URLSafeTimedSerializer(SECRET_KEY)

def check_admin_role(current_user: dict = Depends(get_current_user)):
    """
    Dependency to check if current user has admin role
    """
    user_role = current_user.get("role")
    if user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin role required."
        )
    return current_user

@router.get("")
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(check_admin_role)
):
    """
    List all users except the current user with pagination
    Only accessible by users with admin role
    """
    try:
        current_user_id = current_user["_id"]
        
        # Calculate skip value for pagination
        skip = (page - 1) * limit
        
        # Get total count (excluding current user)
        total_count = await db.users.count_documents({
            "_id": {"$ne": ObjectId(current_user_id)}
        })
        
        # Calculate total pages
        total_pages = ceil(total_count / limit)
        
        # Get users with pagination (excluding current user)
        cursor = db.users.find(
            {"_id": {"$ne": ObjectId(current_user_id)}},
            {"password": 0}  # Exclude password field
        ).skip(skip).limit(limit)
        
        users = []
        async for user in cursor:
            # Convert ObjectId to string for JSON serialization
            user_dict = dict(user)
            user_dict["_id"] = str(user_dict["_id"])
            
            # Convert any nested ObjectIds if they exist
            if "watchkeeper" in user_dict and user_dict["watchkeeper"]:
                if isinstance(user_dict["watchkeeper"], dict):
                    for key, value in user_dict["watchkeeper"].items():
                        if isinstance(value, ObjectId):
                            user_dict["watchkeeper"][key] = str(value)
            
            users.append(user_dict)
        
        return {
            "users": users,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_count": total_count,
                "limit": limit,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.get("/{user_id}")
async def get_user(
    user_id: str,
    current_user: dict = Depends(check_admin_role)
):
    """
    Get specific user details by ID
    Only accessible by users with admin role
    """
    try:
        user = await db.users.find_one(
            {"_id": ObjectId(user_id)},
            {"password": 0}  # Exclude password field
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Convert ObjectId to string for JSON serialization
        user_dict = dict(user)
        user_dict["_id"] = str(user_dict["_id"])
        
        # Convert any nested ObjectIds if they exist
        if "watchkeeper" in user_dict and user_dict["watchkeeper"]:
            if isinstance(user_dict["watchkeeper"], dict):
                for key, value in user_dict["watchkeeper"].items():
                    if isinstance(value, ObjectId):
                        user_dict["watchkeeper"][key] = str(value)
        
        return user_dict
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}"
        )

@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_data: dict,
    current_user: dict = Depends(check_admin_role)
):
    """
    Update user role
    Only accessible by users with admin role
    """
    try:
        new_role = role_data.get("role")
        if not new_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role is required"
            )
        
        # Prevent admin from changing their own role
        if user_id == current_user["_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own role"
            )
        
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"role": new_role}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"message": "User role updated successfully"}
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )

@router.post("")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(check_admin_role)
):
    """
    Create a new user (inactive by default)
    Returns activation URL (valid for 1 hour)
    """
    try:
        username = user_data.get("username")
        email = user_data.get("email")
        password = user_data.get("password")
        role = user_data.get("role", "operator")

        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password are required"
            )

        # Check username uniqueness
        existing_user = await db.users.find_one({"username": username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

        # check email uniqueness
        if email:
            existing_email = await db.users.find_one({"email": email})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )

        # Hash password using your existing method
        hashed_password = hash_password(password)

        # Create user
        new_user = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "role": role,
            "active": False,
            "created_at": datetime.utcnow()
        }

        result = await db.users.insert_one(new_user)
        user_id = str(result.inserted_id)

        # Generate activation token
        token = serializer.dumps(
            {"user_id": user_id},
            salt=ACTIVATION_SALT
        )

        # Activation URL
        activation_url = f"http://localhost:5173/activate-account/{token}"

        return {
            "message": "User created successfully. Activation required.",
            "activation_url": activation_url
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )