from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List, Optional
from datetime import datetime
from bson import Int64
from db import db
import logging
import re

logger = logging.getLogger(__name__)
FALSE_QUERY = {"$expr": {"$eq": [1, 0]}}
FilterNode = Dict[str, Any]
OPERATOR_ALIASES = {
    "=": "eq",
    "==": "eq",
    "!=": "ne",
    ">": "gt",
    ">=": "gte",
    "<": "lt",
    "<=": "lte",
    "CONTAINS": "contains",
    "contains": "contains",
    "BETWEEN": "between",
    "between": "between",
}

OPERATOR_MAP = {
    "eq": lambda v, _: v,
    "ne": lambda v, _: {"$ne": v},
    "gt": lambda v, _: {"$gt": v},
    "gte": lambda v, _: {"$gte": v},
    "lt": lambda v, _: {"$lt": v},
    "lte": lambda v, _: {"$lte": v},
    "between": lambda v, v2: {"$gte": v, "$lte": v2},
    "contains": lambda v, _: {"$regex": re.escape(str(v)), "$options": "i"},
    "startsWith": lambda v, _: {"$regex": f"^{re.escape(str(v))}", "$options": "i"},
    "endsWith": lambda v, _: {"$regex": f"{re.escape(str(v))}$", "$options": "i"},
}


def is_group_node(node: Any) -> bool:
    return (
        isinstance(node, dict)
        and node.get("type") == "group"
        and isinstance(node.get("children"), list)
    )


def get_group_operator(node: Dict[str, Any]) -> str:
    return str(node.get("operator") or node.get("logic") or "AND").upper()


def get_condition_operator(node: Dict[str, Any]) -> Any:
    raw_operator = node.get("op", node.get("operator"))
    if raw_operator is None:
        return None
    return OPERATOR_ALIASES.get(raw_operator, raw_operator)


def collapse_term_to_node(term: List[FilterNode]) -> FilterNode:
    if len(term) == 1:
        return deepcopy(term[0])
    return {
        "type": "group",
        "operator": "AND",
        "children": [deepcopy(child) for child in term],
    }


def collapse_children_to_group(logic: str, children: List[FilterNode]) -> FilterNode:
    if len(children) == 1:
        return deepcopy(children[0])
    return {
        "type": "group",
        "operator": logic,
        "children": [deepcopy(child) for child in children],
    }


def build_group_tree_from_flat_filters(filters: List[Dict[str, Any]]) -> Optional[FilterNode]:
    terms: List[List[FilterNode]] = []
    current_term: List[FilterNode] = []

    for raw_filter in filters:
        if not isinstance(raw_filter, dict):
            continue

        condition = {
            "type": "condition",
            "field": raw_filter.get("field"),
            "op": get_condition_operator(raw_filter),
            "value": raw_filter.get("value"),
            "value2": raw_filter.get("value2"),
        }

        if not condition["field"] or not condition["op"]:
            continue

        logic = str(raw_filter.get("logic", "AND")).upper()

        if not current_term:
            current_term.append(condition)
            continue

        if logic == "OR":
            terms.append(current_term)
            current_term = [condition]
        else:
            current_term.append(condition)

    if current_term:
        terms.append(current_term)

    if not terms:
        return None

    children = [collapse_term_to_node(term) for term in terms]
    return collapse_children_to_group("OR", children)


def normalize_group_node(group: FilterNode) -> Optional[FilterNode]:
    logic = get_group_operator(group)
    if logic not in {"AND", "OR"}:
        logic = "AND"

    normalized_children: List[FilterNode] = []

    for child in group.get("children", []):
        if is_group_node(child):
            normalized_child = normalize_group_node(child)
        elif isinstance(child, dict):
            normalized_child = {
                "type": "condition",
                "field": child.get("field"),
                "op": get_condition_operator(child),
                "value": child.get("value"),
                "value2": child.get("value2"),
            }
            if not normalized_child["field"] or not normalized_child["op"]:
                normalized_child = None
        else:
            normalized_child = None

        if normalized_child:
            normalized_children.append(normalized_child)

    if not normalized_children:
        return None

    return collapse_children_to_group(logic, normalized_children)


def normalize_filter_payload(filters: Any) -> Optional[FilterNode]:
    if not filters:
        return None

    if isinstance(filters, list):
        return build_group_tree_from_flat_filters(filters)

    if is_group_node(filters):
        return normalize_group_node(filters)

    if isinstance(filters, dict):
        normalized_condition = {
            "type": "condition",
            "field": filters.get("field"),
            "op": get_condition_operator(filters),
            "value": filters.get("value"),
            "value2": filters.get("value2"),
        }
        if normalized_condition["field"] and normalized_condition["op"]:
            return normalized_condition

    return None


class FieldSchema:
    def __init__(self, path: str, field_type: str, label: str):
        self.path = path
        self.type = field_type
        self.label = label


class TableRepository:
    def __init__(
        self,
        collection_name: str = "lloyds_latest",
        primary_key_field: str = "vessel_id",
    ):
        self.collection = db.get_collection(collection_name)
        self.primary_key_field = primary_key_field
        self._cached_schema: Optional[Dict[str, FieldSchema]] = None

    def clear_cache(self) -> None:
        self._cached_schema = None

    async def get_schema(self) -> Dict[str, FieldSchema]:
        if self._cached_schema:
            return self._cached_schema

        documents = await self._sample_documents(100)
        if not documents:
            raise ValueError(f"Collection '{self.collection.name}' is empty")

        all_paths = self._extract_all_paths(documents)
        fields = self._create_field_schemas(all_paths)

        self._cached_schema = fields
        return fields

    async def get_table_data(
        self,
        fields: Optional[List[str]] = None,
        filters: Optional[List[Dict[str, Any]]] = None,
        page: int = 1,
        page_size: int = 10,
        sort_field: Optional[str] = None,
        sort_order: int = 1,
    ) -> List[Dict[str, Any]]:
        schema = await self.get_schema()

        if isinstance(sort_order, str):
            numeric_order = -1 if sort_order.lower() == "desc" else 1
        else:
            numeric_order = int(sort_order) if sort_order is not None else 1

        fields = [f for f in (fields or []) if not f.startswith("$")] or None
        filter_query = self._build_filter_query(schema, filters)
        projection = self._build_projection_dict(schema, fields)

        page = max(1, page)
        page_size = max(1, page_size)
        skip = (page - 1) * page_size

        sort_path = self.primary_key_field
        if sort_field and sort_field in schema:
            sort_path = schema[sort_field].path

        sort_spec = [(sort_path, numeric_order)]
        if sort_path != self.primary_key_field:
            sort_spec.append((self.primary_key_field, 1))

        cursor = (
            self.collection
            .find(filter=filter_query, projection=projection)
            .sort(sort_spec)
            .skip(skip)
            .limit(page_size)
        )

        documents = await cursor.to_list(length=page_size)
        return self._flatten_documents(documents, schema, fields)
    
    async def get_distinct_values(
        self,
        field_name: str,
        limit: int = 100,
        search: Optional[str] = None,
    ) -> List[Any]:
        schema = await self.get_schema()

        if field_name not in schema:
            raise ValueError(f"Invalid field: {field_name}")

        field_schema = schema[field_name]
        mongo_path = field_schema.path
        field_type = field_schema.type

        pipeline = [
            {
                "$match": {
                    mongo_path: {"$exists": True, "$ne": None}
                }
            },
            {
                "$group": {
                    "_id": f"${mongo_path}"
                }
            }
        ]

        docs = await self.collection.aggregate(pipeline).to_list(length=None)

        values = []
        for doc in docs:
            value = doc.get("_id")
            if value is None:
                continue

            if isinstance(value, datetime):
                value = value.isoformat()
            elif isinstance(value, Int64):
                value = str(int(value))
            else:
                value = str(value)

            values.append(value)

        # Apply search AFTER converting everything to string
        if search:
            search_text = str(search).strip().lower()
            if search_text:
                # For IDs and numbers, startswith is better UX
                if field_type in {"integer", "number"}:
                    values = [v for v in values if v.lower().startswith(search_text)]
                else:
                    values = [v for v in values if search_text in v.lower()]

        # Sort properly
        try:
            if field_type in {"integer", "number"}:
                values = sorted(values, key=lambda x: float(x))
            else:
                values = sorted(values, key=lambda x: x.lower())
        except Exception:
            values = sorted(values, key=lambda x: str(x).lower())

        return values[:limit]

    async def get_export_data(
        self,
        fields: List[str],
        filters: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        schema = await self.get_schema()
        safe_fields = [f for f in fields if not f.startswith("$")]

        filter_query = self._build_filter_query(schema, filters)
        projection = self._build_projection_dict(schema, safe_fields)

        cursor = self.collection.find(filter=filter_query, projection=projection)

        documents = []
        async for doc in cursor:
            documents.append(doc)

        return self._flatten_documents(documents, schema, safe_fields)

    async def count_documents(
        self,
        filters: Optional[List[Dict[str, Any]]] = None,
    ) -> int:
        schema = await self.get_schema()
        filter_query = self._build_filter_query(schema, filters)
        return await self.collection.count_documents(filter_query)

    def validate_fields(
        self,
        fields: List[str],
        schema: Dict[str, FieldSchema],
    ) -> tuple[List[str], List[str]]:
        valid_fields = []
        invalid_fields = []

        for field in fields:
            if field.startswith("$"):
                invalid_fields.append(field)
            elif field in schema:
                valid_fields.append(field)
            else:
                invalid_fields.append(field)

        return valid_fields, invalid_fields

    def _build_filter_query(
    self,
    schema: Dict[str, FieldSchema],
    filters: Optional[Any],
    ) -> Dict[str, Any]:
        normalized_filters = normalize_filter_payload(filters)
        if not normalized_filters:
            return {}

        def build_condition_query(filt: Dict[str, Any]) -> Dict[str, Any]:
            field_name = filt.get("field")
            operator = filt.get("op", filt.get("operator"))
            value = filt.get("value")
            value2 = filt.get("value2")

            if not field_name or operator is None:
                return {}

            if field_name.startswith("$"):
                return FALSE_QUERY
            if field_name not in schema:
                return FALSE_QUERY
            if operator not in OPERATOR_MAP:
                return FALSE_QUERY

            field_schema = schema[field_name]
            mongo_path = field_schema.path
            field_type = field_schema.type

            converted_value = self._convert_value(value, field_type)
            converted_value2 = (
                self._convert_value(value2, field_type)
                if value2 is not None
                else None
            )

            condition_value = OPERATOR_MAP[operator](converted_value, converted_value2)
            return {mongo_path: condition_value}

        def build_group_query(node: Dict[str, Any]) -> Dict[str, Any]:
            if not is_group_node(node):
                return build_condition_query(node)

            logic = str(node.get("operator") or node.get("logic") or "AND").upper()
            children = []

            for child in node.get("children", []):
                child_query = build_group_query(child)
                if child_query:
                    children.append(child_query)

            if not children:
                return {}

            if len(children) == 1:
                return children[0]

            return {f"${logic.lower()}": children}

        return build_group_query(normalized_filters)

    def _build_projection_dict(
        self,
        schema: Dict[str, FieldSchema],
        fields: Optional[List[str]] = None,
    ) -> Dict[str, int]:
        projection = {"_id": 1}

        if fields is None:
            for field_name, field_schema in schema.items():
                if field_name.startswith("$") or field_schema.path.startswith("$"):
                    continue
                projection[field_schema.path] = 1
        else:
            for field_name in fields:
                if field_name in schema:
                    projection[schema[field_name].path] = 1

        projection[self.primary_key_field] = 1
        return projection

    def _flatten_documents(
        self,
        documents: List[Dict[str, Any]],
        schema: Dict[str, FieldSchema],
        requested_fields: Optional[List[str]] = None,
     ) -> List[Dict[str, Any]]:
        flattened_rows = []
        fields_to_include = requested_fields or list(schema.keys())

        if (
            self.primary_key_field not in fields_to_include
            and self.primary_key_field in schema
        ):
            fields_to_include = list(fields_to_include) + [self.primary_key_field]

        for doc in documents:
            row: Dict[str, Any] = {}

            if "_id" in doc:
                row["_id"] = str(doc["_id"])

            for field_name in fields_to_include:
                if field_name not in schema:
                    continue

                value = self._get_nested_value(doc, schema[field_name].path)

                if value is None:
                    continue

                if isinstance(value, datetime):
                    value = value.isoformat()

                if field_name == self.primary_key_field:
                    row[field_name] = str(value)
                else:
                    row[field_name] = value

            if self.primary_key_field in doc and self.primary_key_field not in row:
                row[self.primary_key_field] = str(doc[self.primary_key_field])

            flattened_rows.append(row)

        return flattened_rows

    def _get_nested_value(self, doc: Dict[str, Any], path: str) -> Any:
        keys = path.split(".")
        value: Any = doc

        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None

        return value

    async def _sample_documents(self, sample_size: int) -> List[Dict[str, Any]]:
        count = await self.collection.count_documents({})
        size = min(sample_size, count)

        if size == 0:
            return []

        cursor = self.collection.aggregate([{"$sample": {"size": size}}])
        return await cursor.to_list(length=size)

    def _extract_all_paths(self, documents: List[Dict[str, Any]]) -> Dict[str, str]:
        all_paths: Dict[str, str] = {}

        for doc in documents:
            paths = self._extract_paths_from_document(doc)
            for path, field_type in paths.items():
                if path not in all_paths:
                    all_paths[path] = field_type

        return all_paths

    def _extract_paths_from_document(
        self,
        doc: Dict[str, Any],
        parent_path: str = "",
    ) -> Dict[str, str]:
        paths: Dict[str, str] = {}

        for key, value in doc.items():
            if key == "_id" and parent_path == "":
                continue
            if key.startswith("$"):
                continue

            full_path = f"{parent_path}.{key}" if parent_path else key
            value_type = self._infer_type(value)

            if value_type == "object":
                paths.update(self._extract_paths_from_document(value, full_path))
            elif value_type in {"array", "null", "unknown"}:
                # intentionally skip arrays for dynamic table/filter metadata
                continue
            else:
                paths[full_path] = value_type

        return paths

    def _infer_type(self, value: Any) -> str:
        if value is None:
            return "null"
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, datetime):
            return "timestamp"
        if isinstance(value, Int64):
            return "integer"
        if isinstance(value, int):
            return "integer"
        if isinstance(value, float):
            return "number"
        if isinstance(value, str):
            return "string"
        if isinstance(value, list):
            return "array"
        if isinstance(value, dict):
            return "object"
        return "unknown"
    
    def _format_label(self, path: str) -> str:
        return (
            path.split(".")[-1]        # take last part
            .replace("_", " ")
            .title()
        )

    def _create_field_schemas(self, paths: Dict[str, str]) -> Dict[str, FieldSchema]:
        fields: Dict[str, FieldSchema] = {}

        for path, field_type in paths.items():
            if field_type in {"null", "object", "array", "unknown"}:
                continue

            fields[path] = FieldSchema(
                path=path,
                field_type=field_type,
                label=self._format_label(path),
            )

        if self.primary_key_field in paths and self.primary_key_field not in fields:
            fields[self.primary_key_field] = FieldSchema(
                path=self.primary_key_field,
                field_type=paths[self.primary_key_field],
                label=self._format_label(self.primary_key_field),
            )

        return fields

    def _convert_value(self, value: Any, field_type: str) -> Any:
        if value is None or value == "":
            return None

        try:
            if field_type == "integer":
                numeric = float(value)
                return int(numeric) if numeric.is_integer() else numeric
            if field_type == "number":
                return float(value)
            if field_type == "boolean":
                if isinstance(value, bool):
                    return value
                if isinstance(value, str):
                    return value.strip().lower() in ("true", "1", "yes", "t", "y", "on")
                return bool(value)
            if field_type == "timestamp":
                if isinstance(value, datetime):
                    return value
                if isinstance(value, str):
                    normalized = value.replace("Z", "+00:00")
                    return datetime.fromisoformat(normalized)
                return value
            return str(value).strip() if isinstance(value, str) else value
        except (ValueError, TypeError):
            return value
