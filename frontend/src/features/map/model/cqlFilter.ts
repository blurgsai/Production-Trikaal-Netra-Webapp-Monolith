import type { VesselTableFilter, FilterCombinator, Polygon } from "./types";

export function buildWfsCqlFilter(
  filters: VesselTableFilter[],
  defaultCombinator: FilterCombinator = "AND"
): string | null {
  const parts = filters.map((filter) => {
    const { column, operator, value } = filter;
    if (!column || value === undefined || value === null || value.trim() === "") return null;

    const isNumeric = isNumericColumn(column);
    const escapedValue = escapeCqlLiteral(value);

    switch (operator) {
      case "=":
        return isNumeric ? `${column} = ${value}` : `${column} = '${escapedValue}'`;
      case "!=":
        return isNumeric ? `${column} <> ${value}` : `${column} <> '${escapedValue}'`;
      case "<":
        return isNumeric ? `${column} < ${value}` : `${column} < '${escapedValue}'`;
      case "<=":
        return isNumeric ? `${column} <= ${value}` : `${column} <= '${escapedValue}'`;
      case ">":
        return isNumeric ? `${column} > ${value}` : `${column} > '${escapedValue}'`;
      case ">=":
        return isNumeric ? `${column} >= ${value}` : `${column} >= '${escapedValue}'`;
      case "startsWith":
        return `${column} LIKE '${escapedValue}%'`;
      case "endsWith":
        return `${column} LIKE '%${escapedValue}'`;
      case "contains":
        return `${column} LIKE '%${escapedValue}%'`;
      default:
        return null;
    }
  });

  const validParts = parts.filter((part): part is string => part !== null);

  if (validParts.length === 0) return null;
  if (validParts.length === 1) return validParts[0];

  return validParts.reduce((acc, part, index) => {
    if (index === 0) return part;
    const combinator = filters[index]?.combinator ?? defaultCombinator;
    return `(${acc}) ${combinator} (${part})`;
  });
}

function isNumericColumn(column: string): boolean {
  const numericSuffixes = [
    "_lat",
    "_lon",
    "_timestamp",
    "_value",
    "_count",
    "_rate",
    "_historylimit",
    "_history",
    "_lastobservedvalue",
    "_variabilityscore",
    "_consensusvalue",
    "_lastupdatets",
    "_turnrate",
    "_accelerationmps2",
    "_distancemeters",
    "_headingchangedeg",
    "_headingdeg",
    "_jerkmps3",
    "_speedovergroundmps",
    "_timedeltaseconds",
    "_windowseconds",
    "_level",
    "_total",
    "_current",
    "_eta",
    "_buildyear",
    "_epfdtype",
    "_maneuverindicator",
    "_positionaccuracy",
    "_radiostatus",
    "_navstatus",
    "_s2",
    "mmsi",
    "imo",
    "id",
  ];

  return numericSuffixes.some((suffix) => column.toLowerCase().endsWith(suffix));
}

function escapeCqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildPolygonCqlFilter(polygons: Polygon[]): string | null {
  if (polygons.length === 0) return null;

  const geometryColumn = import.meta.env.VITE_GEOMETRY_COLUMN ?? "geom";

  const parts = polygons.map((polygon) => {
    if (polygon.points.length < 3) return null;

    const ring = polygon.points
      .map((point) => `${point.lng} ${point.lat}`)
      .join(", ");

    const first = polygon.points[0];
    const last = polygon.points[polygon.points.length - 1];
    const closedRing =
      first && last && (first.lat !== last.lat || first.lng !== last.lng)
        ? `${ring}, ${first.lng} ${first.lat}`
        : ring;

    // Use WITHIN for point geometries - checks if the point is within the polygon
    // SRID=4326 prefix is required for WFS CQL to correctly interpret the polygon
    return `WITHIN(${geometryColumn}, SRID=4326;POLYGON((${closedRing})))`;
  });

  const validParts = parts.filter((part): part is string => part !== null);
  if (validParts.length === 0) return null;
  if (validParts.length === 1) return validParts[0];

  return validParts.map((part) => `(${part})`).join(" OR ");
}

export function combineCqlFilters(filters: (string | null)[]): string | null {
  const validParts = filters.filter(
    (part): part is string => part !== null && part !== ""
  );
  if (validParts.length === 0) return null;
  if (validParts.length === 1) return validParts[0];
  return validParts.map((part) => `(${part})`).join(" AND ");
}
