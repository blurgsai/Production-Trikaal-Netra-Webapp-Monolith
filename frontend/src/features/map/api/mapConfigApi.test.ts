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
    });
  });

  it("loads saved config", () => {
    const config: MapConfigApiResponse = {
      selected_base_map_id: "dark",
      active_layer_ids: ["sea_lanes"],
      layer_order: ["sea_lanes"],
      vessel_config: { opacity: 1, style_name: "s", default_style: { shape: "circle", color: "#fff", size: 20 }, rules: [], custom_shapes: [] },
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
    });
  });
});
