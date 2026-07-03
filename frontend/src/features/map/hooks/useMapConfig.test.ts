import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMapConfig } from "./useMapConfig";
import { baseMaps } from "../model/config";

vi.mock("../api", () => ({
  loadMapConfig: vi.fn(() => ({
    selected_base_map_id: null,
    active_layer_ids: null,
    layer_order: null,
    vessel_config: null,
  })),
  saveMapConfig: vi.fn(),
  applyVesselStyle: vi.fn().mockResolvedValue("test-style"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useMapConfig", () => {
  it("initializes with default base map", () => {
    const { result } = renderHook(() => useMapConfig());
    expect(result.current.selectedBaseMap).toEqual(baseMaps[0]);
  });

  it("toggles a layer", () => {
    const { result } = renderHook(() => useMapConfig());
    act(() => result.current.toggleLayer("sea_lanes"));
    expect(result.current.activeLayers["sea_lanes"]).toBe(true);
    act(() => result.current.toggleLayer("sea_lanes"));
    expect(result.current.activeLayers["sea_lanes"]).toBe(false);
  });

  it("reorders layers", () => {
    const { result } = renderHook(() => useMapConfig());
    const initialOrder = [...result.current.layerOrder];
    act(() => result.current.reorderLayers(0, 1));
    expect(result.current.layerOrder).not.toEqual(initialOrder);
  });

  it("applies vessel style and updates styleName", async () => {
    const { result } = renderHook(() => useMapConfig());
    await act(async () => {
      await result.current.applyVesselStyle({
        opacity: 1,
        styleName: "",
        defaultStyle: { shape: "circle", color: "#ff0000", size: 40 },
        rules: [],
        customShapes: [],
      });
    });
    expect(result.current.vesselConfig.styleName).toBe("test-style");
    expect(result.current.vesselConfig.defaultStyle.color).toBe("#ff0000");
  });
});
