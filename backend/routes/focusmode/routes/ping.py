from fastapi import APIRouter

router = APIRouter(tags=["FocusMode"])

@router.get("/ping")
async def ping():
    return {"message": "Focus Mode API is active"}
