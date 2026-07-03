from __future__ import annotations

from typing import Dict, Optional, Any, List
from pydantic import BaseModel, Field
from datetime import datetime
from bson import Int64
from xml.sax.saxutils import escape
import csv
import io
import logging
import re

logger = logging.getLogger(__name__)


class PaginationInfo(BaseModel):
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1)
    total_records: int = Field(..., ge=0)
    total_pages: int = Field(..., ge=0)
    has_next: bool
    has_prev: bool


class MetadataResponse(BaseModel):
    success: bool = True
    fields: Dict[str, Dict[str, str]]
    total_fields: int = Field(..., ge=0)


class TableResponse(BaseModel):
    success: bool = True
    data: List[Dict[str, Any]]
    pagination: PaginationInfo


class ExportField(BaseModel):
    field: str
    label: str


class TableService:
    def __init__(self, repository, default_page_size: int = 10, max_page_size: int = 100):
        self.repository = repository
        self.default_page_size = default_page_size
        self.max_page_size = max_page_size

    async def get_metadata_service(self) -> MetadataResponse:
        schema = await self.repository.get_schema()

        formatted_fields = {}
        for name, field_schema in schema.items():
            formatted_fields[name] = {
                "label": field_schema.label,
                "type": field_schema.type,
            }

        return MetadataResponse(
            success=True,
            fields=formatted_fields,
            total_fields=len(formatted_fields),
        )

    async def get_table_service(
        self,
        fields: Optional[List[str]] = None,
        filters: Optional[List[Dict[str, Any]]] = None,
        page: int = 1,
        page_size: Optional[int] = None,
        sort_field: Optional[str] = None,
        sort_order: str = "asc",
    ) -> TableResponse:
        page = max(1, page)
        page_size = page_size or self.default_page_size
        page_size = min(max(1, page_size), self.max_page_size)

        mongo_order = 1 if sort_order == "asc" else -1

        data = await self.repository.get_table_data(
            fields=fields,
            filters=filters,
            page=page,
            page_size=page_size,
            sort_field=sort_field,
            sort_order=mongo_order,
        )

        self._normalize_large_ints(data)

        total_records = await self.repository.count_documents(filters=filters)
        pagination = self._calculate_pagination(page, page_size, total_records)

        return TableResponse(
            success=True,
            data=data,
            pagination=pagination,
        )

    async def export_csv(
        self,
        fields: Optional[List[ExportField]] = None,
        filters: Optional[List[dict]] = None,
    ) -> Dict[str, Any]:
        export_keys, export_labels, data = await self._prepare_export_data(fields, filters)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(export_labels)

        for row in data:
            csv_row = []
            for key in export_keys:
                value = row.get(key)
                str_value = str(value) if value is not None else ""
                if str_value.startswith(("=", "+", "-", "@")):
                    csv_row.append(f"'{str_value}")
                else:
                    csv_row.append(str_value)
            writer.writerow(csv_row)

        filename = f"lloyds_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

        return {
            "content": output.getvalue(),
            "filename": filename,
            "media_type": "text/csv",
        }
    
    async def export_xml(
        self,
        fields: Optional[List[ExportField]] = None,
        filters: Optional[List[dict]] = None,
    ) -> Dict[str, Any]:
        export_keys, export_labels, data = await self._prepare_export_data(fields, filters)

        output = io.StringIO()
        output.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        output.write("<rows>\n")

        for row in data:
            output.write("  <row>\n")
            for key, label in zip(export_keys, export_labels):
                value = row.get(key)
                safe_tag = re.sub(r"[^a-zA-Z0-9_]", "_", key)
                safe_value = escape("" if value is None else str(value))
                output.write(f"    <{safe_tag}>{safe_value}</{safe_tag}>\n")
            output.write("  </row>\n")

        output.write("</rows>\n")

        filename = f"lloyds_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xml"

        return {
            "content": output.getvalue(),
            "filename": filename,
            "media_type": "application/xml",
        }
    
    async def export_xls(
        self,
        fields: Optional[List[ExportField]] = None,
        filters: Optional[List[dict]] = None,
    ) -> Dict[str, Any]:
        export_keys, export_labels, data = await self._prepare_export_data(fields, filters)

        output = io.StringIO()
        output.write("<html><head><meta charset='UTF-8'></head><body>")
        output.write("<table border='1'>")

        output.write("<tr>")
        for label in export_labels:
            output.write(f"<th>{escape(str(label))}</th>")
        output.write("</tr>")

        for row in data:
            output.write("<tr>")
            for key in export_keys:
                value = row.get(key)
                output.write(f"<td>{escape('' if value is None else str(value))}</td>")
            output.write("</tr>")

        output.write("</table></body></html>")

        filename = f"lloyds_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xls"

        return {
            "content": output.getvalue(),
            "filename": filename,
            "media_type": "application/vnd.ms-excel",
        }

    def _calculate_pagination(self, page: int, page_size: int, total_records: int) -> PaginationInfo:
        total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 1
        page = min(page, total_pages) if total_pages > 0 else 1

        return PaginationInfo(
            page=page,
            page_size=page_size,
            total_records=total_records,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )

    def _normalize_large_ints(self, data: List[Dict[str, Any]]) -> None:
        JS_MAX_SAFE_INT = 9007199254740991
        primary_key_field = self.repository.primary_key_field

        for row in data:
            for key, value in list(row.items()):
                if key == primary_key_field:
                    row[key] = str(value)
                    continue

                if isinstance(value, dict) and len(value) == 1 and "$numberLong" in value:
                    row[key] = value["$numberLong"]
                elif isinstance(value, (int, Int64)) and value > JS_MAX_SAFE_INT:
                    row[key] = str(value)

    async def _prepare_export_data(
        self,
        fields: Optional[List[ExportField]] = None,
        filters: Optional[List[dict]] = None,
    ) -> tuple[List[str], List[str], List[Dict[str, Any]]]:
        schema = await self.repository.get_schema()

        if fields:
            export_keys = [f.field for f in fields]
            export_labels = [f.label for f in fields]
            valid_fields, invalid_fields = self.repository.validate_fields(export_keys, schema)
            if invalid_fields:
                raise ValueError(f"Invalid fields: {', '.join(invalid_fields)}")
        else:
            export_keys = list(schema.keys())
            export_labels = [schema[f].label for f in export_keys]

        data = await self.repository.get_export_data(export_keys, filters)

        if not data:
            raise ValueError("No data found for export")

        self._normalize_large_ints(data)
        return export_keys, export_labels, data
    
