import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from src.features.vessels.models import (
    PlaybackWindowRequest,
    TrajectoryRequest,
    VesselPlaybackResponse,
    VesselTrajectoriesResponse,
    VesselTrajectoryResponse,
)
from src.features.vessels.services import (
    get_vessel_playback,
    get_vessel_trajectories,
    get_vessel_trajectory,
)
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db, get_gridfs, get_http_client

router = APIRouter(prefix="/vessels", tags=["Vessels"])


@router.get("/trajectory/{vessel_id}", response_model=VesselTrajectoryResponse)
async def get_trajectory(
    vessel_id: str,
    time: int = 3600,
    client: httpx.AsyncClient = Depends(get_http_client),
    current_user: dict = Depends(get_current_user),
):
    return await get_vessel_trajectory(client, vessel_id, time)


@router.post("/playback", response_model=VesselPlaybackResponse)
async def get_playback(
    req: PlaybackWindowRequest,
    client: httpx.AsyncClient = Depends(get_http_client),
    current_user: dict = Depends(get_current_user),
):
    return await get_vessel_playback(client, req.polygon, req.start, req.end)


@router.post("/trajectory", response_model=VesselTrajectoriesResponse)
async def get_trajectories(
    req: TrajectoryRequest,
    client: httpx.AsyncClient = Depends(get_http_client),
    current_user: dict = Depends(get_current_user),
):
    return await get_vessel_trajectories(
        client,
        vessel_ids=req.vessel_ids,
        polygon=req.polygon,
        start_time=req.start_time,
        end_time=req.end_time,
        time_seconds=req.time_seconds,
        filters=req.filters,
    )


@router.get("/{mmsi}/uploads")
async def get_vessel_uploads(
    mmsi: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uploads = []
    cursor = db.vessel_data_uploads.find({"mmsi": mmsi}).sort("created_at", -1)
    async for upload in cursor:
        uploads.append({
            "_id": str(upload["_id"]),
            "database_name": upload.get("database_name", ""),
            "mmsi": upload.get("mmsi", ""),
            "data": upload.get("data", {}),
            "created_at": upload.get("created_at").isoformat() if upload.get("created_at") else None,
            "updated_at": upload.get("updated_at").isoformat() if upload.get("updated_at") else None,
        })
    return {"items": uploads, "total": len(uploads)}


@router.get("/imo/{imo}/image")
async def get_vessel_image_by_imo(
    imo: str,
    gridfs=Depends(get_gridfs),
    current_user: dict = Depends(get_current_user),
):
    gridfs_file = None
    async for f in gridfs.find({"metadata.imo": {"$in": [imo, int(imo)]}}):
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


@router.get("/imo/{imo}/lloyds")
async def get_vessel_lloyds_data(
    imo: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = await db.lloyds_latest.find_one({"vessel.imo": {"$in": [imo, int(imo)]}})
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lloyds data not found for this IMO",
        )

    def serialize(obj):
        if isinstance(obj, dict):
            return {k: serialize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [serialize(v) for v in obj]
        return obj

    result = {
        "vessel_id": doc.get("vessel_id"),
        "snapshot_id": doc.get("snapshot_id"),
        "timestamp": doc.get("timestamp"),
        "vessel": serialize(doc.get("vessel", {})),
        "ownership": serialize(doc.get("ownership", {})),
        "inmarsat": serialize(doc.get("inmarsat", {})),
        "engines": serialize(doc.get("engines", {})),
        "design": serialize(doc.get("design", {})),
        "propulsion_and_dimensions": serialize(doc.get("propulsion_and_dimensions", {})),
        "capacities": serialize(doc.get("capacities", {})),
        "casualties": serialize(doc.get("casualties", [])),
        "vigilance_score": doc.get("vigilance_score"),
        "build_and_history": serialize(doc.get("build_and_history")),
        "flag_history": serialize(doc.get("flag_history", [])),
        "name_history": serialize(doc.get("name_history", [])),
    }
    return result
