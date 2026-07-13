import tileserverInstance from "@/shared/api/tileserverClient";
import type { OverlayLayerConfig } from "./types";

interface OverlayApiResponse {
  id: string;
  name: string;
  type: string;
  source_type: string;
  tile_url: string;
  attribution: string;
  color: string;
  opacity: number;
  bounds: number[] | null;
  created_at: string;
}

export async function fetchDynamicOverlays(): Promise<OverlayLayerConfig[]> {
  try {
    const res = await tileserverInstance.get<OverlayApiResponse[]>("/overlays");
    const tileserverUrl = import.meta.env.VITE_TILESERVER_URL;
    return res.data.map((item) => {
      const isFile = item.type === "file";
      const tileUrl = isFile
        ? `${tileserverUrl}${item.tile_url}`
        : item.tile_url;

      let layerType: OverlayLayerConfig["type"] = "tile";
      let layers: string | undefined;
      let finalUrl = tileUrl;

      if (item.source_type === "mvt") {
        layerType = "mvt";
        // Keep full URL with query params — the tileserver MVT proxy needs wms_url and layers
        finalUrl = tileUrl;
      } else if (item.source_type === "geojson") {
        layerType = "geojson";
      } else if (item.source_type === "kml") {
        layerType = "kml";
      } else if (item.source_type === "wms" && isFile) {
        // File-type WMS overlays use the tileserver WMS PNG proxy (server-side rendered).
        // The URL has {z}/{x}/{y}.png pattern with wms_url and layers as query params.
        layerType = "tile";
        finalUrl = tileUrl;
      } else if (item.source_type === "wms" || (item.type === "url" && item.tile_url.includes("wms"))) {
        // URL-type WMS overlays point directly to a GeoServer WMS endpoint.
        layerType = "wms";
        layers = extractLayers(tileUrl);
        finalUrl = stripQuery(tileUrl);
      }

      const bounds: [number, number, number, number] | undefined =
        item.bounds?.length === 4
          ? ([item.bounds[0], item.bounds[1], item.bounds[2], item.bounds[3]] as [number, number, number, number])
          : undefined;

      return {
        id: item.id,
        title: item.name,
        type: layerType,
        url: finalUrl,
        layers,
        attribution: item.attribution || "",
        color: item.color || "#3388ff",
        opacity: item.opacity ?? 1,
        isENC: isFile && item.source_type === "wms",
        bounds,
      };
    });
  } catch {
    return [];
  }
}

let cachedOverlays: OverlayLayerConfig[] | null = null;

export async function fetchOverlayBounds(
  overlayId: string
): Promise<[number, number, number, number] | null> {
  // Prefer cached bounds from the overlay list response (instant, no network).
  if (cachedOverlays) {
    const overlay = cachedOverlays.find((o) => o.id === overlayId);
    if (overlay?.bounds) {
      return overlay.bounds;
    }
  }

  // Fallback to the bounds endpoint (legacy overlays or cache miss).
  try {
    const res = await tileserverInstance.get<{ bounds: number[] | null }>(
      `/overlays/${overlayId}/bounds`
    );
    const b = res.data.bounds;
    if (b && b.length === 4) {
      return [b[0], b[1], b[2], b[3]];
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedOverlays(overlays: OverlayLayerConfig[]) {
  cachedOverlays = overlays;
}

function extractLayers(wmsUrl: string): string | undefined {
  try {
    const url = new URL(wmsUrl);
    const layers = url.searchParams.get("layers");
    if (layers) return layers;
    // Some WMS URLs embed the layer in the path, e.g. /workspace/wms?layers=workspace:layer
    const match = wmsUrl.match(/[?&]layers=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function stripQuery(urlWithQuery: string): string {
  try {
    const url = new URL(urlWithQuery);
    return `${url.origin}${url.pathname}`;
  } catch {
    return urlWithQuery.split("?")[0];
  }
}
