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
    map_control_settings: null,
  })),
  saveMapConfig: vi.fn(),
  applyVesselStyle: vi.fn().mockResolvedValue("test-style"),
  validateStyleExists: vi.fn().mockResolvedValue(true),
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
        cluster: {
          cellSize: 50,
          smallClusterMax: 10,
          smallClusterColor: "#FFA500",
          smallClusterSize: 40,
          largeClusterColor: "#FF0000",
          largeClusterSize: 40,
          clusterLabelColor: "#FFFFFF",
          minScaleDenominator: 18500000,
        },
        trajectory: {
          timeSeconds: 3600,
          lineColor: "#00BFFF",
          lineWeight: 3,
          lineOpacity: 0.7,
          dotColor: "#FF0000",
          dotFillColor: "#FF0000",
          dotFillOpacity: 0.8,
          dotRadius: 4,
        },
        deadReckoning: {
          intervals: [{ value: 15, unit: "minutes" }],
          lineColor: "#FFFF00",
          lineWeight: 2,
          pointColor: "#FF7800",
        },
        popupFields: { enabledFields: ["mmsi"] },
        rules: [],
        customShapes: [],
      });
    });
    expect(result.current.vesselConfig.styleName).toBe("test-style");
    expect(result.current.vesselConfig.defaultStyle.color).toBe("#ff0000");
  });
});
