import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Polygon, VesselTableFilter } from "../model/types";

const RESERVED_PARAMS = new Set([
  "vessel",
  "track",
  "zone",
  "flyto",
  "layers",
  "basemap",
  "briefing",
  "view",
]);

const VALID_TILES = new Set(["map", "table", "layers", "vessel", "charts"]);

const OPERATOR_PREFIX_MAP: Array<[string, VesselTableFilter["operator"]]> = [
  ["contains:", "contains"],
  ["starts:", "startsWith"],
  ["ends:", "endsWith"],
  [">=", ">="],
  ["<=", "<="],
  ["!=", "!="],
  [">", ">"],
  ["<", "<"],
  ["=", "="],
];

function parseOperator(
  raw: string,
): { operator: VesselTableFilter["operator"]; value: string } {
  for (const [prefix, operator] of OPERATOR_PREFIX_MAP) {
    if (raw.startsWith(prefix)) {
      return { operator, value: raw.slice(prefix.length).trim() };
    }
  }
  return { operator: "=", value: raw.trim() };
}

export interface MapUrlParams {
  vessel: string | undefined;
  track: number | undefined;
  zone: Polygon[];
  flyto: [number, number, number, number] | undefined;
  layers: string[];
  basemap: string | undefined;
  briefing: boolean;
  view: string[];
  filters: VesselTableFilter[];
  hasParams: boolean;
}

export function useMapUrlParams(): MapUrlParams {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const vessel = searchParams.get("vessel") ?? undefined;

    const trackStr = searchParams.get("track");
    const track = trackStr ? parseInt(trackStr, 10) : undefined;

    const zone: Polygon[] = [];
    searchParams.getAll("zone").forEach((zoneStr, idx) => {
      const coords = zoneStr.split(",").map(Number);
      if (coords.length >= 6 && coords.length % 2 === 0) {
        const points: { lat: number; lng: number }[] = [];
        for (let i = 0; i < coords.length; i += 2) {
          if (!Number.isNaN(coords[i]) && !Number.isNaN(coords[i + 1])) {
            points.push({ lat: coords[i], lng: coords[i + 1] });
          }
        }
        if (points.length >= 3) {
          zone.push({ id: `url-zone-${idx}`, points });
        }
      }
    });

    let flyto: [number, number, number, number] | undefined;
    const flytoStr = searchParams.get("flyto");
    if (flytoStr) {
      const parts = flytoStr.split(",").map(Number);
      if (parts.length === 4 && parts.every((p) => !Number.isNaN(p))) {
        flyto = [parts[1], parts[0], parts[3], parts[2]];
      }
    }

    const layersStr = searchParams.get("layers");
    const layers = layersStr
      ? layersStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const basemap = searchParams.get("basemap") ?? undefined;

    const briefingStr = searchParams.get("briefing");
    const briefing = briefingStr === "1" || briefingStr === "true";

    const viewStr = searchParams.get("view");
    const view = viewStr
      ? viewStr
          .split(",")
          .map((s) => s.trim())
          .filter((s) => VALID_TILES.has(s))
      : [];

    const filters: VesselTableFilter[] = [];
    for (const [key, value] of searchParams.entries()) {
      if (RESERVED_PARAMS.has(key)) continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      const { operator, value: filterValue } = parseOperator(trimmed);
      if (!filterValue) continue;
      filters.push({
        column: key,
        operator,
        value: filterValue,
        combinator: "AND",
      });
    }

    const hasParams =
      vessel !== undefined ||
      track !== undefined ||
      zone.length > 0 ||
      flyto !== undefined ||
      layers.length > 0 ||
      basemap !== undefined ||
      briefing ||
      view.length > 0 ||
      filters.length > 0;

    return {
      vessel,
      track,
      zone,
      flyto,
      layers,
      basemap,
      briefing,
      view,
      filters,
      hasParams,
    };
  }, [searchParams]);
}
