from fastapi import APIRouter, HTTPException, status, Depends, Request, Body, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from typing import List, Dict
from datetime import datetime
import os
import io
import uuid
import bcrypt
from bson import ObjectId
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from minio import Minio
from db import db
from utils.security import verify_password, create_access_token
from utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


# check if token is valid
@router.get("/auth")
async def me(current_user: dict = Depends(get_current_user)): 
    return {"success": True}

@router.get("/check-admin")
async def check_admin_role(current_user: dict = Depends(get_current_user)):
    """
    Check if current user has admin role
    """
    user_role = current_user.get("role")
    is_admin = user_role == "admin"
    
    return {
        "is_admin": is_admin,
        "role": user_role
    }

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Get current user profile including watchkeeper information
    """
    user_id = current_user["_id"]
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])
    
    return user

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    existing_user = await db.users.find_one({"username": form_data.username})
    if not existing_user or not verify_password(form_data.password, existing_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    username = existing_user.get("username")
    role = existing_user.get("role")
    user_id = str(existing_user.get("_id"))

    payload = {
        "sub": form_data.username,
        "role": role
    }

    token = create_access_token(payload)
    
    return {"token": token, "token_type": "bearer","username":username,  "role": role, "user_id": user_id}

@router.post("/config")
async def save_user_config(
    config: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Save user-specific configuration.
    """

    user_id = ObjectId(current_user["_id"])

    if not config or not isinstance(config, dict):
        raise HTTPException(status_code=400, detail="Invalid configuration payload")

    result = await db.users_config.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "surveillance_map.vessel_config": config
            }
        },
        upsert=True
    )
    
    if result.matched_count == 1:
        return {
            "success": True,
            "msg": "Configuration updated successfully"
        }

    return {
        "success": True,
        "msg": "Configuration created successfully"
    }

@router.get("/config")
async def get_user_config(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]

    # fetch config document (may not exist yet)
    user_config_doc = await db.users_config.find_one(
        {"user_id": ObjectId(user_id)},
        {"surveillance_map.vessel_config": 1, "_id": 0}
    )

    # If no document exists yet
    if not user_config_doc:
        return {
            "vessel_config": None,
            "message": "No custom configuration found"
        }

    vessel_config = (
        user_config_doc
        .get("surveillance_map", {})
        .get("vessel_config")
    )

    # If document exists but config not set
    if vessel_config is None:
        return {
            "vessel_config": None,
            "message": "Vessel configuration is not set for the user"
        }

    return {
        "vessel_config": vessel_config
    }
    

# LIST USERS - SHARE TRAJECTORY or EVENTs FOR MOBLILE APP
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL_USERS = "mongodb://admin:admin123@35.244.9.240:27017/"

users_client = AsyncIOMotorClient(MONGO_URL_USERS)
users_db = users_client["trikaalx_flutter"]
users_collection = users_db["users"]

@router.get("/list", response_model=list[dict])
async def list_users():
    """
    List users from external MongoDB
    Returns only _id and username
    """
    users = []

    cursor = users_collection.find({}, {"username": 1})
    async for user in cursor:
        users.append({
            "_id": str(user["_id"]),
            "username": user.get("username")
        })

    return users


# =======================
# USER ACCOUNT ACTIVATION 
# =======================

# USER ACTIVATION TOKEN
SECRET_KEY = os.getenv("USER_ACTIVATION_TOKEN_SECRET", "secret-key")
ACTIVATION_SALT = os.getenv("USER_ACTIVATION_SALT", "activate-account")
serializer = URLSafeTimedSerializer(SECRET_KEY)

# MINIO SETUP
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://34.14.212.228:9100")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin123")

endpoint = MINIO_ENDPOINT.replace("http://", "").replace("https://", "")

minio_client = Minio(
    endpoint,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

BUCKET_NAME = "user-biometric-images"

# Ensure bucket exists
if not minio_client.bucket_exists(BUCKET_NAME):
    minio_client.make_bucket(BUCKET_NAME)


@router.post("/activate")
async def activate_user(
    activation_token: str = Form(...),
    images: List[UploadFile] = File(...)
):
    try:        
        # Token Validation
        try:
            data = serializer.loads(
                activation_token,
                salt=ACTIVATION_SALT,
                max_age=3600
            )
        except SignatureExpired:
            raise HTTPException(
                status_code=400,
                detail="Activation link expired"
            )
        except BadSignature:
            raise HTTPException(
                status_code=400,
                detail="Invalid activation token"
            )

        user_id = data.get("user_id")
        if not user_id:
            raise HTTPException(400, "Invalid token payload")
     
        # User Validation
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(404, "User not found")

        if user.get("active"):
            raise HTTPException(400, "User already activated")
        
        # Image Validation        
        if not images or len(images) == 0:
            raise HTTPException(400, "No images provided")

        if len(images) < 5:
            raise HTTPException(400, "Minimum 5 images required")

        if len(images) > 15:
            raise HTTPException(400, "Maximum 15 images allowed")
        
        # Upload images         
        uploaded_files = []

        for img in images:
            if not img.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail=f"{img.filename} is not a valid image"
                )

            try:
                file_ext = img.filename.split(".")[-1]
                object_name = f"{user_id}/{uuid.uuid4()}.{file_ext}"

                file_data = await img.read()

                minio_client.put_object(
                    BUCKET_NAME,
                    object_name,
                    data=io.BytesIO(file_data),
                    length=len(file_data),
                    content_type=img.content_type
                )

                uploaded_files.append(object_name)

            except Exception as upload_err:
                # STOP immediately if any upload fails
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload {img.filename}"
                )
        
        # Activate user (After successful uploads)
        try:
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$set": {
                        "active": True,
                        "activated_at": datetime.utcnow(),                        
                    }
                }
            )
        except Exception:
            # Optional: rollback uploaded files
            for obj in uploaded_files:
                try:
                    minio_client.remove_object(BUCKET_NAME, obj)
                except:
                    pass

            raise HTTPException(
                status_code=500,
                detail="Failed to activate user after upload"
            )

        return {
            "message": "Account activated successfully",
            "images_uploaded": len(uploaded_files)
        }

    except HTTPException as e:
        # pass through clean errors
        raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Unexpected server error"
        )