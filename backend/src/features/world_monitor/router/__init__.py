from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from src.features.world_monitor.models import (
    OverviewDistributionsResponse,
    OverviewHotspot,
    OverviewRecentResponse,
    OverviewSummary,
    OverviewTrendPoint,
    VesselSearchResponse,
    WorldMonitorArticleDetail,
    WorldMonitorArticleListResponse,
    WorldMonitorEventDetail,
    WorldMonitorEventListResponse,
    WorldMonitorMapResponse,
    WorldMonitorMetadataResponse,
)
from src.features.world_monitor.services import (
    get_article_detail,
    get_article_list,
    get_event_detail,
    get_event_list,
    get_map_data,
    get_metadata,
    get_overview_distributions,
    get_overview_hotspots,
    get_overview_recent,
    get_overview_summary,
    get_overview_trends,
    search_vessels_by_name,
)
from src.shared.auth import get_current_user
from src.shared.dependencies import get_db

router = APIRouter(prefix="/world-monitor", tags=["World Monitoring"])


@router.get("/filters/metadata", response_model=WorldMonitorMetadataResponse)
async def get_world_monitor_metadata(db=Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await get_metadata(db)


@router.get("/vessels/search", response_model=VesselSearchResponse)
async def search_world_monitor_vessels(
    name: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await search_vessels_by_name(db, name, limit)


@router.get("/events", response_model=WorldMonitorEventListResponse)
async def get_world_monitor_events(
    keyword: str | None = Query(None),
    event_types: str | None = Query(None),
    threat_levels: str | None = Query(None),
    sources: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    has_linked_article: bool | None = Query(None),
    relevance_score_from: float | None = Query(None),
    relevance_score_to: float | None = Query(None),
    extracted_data_location: str | None = Query(None),
    extracted_data_vessel_name: str | None = Query(None),
    extracted_data_threat_type: str | None = Query(None),
    extracted_data_origin: str | None = Query(None),
    extracted_data_damage: str | None = Query(None),
    extracted_data_countermeasures: str | None = Query(None),
    location_name: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    sort: str = Query("latest"),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_event_list(
        db,
        keyword=keyword,
        event_types=event_types,
        threat_levels=threat_levels,
        sources=sources,
        date_from=date_from,
        date_to=date_to,
        has_linked_article=has_linked_article,
        relevance_score_from=relevance_score_from,
        relevance_score_to=relevance_score_to,
        extracted_data_location=extracted_data_location,
        extracted_data_vessel_name=extracted_data_vessel_name,
        extracted_data_threat_type=extracted_data_threat_type,
        extracted_data_origin=extracted_data_origin,
        extracted_data_damage=extracted_data_damage,
        extracted_data_countermeasures=extracted_data_countermeasures,
        location_name=location_name,
        page=page,
        page_size=page_size,
        sort=sort,
    )


@router.get("/events/map", response_model=WorldMonitorMapResponse)
async def get_world_monitor_map_events(
    keyword: str | None = Query(None),
    event_types: str | None = Query(None),
    threat_levels: str | None = Query(None),
    sources: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    has_linked_article: bool | None = Query(None),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_map_data(
        db,
        keyword=keyword,
        event_types=event_types,
        threat_levels=threat_levels,
        sources=sources,
        date_from=date_from,
        date_to=date_to,
        has_linked_article=has_linked_article,
    )


@router.get("/events/{event_id}", response_model=WorldMonitorEventDetail)
async def get_world_monitor_event_detail(event_id: str, db=Depends(get_db), current_user: dict = Depends(get_current_user)):
    detail = await get_event_detail(db, event_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Event not found")
    return detail


@router.get("/articles", response_model=WorldMonitorArticleListResponse)
async def get_world_monitor_articles(
    search: str | None = Query(None),
    source: str | None = Query(None),
    processing_status: str | None = Query(None),
    title: str | None = Query(None),
    author: str | None = Query(None),
    source_type: str | None = Query(None),
    published_from: str | None = Query(None),
    published_to: str | None = Query(None),
    ingested_from: str | None = Query(None),
    ingested_to: str | None = Query(None),
    updated_from: str | None = Query(None),
    updated_to: str | None = Query(None),
    tags: str | None = Query(None),
    location_name: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    sort: str = Query("latest"),
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await get_article_list(
        db,
        search=search,
        source=source,
        processing_status=processing_status,
        title=title,
        author=author,
        source_type=source_type,
        published_from=published_from,
        published_to=published_to,
        ingested_from=ingested_from,
        ingested_to=ingested_to,
        updated_from=updated_from,
        updated_to=updated_to,
        tags=tags,
        location_name=location_name,
        page=page,
        page_size=page_size,
        sort=sort,
    )


@router.get("/articles/{article_id}", response_model=WorldMonitorArticleDetail)
async def get_world_monitor_article_detail(article_id: str, db=Depends(get_db), current_user: dict = Depends(get_current_user)):
    detail = await get_article_detail(db, article_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Article not found")
    return detail


@router.get("/overview/summary", response_model=OverviewSummary)
async def get_world_monitor_overview_summary(db=Depends(get_db), current_user: dict = Depends(get_current_user)):
    return await get_overview_summary(db)


@router.get("/overview/recent", response_model=OverviewRecentResponse)
async def get_world_monitor_overview_recent(
    limit: int = Query(8, ge=1, le=20), db=Depends(get_db), current_user: dict = Depends(get_current_user)
):
    return {"success": True, "data": await get_overview_recent(db, limit=limit)}


@router.get("/overview/distributions", response_model=OverviewDistributionsResponse)
async def get_world_monitor_overview_distributions(
    source_limit: int = Query(8, ge=3, le=12), db=Depends(get_db), current_user: dict = Depends(get_current_user)
):
    return await get_overview_distributions(db, source_limit=source_limit)


@router.get("/overview/hotspots", response_model=list[OverviewHotspot])
async def get_world_monitor_overview_hotspots(
    limit: int = Query(8, ge=1, le=20), db=Depends(get_db), current_user: dict = Depends(get_current_user)
):
    return await get_overview_hotspots(db, limit=limit)


@router.get("/overview/trends", response_model=list[OverviewTrendPoint])
async def get_world_monitor_overview_trends(
    days: int = Query(7, ge=3, le=30), db=Depends(get_db), current_user: dict = Depends(get_current_user)
):
    return await get_overview_trends(db, days=days)
