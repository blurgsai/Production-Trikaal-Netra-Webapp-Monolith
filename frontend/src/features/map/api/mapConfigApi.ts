import { axiosInstance } from "@/shared/api";
import type { MapConfigApiResponse } from "./types";

const EMPTY_CONFIG: MapConfigApiResponse = {
  selected_base_map_id: null,
  active_layer_ids: null,
  layer_order: null,
  vessel_config: null,
  map_control_settings: null,
};

export async function loadMapConfig(): Promise<MapConfigApiResponse> {
  try {
    const res = await axiosInstance.get<MapConfigApiResponse>("/users/me/map-config");
    const data = res.data;
    return {
      selected_base_map_id: data.selected_base_map_id ?? null,
      active_layer_ids: data.active_layer_ids ?? null,
      layer_order: data.layer_order ?? null,
      vessel_config: data.vessel_config ?? null,
      map_control_settings: data.map_control_settings ?? null,
    };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export async function saveMapConfig(config: MapConfigApiResponse): Promise<void> {
  try {
    await axiosInstance.put("/users/me/map-config", config);
  } catch {
    // network error — silently fail, will retry on next change
  }
}
