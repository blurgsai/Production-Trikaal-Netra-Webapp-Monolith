from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from src.features.vessel_flags.models import (
    VALID_FLAGS,
    VesselFlagCreateRequest,
    VesselFlagListResponse,
    VesselFlagResponse,
)
from src.features.vessel_flags.services import create_flag, list_flags, remove_flag
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/vessel-flags", tags=["Vessel Flags"])


@router.post("", response_model=VesselFlagResponse, status_code=status.HTTP_201_CREATED)
async def add_vessel_flag(
    request: VesselFlagCreateRequest,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user.get("_id", ""))
    try:
        return await create_flag(db, request.vessel_id, user_id, request.flag, request.comment)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None


@router.get("/{vessel_id}", response_model=VesselFlagListResponse)
async def get_vessel_flags(
    vessel_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    flags = await list_flags(db, vessel_id)
    return {"success": True, "data": flags, "total": len(flags)}


@router.delete("/{flag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vessel_flag(
    flag_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    deleted = await remove_flag(db, flag_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flag not found",
        )
    return None


@router.get("/meta/options")
async def get_flag_options(
    current_user: dict = Depends(get_current_user),
):
    return {"flags": VALID_FLAGS}
