import { describe, it, expect, beforeEach } from "vitest";
import { loadMapConfig, saveMapConfig } from "./mapConfigApi";
import type { MapConfigApiResponse } from "./types";

beforeEach(() => {
  localStorage.clear();
});

describe("mapConfigApi", () => {
  it("returns default config when none is saved", () => {
    expect(loadMapConfig()).toEqual({
      selected_base_map_id: null,
      active_layer_ids: null,
      layer_order: null,
      vessel_config: null,
      map_control_settings: null,
    });
  });

  it("loads saved config", () => {
    const config: MapConfigApiResponse = {
      selected_base_map_id: "dark",
      active_layer_ids: ["sea_lanes"],
      layer_order: ["sea_lanes"],
      vessel_config: { opacity: 1, style_name: "s", default_style: { shape: "circle", color: "#fff", size: 20 }, cluster: { cell_size: 50, small_cluster_max: 10, small_cluster_color: "#FFA500", small_cluster_size: 40, large_cluster_color: "#FF0000", large_cluster_size: 40, cluster_label_color: "#FFFFFF", min_scale_denominator: 18500000 }, trajectory: { time_seconds: 3600, line_color: "#00BFFF", line_weight: 3, line_opacity: 0.7, dot_color: "#FF0000", dot_fill_color: "#FF0000", dot_fill_opacity: 0.8, dot_radius: 4 }, dead_reckoning: { intervals: [{ value: 15, unit: "minutes" }], line_color: "#FFFF00", line_weight: 2, point_color: "#FF7800" }, popup_fields: { enabled_fields: ["mmsi"] }, rules: [], custom_shapes: [] },
      map_control_settings: { toolbar: true, zoombar: false, minimap: true, statusbar: false },
    };
    saveMapConfig(config);
    expect(loadMapConfig()).toEqual(config);
  });

  it("returns default config on invalid localStorage data", () => {
    localStorage.setItem("trikaal_map_config", "not json");
    expect(loadMapConfig()).toEqual({
      selected_base_map_id: null,
      active_layer_ids: null,
      layer_order: null,
      vessel_config: null,
      map_control_settings: null,
    });
  });
});
