from datetime import timedelta

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from minio import Minio
from minio.error import S3Error
from utils.auth import get_current_user

router = APIRouter(prefix="/vessel-images", tags=["vessel-images"])

# 🔹 MinIO Configuration
MINIO_ENDPOINT = "34.14.212.228:9100"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin123"
BUCKET_NAME = "vessel-images"

# 🔹 MinIO Client
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=ACCESS_KEY,
    secret_key=SECRET_KEY,
    secure=False  # because http
)


# ✅ Ensure bucket exists
def ensure_bucket():
    found = minio_client.bucket_exists(BUCKET_NAME)
    if not found:
        minio_client.make_bucket(BUCKET_NAME)


# ✅ 1. GET → List all vessel images
@router.get("/")
async def get_all_vessel_images(
    current_user: dict = Depends(get_current_user)
):
    try:
        ensure_bucket()

        objects = minio_client.list_objects(BUCKET_NAME)

        data = []
        # vessel_images.py - Inside get_all_vessel_images
        for obj in objects:
            file_name = obj.object_name
            imo = file_name.split(".")[0]

            # Generate a temporary URL that allows the browser to view the private file
            image_url = minio_client.get_presigned_url(
                "GET",
                BUCKET_NAME,
                file_name,
                expires=timedelta(hours=1),
            )

            data.append({
                "imo": imo,
                "image_url": image_url
            })

        return {"vessels": data}

    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ 2. POST → Upload / Update (same endpoint)
@router.post("/")
async def upload_vessel_image(
    imo: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        ensure_bucket()

        file_name = f"{imo}.jpg"

        # Upload (auto replace if exists)
        minio_client.put_object(
            BUCKET_NAME,
            file_name,
            file.file,
            length=-1,
            part_size=10 * 1024 * 1024,
            content_type=file.content_type
        )

        return {
            "message": "Image uploaded successfully",
            "imo": imo
        }

    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ 3. DELETE → Remove image
@router.delete("/{imo}")
async def delete_vessel_image(
    imo: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        ensure_bucket()

        file_name = f"{imo}.jpg"

        minio_client.remove_object(BUCKET_NAME, file_name)

        return {
            "message": "Image deleted successfully",
            "imo": imo
        }

    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{imo}")
async def get_vessel_image(imo: str):
    try:
        for ext in ["png", "jpg"]:
            file_name = f"{imo}.{ext}"

            try:
                minio_client.stat_object(BUCKET_NAME, file_name)

                url = minio_client.get_presigned_url(
                    "GET",
                    BUCKET_NAME,
                    file_name,
                    expires=timedelta(hours=1),
                )
                return {"image_url": url}

            except S3Error:
                continue

        raise HTTPException(status_code=404, detail="Image not found")

    except S3Error as e:
        raise HTTPException(status_code=500, detail=str(e))