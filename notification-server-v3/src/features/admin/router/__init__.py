import json
from datetime import datetime

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from motor.motor_asyncio import AsyncIOMotorDatabase

from features.admin.services import (
    get_all_groups_with_stats,
    get_dashboard_stats,
    get_group_detail,
    get_known_users,
)
from features.groups.clients import (
    delete_group,
    fetch_group,
    upsert_group,
)
from shared.auth.dependencies import require_admin
from shared.dependencies import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])
templates = Jinja2Templates(directory="templates")


def _fmt_dt(value: datetime | None) -> str:
    if value is None:
        return "—"
    return value.strftime("%d %b %Y, %H:%M")


templates.env.filters["fmtdt"] = _fmt_dt


@router.get("", response_class=HTMLResponse)
async def admin_dashboard(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    stats = await get_dashboard_stats(db)
    return templates.TemplateResponse(
        request,
        "admin/dashboard.html",
        {"stats": stats, "active": "dashboard", "current_admin": current_admin},
    )


@router.get("/groups", response_class=HTMLResponse)
async def admin_groups(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    groups = await get_all_groups_with_stats(db)
    return templates.TemplateResponse(
        request,
        "admin/groups.html",
        {"groups": groups, "active": "groups", "current_admin": current_admin},
    )


@router.get("/groups/new", response_class=HTMLResponse)
async def admin_group_new(
    request: Request,
    current_admin: str = Depends(require_admin),
):
    return templates.TemplateResponse(
        request,
        "admin/group_edit.html",
        {"group": None, "active": "groups", "error": None, "current_admin": current_admin},
    )


@router.post("/groups/new")
async def admin_group_create(
    request: Request,
    group_id: str = Form(...),
    usernames: str = Form(""),
    metadata_json: str = Form("{}"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    ids = [c.strip() for c in usernames.splitlines() if c.strip()]
    try:
        meta = json.loads(metadata_json) if metadata_json.strip() else {}
    except json.JSONDecodeError:
        return templates.TemplateResponse(
            request,
            "admin/group_edit.html",
            {
                "group": {"group_id": group_id, "usernames": ids, "metadata": {}},
                "active": "groups",
                "error": "Invalid JSON in metadata field.",
                "current_admin": current_admin,
            },
        )
    from datetime import timezone
    now = datetime.now(timezone.utc)
    await upsert_group(db, {
        "group_id": group_id,
        "usernames": ids,
        "metadata": meta,
        "created_at": now,
        "updated_at": now,
    })
    return RedirectResponse(url="/admin/groups", status_code=303)


@router.get("/groups/{group_id}/edit", response_class=HTMLResponse)
async def admin_group_edit(
    request: Request,
    group_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    group = await get_group_detail(db, group_id)
    if group is None:
        return RedirectResponse(url="/admin/groups", status_code=303)
    return templates.TemplateResponse(
        request,
        "admin/group_edit.html",
        {"group": group, "active": "groups", "error": None, "current_admin": current_admin},
    )


@router.post("/groups/{group_id}/edit")
async def admin_group_update(
    request: Request,
    group_id: str,
    usernames: str = Form(""),
    metadata_json: str = Form("{}"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    ids = [c.strip() for c in usernames.splitlines() if c.strip()]
    try:
        meta = json.loads(metadata_json) if metadata_json.strip() else {}
    except json.JSONDecodeError:
        group = await get_group_detail(db, group_id)
        return templates.TemplateResponse(
            request,
            "admin/group_edit.html",
            {
                "group": group,
                "active": "groups",
                "error": "Invalid JSON in metadata field.",
                "current_admin": current_admin,
            },
        )
    from datetime import timezone
    await upsert_group(db, {
        "group_id": group_id,
        "usernames": ids,
        "metadata": meta,
        "updated_at": datetime.now(timezone.utc),
    })
    return RedirectResponse(url="/admin/groups", status_code=303)


@router.post("/groups/{group_id}/delete")
async def admin_group_delete(
    group_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    await delete_group(db, group_id)
    return RedirectResponse(url="/admin/groups", status_code=303)


@router.get("/clients", response_class=HTMLResponse)
async def admin_clients(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_admin: str = Depends(require_admin),
):
    users = await get_known_users(db)
    return templates.TemplateResponse(
        request,
        "admin/clients.html",
        {"users": users, "active": "clients", "current_admin": current_admin},
    )
