import type { MapConfigApiResponse } from "./types";

const STORAGE_KEY = "trikaal_map_config";

export function loadMapConfig(): MapConfigApiResponse {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        selected_base_map_id: null,
        active_layer_ids: null,
        layer_order: null,
        vessel_config: null,
        map_control_settings: null,
      };
    }
    const parsed = JSON.parse(raw) as MapConfigApiResponse;
    return {
      selected_base_map_id: parsed.selected_base_map_id ?? null,
      active_layer_ids: parsed.active_layer_ids ?? null,
      layer_order: parsed.layer_order ?? null,
      vessel_config: parsed.vessel_config ?? null,
      map_control_settings: parsed.map_control_settings ?? null,
    };
  } catch {
    return {
      selected_base_map_id: null,
      active_layer_ids: null,
      layer_order: null,
      vessel_config: null,
      map_control_settings: null,
    };
  }
}

export function saveMapConfig(config: MapConfigApiResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage quota exceeded or private mode — silently fail
  }
}
