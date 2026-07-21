import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type {
  TimeGranularity,
  PlaybackFilter,
  FilterField,
  FilterOperator,
} from "../model/types";

const VALID_GRANULARITIES = new Set(["minute", "hour", "day", "week"]);

export interface PlaybackUrlParams {
  start: string | undefined;
  end: string | undefined;
  granularity: TimeGranularity | undefined;
  zone: GeoJSON.Feature | undefined;
  filters: PlaybackFilter[];
  hasParams: boolean;
}

export function usePlaybackUrlParams(): PlaybackUrlParams {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const start = searchParams.get("start") ?? undefined;
    const end = searchParams.get("end") ?? undefined;

    const granularityStr = searchParams.get("granularity") ?? undefined;
    const granularity =
      granularityStr && VALID_GRANULARITIES.has(granularityStr)
        ? (granularityStr as TimeGranularity)
        : undefined;

    // ── Zone polygon ────────────────────────────────────────────────

    const zoneParams = searchParams.getAll("zone");
    let zone: GeoJSON.Feature | undefined;

    if (zoneParams.length > 0) {
      const polygons: GeoJSON.Polygon[] = [];

      for (const z of zoneParams) {
        const parts = z.split(",").map((p) => parseFloat(p.trim()));
        if (parts.length < 6 || parts.length % 2 !== 0) continue;
        if (parts.some((n) => Number.isNaN(n))) continue;

        const coords: [number, number][] = [];
        for (let i = 0; i < parts.length; i += 2) {
          coords.push([parts[i + 1], parts[i]]);
        }
        // Close the ring
        if (
          coords[0][0] !== coords[coords.length - 1][0] ||
          coords[0][1] !== coords[coords.length - 1][1]
        ) {
          coords.push(coords[0]);
        }

        polygons.push({
          type: "Polygon",
          coordinates: [coords],
        });
      }

      if (polygons.length > 0) {
        zone = {
          type: "Feature",
          geometry:
            polygons.length === 1
              ? polygons[0]
              : { type: "MultiPolygon", coordinates: polygons.map((p) => p.coordinates) },
          properties: {},
        };
      }
    }

    // ── Filters ─────────────────────────────────────────────────────

    const filters: PlaybackFilter[] = [];

    // Helper to push a filter
    const pushFilter = (
      field: FilterField,
      operator: FilterOperator,
      value: string,
    ) => {
      if (!value) return;
      filters.push({
        field,
        operator,
        value,
        combinator: filters.length > 0 ? "AND" : undefined,
      });
    };

    // MMSI (repeatable, eq)
    searchParams.getAll("mmsi").forEach((v) => {
      if (v) pushFilter("mmsi", "eq", v);
    });

    // Vessel ID (repeatable, eq)
    searchParams.getAll("vessel_id").forEach((v) => {
      if (v) pushFilter("vesselId", "eq", v);
    });

    // Speed range
    const speedMin = searchParams.get("speed_min");
    if (speedMin) pushFilter("speed", "gte", speedMin);

    const speedMax = searchParams.get("speed_max");
    if (speedMax) pushFilter("speed", "lte", speedMax);

    // Ship name (like)
    const shipName = searchParams.get("ship_name");
    if (shipName) pushFilter("shipName", "like", shipName);

    // Destination (like)
    const destination = searchParams.get("destination");
    if (destination) pushFilter("destination", "like", destination);

    // Callsign (like)
    const callsign = searchParams.get("callsign");
    if (callsign) pushFilter("callsign", "like", callsign);

    // Navigation status (eq)
    const navStatus = searchParams.get("nav_status");
    if (navStatus) pushFilter("navigationStatus", "eq", navStatus);

    // Heading range
    const headingMin = searchParams.get("heading_min");
    if (headingMin) pushFilter("heading", "gte", headingMin);

    const headingMax = searchParams.get("heading_max");
    if (headingMax) pushFilter("heading", "lte", headingMax);

    // Course range
    const courseMin = searchParams.get("course_min");
    if (courseMin) pushFilter("course", "gte", courseMin);

    const courseMax = searchParams.get("course_max");
    if (courseMax) pushFilter("course", "lte", courseMax);

    // ── hasParams ───────────────────────────────────────────────────

    const hasParams =
      start != null ||
      end != null ||
      granularity != null ||
      zone != null ||
      filters.length > 0;

    return {
      start,
      end,
      granularity,
      zone,
      filters,
      hasParams,
    };
  }, [searchParams]);
}
