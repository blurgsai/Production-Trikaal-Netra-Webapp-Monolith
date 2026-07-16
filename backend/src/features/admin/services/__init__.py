import io
from datetime import datetime

from bson import ObjectId


def _normalize_imo(value) -> str:
    return "" if value is None else str(value)


async def list_database_uploads(
    db,
    database_name: str | None = None,
    search: str | None = None,
    page: int = 0,
    page_size: int = 25,
) -> dict:
    query: dict = {}
    if database_name:
        query["database_name"] = database_name
    if search:
        query["$or"] = [
            {"database_name": {"$regex": search, "$options": "i"}},
            {"mmsi": {"$regex": search, "$options": "i"}},
        ]

    total = await db.vessel_data_uploads.count_documents(query)
    cursor = (
        db.vessel_data_uploads.find(query)
        .sort("created_at", -1)
        .skip(page * page_size)
        .limit(page_size)
    )
    uploads = []
    async for upload in cursor:
        uploads.append({
            "_id": str(upload["_id"]),
            "database_name": upload.get("database_name", ""),
            "mmsi": upload.get("mmsi", ""),
            "data": upload.get("data", {}),
            "created_at": upload.get("created_at", datetime.utcnow()).isoformat(),
            "updated_at": upload.get("updated_at", datetime.utcnow()).isoformat(),
        })
    return {"items": uploads, "total": total}


async def get_database_upload(db, upload_id: str) -> dict | None:
    if not ObjectId.is_valid(upload_id):
        return None

    upload = await db.vessel_data_uploads.find_one({"_id": ObjectId(upload_id)})
    if not upload:
        return None

    return {
        "_id": str(upload["_id"]),
        "database_name": upload.get("database_name", ""),
        "mmsi": upload.get("mmsi", ""),
        "data": upload.get("data", {}),
        "created_at": upload.get("created_at", datetime.utcnow()).isoformat(),
        "updated_at": upload.get("updated_at", datetime.utcnow()).isoformat(),
    }


async def create_database_upload(db, database_name: str, mmsi: str, data: dict) -> dict:
    now = datetime.utcnow()
    upload_doc = {
        "database_name": database_name,
        "mmsi": mmsi,
        "data": data,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.vessel_data_uploads.insert_one(upload_doc)
    return {
        "_id": str(result.inserted_id),
        "database_name": database_name,
        "mmsi": mmsi,
        "data": data,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


async def update_database_upload(db, upload_id: str, updates: dict) -> dict | None:
    if not ObjectId.is_valid(upload_id):
        return None

    set_values: dict = {"updated_at": datetime.utcnow()}
    if "database_name" in updates and updates["database_name"] is not None:
        set_values["database_name"] = updates["database_name"]
    if "mmsi" in updates and updates["mmsi"] is not None:
        set_values["mmsi"] = updates["mmsi"]
    if "data" in updates and updates["data"] is not None:
        set_values["data"] = updates["data"]

    result = await db.vessel_data_uploads.update_one(
        {"_id": ObjectId(upload_id)}, {"$set": set_values}
    )
    if result.matched_count == 0:
        return None

    return await get_database_upload(db, upload_id)


async def delete_database_upload(db, upload_id: str) -> bool:
    if not ObjectId.is_valid(upload_id):
        return False
    result = await db.vessel_data_uploads.delete_one({"_id": ObjectId(upload_id)})
    return result.deleted_count > 0


async def bulk_delete_database_uploads(db, upload_ids: list[str]) -> int:
    object_ids = [ObjectId(uid) for uid in upload_ids if ObjectId.is_valid(uid)]
    if not object_ids:
        return 0
    result = await db.vessel_data_uploads.delete_many({"_id": {"$in": object_ids}})
    return result.deleted_count


async def get_database_names(db) -> list[str]:
    cursor = db.vessel_data_uploads.aggregate([
        {"$group": {"_id": "$database_name"}},
        {"$sort": {"_id": 1}}
    ])
    names = []
    async for doc in cursor:
        names.append(doc["_id"])
    return names


async def get_vessel_image_types(gridfs) -> list[str]:
    types: set[str] = set()
    async for gridfs_file in gridfs.find({}):
        metadata = gridfs_file.metadata or {}
        content_type = metadata.get("content_type", "")
        if content_type:
            types.add(content_type)
    return sorted(types)


async def list_vessel_images(
    gridfs,
    search: str | None = None,
    mime_type: str | None = None,
    page: int = 0,
    page_size: int = 25,
) -> dict:
    query: dict = {}
    if search:
        query["$or"] = [
            {"metadata.imo": {"$regex": search, "$options": "i"}},
            {"filename": {"$regex": search, "$options": "i"}},
        ]
    if mime_type:
        if mime_type == "image/jpeg":
            query["metadata.content_type"] = {"$in": ["image/jpeg", "image/jpg"]}
        else:
            query["metadata.content_type"] = mime_type

    # Count total matching files
    total = 0
    async for _ in gridfs.find(query):
        total += 1

    # Fetch paginated results
    cursor = gridfs.find(query).sort("uploadDate", -1).skip(page * page_size).limit(page_size)
    images = []
    async for gridfs_file in cursor:
        metadata = gridfs_file.metadata or {}
        images.append({
            "_id": str(gridfs_file._id),
            "imo": _normalize_imo(metadata.get("imo")),
            "file_name": gridfs_file.filename,
            "file_size": gridfs_file.length,
            "mime_type": metadata.get("content_type", "application/octet-stream"),
            "uploaded_at": gridfs_file.upload_date.isoformat() if gridfs_file.upload_date else datetime.utcnow().isoformat(),
            "updated_at": gridfs_file.upload_date.isoformat() if gridfs_file.upload_date else datetime.utcnow().isoformat(),
        })
    return {"items": images, "total": total}


async def get_vessel_image(gridfs, image_id: str) -> dict | None:
    if not ObjectId.is_valid(image_id):
        return None

    try:
        gridfs_file = None
        async for f in gridfs.find({"_id": ObjectId(image_id)}):
            gridfs_file = f
            break

        if not gridfs_file:
            return None

        metadata = gridfs_file.metadata or {}
        return {
            "_id": str(gridfs_file._id),
            "imo": _normalize_imo(metadata.get("imo")),
            "file_name": gridfs_file.filename,
            "file_size": gridfs_file.length,
            "mime_type": metadata.get("content_type", "application/octet-stream"),
            "uploaded_at": gridfs_file.upload_date.isoformat() if gridfs_file.upload_date else datetime.utcnow().isoformat(),
            "updated_at": gridfs_file.upload_date.isoformat() if gridfs_file.upload_date else datetime.utcnow().isoformat(),
        }
    except Exception:
        return None


async def create_vessel_image(gridfs, imo: str, file_name: str, file_size: int, mime_type: str) -> dict:
    # Upload file to GridFS with metadata
    gridfs_id = await gridfs.upload_from_stream(
        file_name,
        io.BytesIO(b""),  # Placeholder, actual content is uploaded in router
        metadata={
            "imo": imo,
            "content_type": mime_type,
        },
    )
    return {
        "_id": str(gridfs_id),
        "imo": imo,
        "file_name": file_name,
        "file_size": file_size,
        "mime_type": mime_type,
        "uploaded_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


async def update_vessel_image(gridfs, image_id: str, imo: str) -> dict | None:
    if not ObjectId.is_valid(image_id):
        return None

    try:
        # Find the GridFS file using cursor (find_one doesn't exist on GridFSBucket)
        gridfs_file = None
        async for f in gridfs.find({"_id": ObjectId(image_id)}):
            gridfs_file = f
            break

        if not gridfs_file:
            return None

        # Update metadata by replacing the file with updated metadata
        metadata = gridfs_file.metadata or {}
        metadata["imo"] = imo

        # Read the file content
        stream = await gridfs.open_download_stream(gridfs_file._id)
        file_data = await stream.read()

        # Delete the old file
        await gridfs.delete(gridfs_file._id)

        # Re-upload with updated metadata
        new_id = await gridfs.upload_from_stream(
            gridfs_file.filename,
            io.BytesIO(file_data),
            metadata=metadata,
        )

        return await get_vessel_image(gridfs, str(new_id))
    except Exception as e:
        print(f"Error updating vessel image {image_id}: {e}")
        return None


async def delete_vessel_image(gridfs, image_id: str) -> bool:
    if not ObjectId.is_valid(image_id):
        return False

    try:
        # Delete directly from GridFS
        await gridfs.delete(ObjectId(image_id))
        return True
    except Exception:
        return False


async def bulk_delete_vessel_images(gridfs, image_ids: list[str]) -> int:
    deleted = 0
    for image_id in image_ids:
        if ObjectId.is_valid(image_id):
            try:
                await gridfs.delete(ObjectId(image_id))
                deleted += 1
            except Exception:
                pass
    return deleted


async def get_vessel_image_url(gridfs, image_id: str) -> str | None:
    if not ObjectId.is_valid(image_id):
        return None

    try:
        gridfs_file = None
        async for f in gridfs.find({"_id": ObjectId(image_id)}):
            gridfs_file = f
            break

        if not gridfs_file:
            return None

        return f"/admin/data-management/vessel-images/{image_id}/file"
    except Exception:
        return None
