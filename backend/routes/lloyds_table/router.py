from __future__ import annotations

import json
from typing import Optional, List, Any
from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import StreamingResponse

from .repositories.table_repository import TableRepository
from .services.table_service import (
    TableService,
    MetadataResponse,
    TableResponse,
    ExportField,
)

router = APIRouter(prefix="/lloyds", tags=["Lloyds Table"])

table_repository = TableRepository(
    collection_name="lloyds_latest",
    primary_key_field="vessel_id",
)
table_service = TableService(repository=table_repository)

table_repository.clear_cache()


@router.get("/table/metadata", response_model=MetadataResponse)
async def get_table_metadata():
    try:
        return await table_service.get_metadata_service()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/table/metadata/values")
async def get_distinct_values(
    field: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
):
    try:
        values = await table_repository.get_distinct_values(
            field_name=field,
            limit=limit,
            search=search,
        )

        return {
            "success": True,
            "field": field,
            "values": values,
            "total": len(values),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/table/", response_model=TableResponse)
async def get_table_data(
    fields: Optional[str] = Query(None),
    filters: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_field: Optional[str] = Query(None),
    sort_order: str = Query("asc"),
):
    try:
        selected_fields = None
        if fields:
            selected_fields = [f.strip() for f in fields.split(",") if f.strip()]

        parsed_filters = None
        if filters:
            parsed_filters = json.loads(filters)
            if not isinstance(parsed_filters, (list, dict)):
                raise ValueError("filters must be a JSON object or array")

        return await table_service.get_table_service(
            fields=selected_fields,
            filters=parsed_filters,
            page=page,
            page_size=page_size,
            sort_field=sort_field,
            sort_order=sort_order,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/table/export/csv")
async def export_table_csv(
    fields: Optional[List[ExportField]] = Body(None),
    filters: Optional[Any] = Body(None),
):
    try:
        result = await table_service.export_csv(fields=fields, filters=filters)

        return StreamingResponse(
            iter([result["content"]]),
            media_type=result["media_type"],
            headers={
                "Content-Disposition": f'attachment; filename="{result["filename"]}"'
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/table/export/xml")
async def export_table_xml(
    fields: Optional[List[ExportField]] = Body(None),
    filters: Optional[Any] = Body(None),
):
    try:
        result = await table_service.export_xml(fields=fields, filters=filters)
        return StreamingResponse(
            iter([result["content"]]),
            media_type=result["media_type"],
            headers={
                "Content-Disposition": f'attachment; filename="{result["filename"]}"'
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/table/export/xls")
async def export_table_xls(
    fields: Optional[List[ExportField]] = Body(None),
    filters: Optional[Any] = Body(None),
):
    try:
        result = await table_service.export_xls(fields=fields, filters=filters)
        return StreamingResponse(
            iter([result["content"]]),
            media_type=result["media_type"],
            headers={
                "Content-Disposition": f'attachment; filename="{result["filename"]}"'
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

