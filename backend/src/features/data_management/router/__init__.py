import zipfile
import io
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Form, HTTPException, Query, status, UploadFile, File
from fastapi.responses import Response

from src.features.data_management.models import (
    DatabaseUploadCreateRequest,
    DatabaseUploadResponse,
    DatabaseUploadUpdateRequest,
    PaginatedDatabaseUploadResponse,
    PaginatedVesselImageResponse,
    VesselImageResponse,
    VesselImageUpdateRequest,
)
from src.features.data_management.services import (
    bulk_delete_database_uploads,
    bulk_delete_vessel_images,
    create_database_upload,
    delete_database_upload,
    delete_vessel_image,
    get_database_names,
    get_database_upload,
    get_vessel_image,
    get_vessel_image_types,
    get_vessel_image_url,
    list_database_uploads,
    list_vessel_images,
    update_database_upload,
    update_vessel_image,
)
from src.shared.auth import check_admin_role
from src.shared.dependencies import get_db, get_gridfs

router = APIRouter(prefix="/admin/data-management", tags=["Data Management"])


# Database Uploads Endpoints
@router.get("/database-uploads", response_model=PaginatedDatabaseUploadResponse)
async def admin_list_database_uploads(
    database_name: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    page_size: int = Query(25, ge=1, le=100),
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    return await list_database_uploads(db, database_name=database_name, search=search, page=page, page_size=page_size)


@router.get("/database-uploads/{upload_id}", response_model=DatabaseUploadResponse)
async def admin_get_database_upload(
    upload_id: str,
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    upload = await get_database_upload(db, upload_id)
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database upload not found",
        )
    return upload


@router.post("/database-uploads", response_model=list[DatabaseUploadResponse], status_code=status.HTTP_201_CREATED)
async def admin_create_database_upload(
    database_name: str = Form(...),
    mmsi_field: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    # Read and parse CSV file
    content = await file.read()
    text = content.decode("utf-8")
    lines = text.split("\n")

    # Parse CSV
    if len(lines) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must have at least a header row and one data row",
        )

    # Preserve original case for headers
    headers = [h.strip() for h in lines[0].split(",")]
    rows = []

    for i in range(1, len(lines)):
        line = lines[i].strip()
        if not line:
            continue
        values = [v.strip() for v in line.split(",")]
        row = {}
        for j, header in enumerate(headers):
            row[header] = values[j] if j < len(values) else ""
        rows.append(row)

    # Create one document per row
    results = []
    for row in rows:
        mmsi_value = row.get(mmsi_field, "")
        result = await create_database_upload(
            db,
            database_name,
            mmsi_value,
            row,
        )
        results.append(result)

    return results


@router.patch("/database-uploads/{upload_id}", response_model=DatabaseUploadResponse)
async def admin_update_database_upload(
    upload_id: str,
    request: DatabaseUploadUpdateRequest,
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    upload = await update_database_upload(db, upload_id, request.model_dump(exclude_none=True))
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database upload not found",
        )
    return upload


@router.delete("/database-uploads/{upload_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_database_upload(
    upload_id: str,
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    deleted = await delete_database_upload(db, upload_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database upload not found",
        )
    return None


@router.post("/database-uploads/bulk-delete")
async def admin_bulk_delete_database_uploads(
    ids: list[str],
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    deleted = await bulk_delete_database_uploads(db, ids)
    return {"deleted": deleted}


@router.get("/database-names")
async def admin_get_database_names(
    db=Depends(get_db),
    _=Depends(check_admin_role),
):
    return await get_database_names(db)


# Vessel Images Endpoints
@router.get("/vessel-images", response_model=PaginatedVesselImageResponse)
async def admin_list_vessel_images(
    search: Optional[str] = Query(None),
    mime_type: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    page_size: int = Query(25, ge=1, le=100),
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    return await list_vessel_images(gridfs, search=search, mime_type=mime_type, page=page, page_size=page_size)


@router.get("/vessel-image-types")
async def admin_get_vessel_image_types(
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    return await get_vessel_image_types(gridfs)


@router.get("/vessel-images/{image_id}", response_model=VesselImageResponse)
async def admin_get_vessel_image(
    image_id: str,
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    image = await get_vessel_image(gridfs, image_id)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found",
        )
    return image


MAX_IMAGES = 50
MAX_ZIP_SIZE = 50 * 1024 * 1024  # 50 MB

IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')


def _mime_from_filename(name: str) -> str:
    lower = name.lower()
    if lower.endswith(('.jpg', '.jpeg')):
        return "image/jpeg"
    if lower.endswith('.png'):
        return "image/png"
    if lower.endswith('.gif'):
        return "image/gif"
    if lower.endswith('.webp'):
        return "image/webp"
    return "application/octet-stream"


@router.post("/vessel-images", response_model=list[VesselImageResponse], status_code=status.HTTP_201_CREATED)
async def admin_create_vessel_image(
    imos: str = Form(""),
    files: list[UploadFile] = File(...),
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    # Parse comma-separated IMO values (one per image file, in order)
    imo_list = [v.strip() for v in imos.split(",") if v.strip()] if imos else []

    results: list[dict] = []
    now_iso = datetime.utcnow().isoformat()

    for idx, upload_file in enumerate(files):
        content = await upload_file.read()
        filename = upload_file.filename or "unknown"

        # --- ZIP handling ---
        if filename.lower().endswith('.zip'):
            if len(content) > MAX_ZIP_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"ZIP file exceeds the {MAX_ZIP_SIZE // (1024 * 1024)} MB limit",
                )
            try:
                with zipfile.ZipFile(io.BytesIO(content), 'r') as zip_ref:
                    entries = [
                        fi for fi in zip_ref.infolist()
                        if not fi.is_dir()
                        and not fi.filename.startswith('.')
                        and fi.filename.lower().endswith(IMAGE_EXTENSIONS)
                    ]
                    if len(entries) > MAX_IMAGES:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"ZIP contains {len(entries)} images, maximum allowed is {MAX_IMAGES}",
                        )
                    for file_info in entries:
                        base_name = file_info.filename.split('/')[-1]
                        name_without_ext = base_name.rsplit('.', 1)[0] if '.' in base_name else base_name
                        if not name_without_ext.isdigit():
                            continue
                        extracted_imo = name_without_ext
                        file_content = zip_ref.read(file_info.filename)
                        mime = _mime_from_filename(file_info.filename)
                        gridfs_id = await gridfs.upload_from_stream(
                            base_name,
                            io.BytesIO(file_content),
                            metadata={"content_type": mime, "imo": extracted_imo},
                        )
                        results.append({
                            "_id": str(gridfs_id),
                            "imo": extracted_imo,
                            "file_name": base_name,
                            "file_size": len(file_content),
                            "mime_type": mime,
                            "uploaded_at": now_iso,
                            "updated_at": now_iso,
                        })
            except zipfile.BadZipFile:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid zip file",
                )
            continue

        # --- Image file handling ---
        imo = imo_list[idx] if idx < len(imo_list) else ""
        if not imo:
            continue  # skip images without IMO

        mime = upload_file.content_type or _mime_from_filename(filename)
        gridfs_id = await gridfs.upload_from_stream(
            filename,
            io.BytesIO(content),
            metadata={"content_type": mime, "imo": imo},
        )
        results.append({
            "_id": str(gridfs_id),
            "imo": imo,
            "file_name": filename,
            "file_size": len(content),
            "mime_type": mime,
            "uploaded_at": now_iso,
            "updated_at": now_iso,
        })

    if len(results) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total images ({len(results)}) exceeds the maximum of {MAX_IMAGES}",
        )

    return results


@router.patch("/vessel-images/{image_id}", response_model=VesselImageResponse)
async def admin_update_vessel_image(
    image_id: str,
    request: VesselImageUpdateRequest,
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    image = await update_vessel_image(gridfs, image_id, request.imo)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found",
        )
    return image


@router.delete("/vessel-images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_vessel_image(
    image_id: str,
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    deleted = await delete_vessel_image(gridfs, image_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found",
        )
    return None


@router.post("/vessel-images/bulk-delete")
async def admin_bulk_delete_vessel_images(
    ids: list[str],
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    deleted = await bulk_delete_vessel_images(gridfs, ids)
    return {"deleted": deleted}


@router.get("/vessel-images/{image_id}/url")
async def admin_get_vessel_image_url(
    image_id: str,
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    url = await get_vessel_image_url(gridfs, image_id)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found",
        )
    return {"url": url}


@router.get("/vessel-images/{image_id}/file")
async def admin_get_vessel_image_file(
    image_id: str,
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    from bson import ObjectId

    if not ObjectId.is_valid(image_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid image ID",
        )

    try:
        # Get the file directly from GridFS using the image_id as the GridFS ID
        file_data = await gridfs.get(ObjectId(image_id))
        content = await file_data.read()
        mime_type = file_data.metadata.get("content_type", "image/jpeg")
        filename = file_data.filename or "image.jpg"

        return Response(
            content=content,
            media_type=mime_type,
            headers={"Content-Disposition": f"inline; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found",
        ) from e


@router.get("/vessel-images/imo/{imo}/file")
async def admin_get_vessel_image_file_by_imo(
    imo: str,
    gridfs=Depends(get_gridfs),
    _=Depends(check_admin_role),
):
    gridfs_file = None
    async for f in gridfs.find({"metadata.imo": imo}):
        gridfs_file = f
        break

    if gridfs_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found for this IMO",
        )

    try:
        stream = await gridfs.open_download_stream(gridfs_file._id)
        content = await stream.read()
        mime_type = (gridfs_file.metadata or {}).get("content_type", "image/jpeg")
        filename = gridfs_file.filename or "image.jpg"

        return Response(
            content=content,
            media_type=mime_type,
            headers={"Content-Disposition": f"inline; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vessel image not found",
        ) from e
