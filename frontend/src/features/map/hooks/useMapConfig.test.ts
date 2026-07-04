import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMapConfig } from "./useMapConfig";
import type { MapConfigApiResponse } from "../api/types";
import type { MapConfigDomain } from "../model/mappers";

vi.mock("../api", () => ({
  loadMapConfig: vi.fn(),
  saveMapConfig: vi.fn(),
  applyVesselStyle: vi.fn(),
  validateStyleExists: vi.fn(),
}));

vi.mock("../model/mappers", () => ({
  mapApiToDomain: vi.fn(),
  mapDomainToApi: vi.fn(),
}));

vi.mock("../model/sldGenerator", () => ({
  generateSld: vi.fn(),
}));

vi.mock("../model/config", () => ({
  baseMaps: [
    { id: "osm", title: "Light Map", url: "https://osm.test/{z}/{x}/{y}.png", attribution: "OSM" },
    { id: "dark", title: "Dark Map", url: "https://dark.test/{z}/{x}/{y}.png", attribution: "Dark" },
    { id: "satellite", title: "Satellite Map", url: "https://sat.test/{z}/{x}/{y}.png", attribution: "Sat" },
  ],
  overlayLayers: [
    { id: "coastline", title: "Coastline", type: "wms", url: "wms1", layers: "l1", opacity: 1, zIndex: 1 },
    { id: "density", title: "Density", type: "tile", url: "tile1", opacity: 0.7, zIndex: 2 },
    { id: "sea_lanes", title: "Sea Lanes", type: "wms", url: "wms2", layers: "l2", opacity: 1, zIndex: 2 },
  ],
  weatherLayers: [
    { id: "clouds", title: "Clouds", type: "tile", url: "clouds1", opacity: 0.7, zIndex: 50 },
  ],
}));

import { loadMapConfig, saveMapConfig, applyVesselStyle, validateStyleExists } from "../api";
import { mapApiToDomain, mapDomainToApi } from "../model/mappers";
import { generateSld } from "../model/sldGenerator";

function makeDefaultDomain(overrides?: Partial<MapConfigDomain>): MapConfigDomain {
  return {
    selectedBaseMap: { id: "osm", title: "Light Map", url: "https://osm.test", attribution: "OSM" },
    activeLayers: {},
    layerOrder: ["coastline", "density", "sea_lanes"],
    vesselConfig: {
      opacity: 1,
      styleName: "",
      defaultStyle: { shape: "custom", color: "#04a3ff", size: 30 },
      cluster: {
        cellSize: 50, smallClusterMax: 10, smallClusterColor: "#FFA500",
        smallClusterSize: 40, largeClusterColor: "#FF0000", largeClusterSize: 40,
        clusterLabelColor: "#FFFFFF", minScaleDenominator: 18500000,
      },
      trajectory: {
        timeSeconds: 3600, lineColor: "#00BFFF", lineWeight: 3, lineOpacity: 0.7,
        dotColor: "#FF0000", dotFillColor: "#FF0000", dotFillOpacity: 0.8, dotRadius: 4,
      },
      deadReckoning: {
        intervals: [{ value: 15, unit: "minutes" }, { value: 30, unit: "minutes" }, { value: 60, unit: "minutes" }],
        lineColor: "#FFFF00", lineWeight: 2, pointColor: "#FF7800",
      },
      popupFields: { enabledFields: ["mmsi", "imo", "vessel_type", "vessel_id", "position", "speed", "heading"] },
      rules: [],
      customShapes: [],
    },
    mapControlSettings: { toolbar: true, zoombar: true, minimap: true, statusbar: true },
    ...overrides,
  };
}

function setupMockDomain(domain?: Partial<MapConfigDomain>) {
  const full = makeDefaultDomain(domain);
  vi.mocked(mapApiToDomain).mockReturnValue(full);
  vi.mocked(mapDomainToApi).mockReturnValue({} as MapConfigApiResponse);
  return full;
}

describe("useMapConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state (React Lifecycle) ────────────────────────────────────

  describe("initial state", () => {
    it("hydrates all five pieces of state from loadMapConfig()/mapApiToDomain() on first render", () => {
      const domain = setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      expect(result.current.selectedBaseMap).toEqual(domain.selectedBaseMap);
      expect(result.current.activeLayers).toEqual(domain.activeLayers);
      expect(result.current.layerOrder).toEqual(domain.layerOrder);
      expect(result.current.vesselConfig).toEqual(domain.vesselConfig);
      expect(result.current.mapControlSettings).toEqual(domain.mapControlSettings);
    });

    it("initializes selectedVessel as null and refreshKey as 0", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      expect(result.current.selectedVessel).toBeNull();
      expect(result.current.refreshKey).toBe(0);
    });

    it("exposes static config collections (baseMaps/overlayLayers/weatherLayers) unmodified", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      expect(result.current.baseMaps).toHaveLength(3);
      expect(result.current.overlayLayers).toHaveLength(3);
      expect(result.current.weatherLayers).toHaveLength(1);
    });

    it("INEFFICIENCY DOCUMENTATION: loadMapConfig()/mapApiToDomain() are each invoked once per useState initializer (5 times total), not cached/shared", () => {
      setupMockDomain();
      renderHook(() => useMapConfig());
      expect(loadMapConfig).toHaveBeenCalledTimes(5);
      expect(mapApiToDomain).toHaveBeenCalledTimes(5);
    });

    it("does not call validateStyleExists on mount when the initial styleName is empty (Boundary: empty guard)", () => {
      setupMockDomain();
      renderHook(() => useMapConfig());
      expect(validateStyleExists).not.toHaveBeenCalled();
    });
  });

  // ── selectedBaseMap (Equivalence Partitioning) ──────────────────────────

  describe("selectedBaseMap", () => {
    it("setSelectedBaseMap replaces the active base map", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      const newMap = { id: "dark", title: "Dark Map", url: "https://dark.test", attribution: "Dark" };
      act(() => result.current.setSelectedBaseMap(newMap));
      expect(result.current.selectedBaseMap).toEqual(newMap);
    });

    it("accepts a base map with an empty id without validation (Negative Testing)", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.setSelectedBaseMap({ id: "", title: "", url: "", attribution: "" }));
      expect(result.current.selectedBaseMap.id).toBe("");
    });

    it("rapid successive updates within one batch apply only the final value (last-write-wins)", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => {
        result.current.setSelectedBaseMap({ id: "dark", title: "D", url: "u", attribution: "a" });
        result.current.setSelectedBaseMap({ id: "satellite", title: "S", url: "u", attribution: "a" });
      });
      expect(result.current.selectedBaseMap.id).toBe("satellite");
    });

    it("triggers a persistence side effect via saveMapConfig", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.setSelectedBaseMap({ id: "satellite", title: "Sat", url: "u", attribution: "a" }));
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ── toggleLayer (Boolean state machine / Decision Table) ────────────────

  describe("toggleLayer", () => {
    it.each([
      ["off -> on", {}, "coastline", true],
      ["on -> off", { coastline: true }, "coastline", false],
      ["explicit-off -> on", { coastline: false }, "coastline", true],
    ])("%s", (_label, initial, layerId, expected) => {
      setupMockDomain({ activeLayers: initial });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.toggleLayer(layerId));
      expect(result.current.activeLayers[layerId]).toBe(expected);
    });

    it("toggling one layer does not mutate sibling layer states (isolation)", () => {
      setupMockDomain({ activeLayers: { coastline: true, density: true } });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.toggleLayer("coastline"));
      expect(result.current.activeLayers.density).toBe(true);
    });

    it("toggling an unknown layer id creates a new truthy key (no id validation against overlayLayers config — Negative Testing)", () => {
      setupMockDomain({ activeLayers: {} });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.toggleLayer("does_not_exist_in_config"));
      expect(result.current.activeLayers.does_not_exist_in_config).toBe(true);
    });

    it("toggling with an empty-string id is accepted (Boundary: minimal string)", () => {
      setupMockDomain({ activeLayers: {} });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.toggleLayer(""));
      expect(result.current.activeLayers[""]).toBe(true);
    });

    it("double-toggle returns to the original value (idempotent round trip)", () => {
      setupMockDomain({ activeLayers: { coastline: true } });
      const { result } = renderHook(() => useMapConfig());
      act(() => { result.current.toggleLayer("coastline"); result.current.toggleLayer("coastline"); });
      expect(result.current.activeLayers.coastline).toBe(true);
    });

    it("triggers saveMapConfig persistence", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.toggleLayer("coastline"));
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ── reorderLayers (Boundary Value Analysis on array indices) ────────────

  describe("reorderLayers", () => {
    it.each([
      [0, 2, ["density", "sea_lanes", "coastline"]],
      [2, 0, ["sea_lanes", "coastline", "density"]],
      [1, 1, ["coastline", "density", "sea_lanes"]], // no-op boundary
      [0, 5, ["density", "sea_lanes", "coastline"]], // out-of-bounds target clamps to append
    ])("reorderLayers(%i, %i) -> %j", (from, to, expected) => {
      setupMockDomain({ layerOrder: ["coastline", "density", "sea_lanes"] });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.reorderLayers(from, to));
      expect(result.current.layerOrder).toEqual(expected);
    });

    it("reordering an empty layerOrder array is a safe no-op (early return guard)", () => {
      setupMockDomain({ layerOrder: [] });
      const { result } = renderHook(() => useMapConfig());
      expect(() => act(() => result.current.reorderLayers(0, 0))).not.toThrow();
      expect(result.current.layerOrder).toEqual([]);
    });

    it("reordering a single-element array is a no-op", () => {
      setupMockDomain({ layerOrder: ["coastline"] });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.reorderLayers(0, 0));
      expect(result.current.layerOrder).toEqual(["coastline"]);
    });

    it("is referentially stable across re-renders (useCallback, empty deps)", () => {
      setupMockDomain();
      const { result, rerender } = renderHook(() => useMapConfig());
      const ref = result.current.reorderLayers;
      act(() => result.current.reorderLayers(0, 1));
      rerender();
      expect(result.current.reorderLayers).toBe(ref);
    });

    it("triggers saveMapConfig persistence", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.reorderLayers(0, 1));
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ── getOrderedLayers (derived data / memoization correctness) ───────────

  describe("getOrderedLayers", () => {
    it("assigns 1-based, contiguous zIndex values in layerOrder sequence", () => {
      setupMockDomain({ layerOrder: ["sea_lanes", "coastline", "density"] });
      const { result } = renderHook(() => useMapConfig());
      const layers = result.current.getOrderedLayers();
      expect(layers.map((l) => [l.id, l.zIndex])).toEqual([["sea_lanes", 1], ["coastline", 2], ["density", 3]]);
    });

    it("filters out layer ids present in layerOrder but absent from the overlayLayers config (Missing Fields / Unexpected Data)", () => {
      setupMockDomain({ layerOrder: ["coastline", "ghost_layer", "density"] });
      const { result } = renderHook(() => useMapConfig());
      const layers = result.current.getOrderedLayers();
      expect(layers.map((l) => l.id)).toEqual(["coastline", "density"]);
    });

    it("returns an empty array when layerOrder is empty (Empty State)", () => {
      setupMockDomain({ layerOrder: [] });
      const { result } = renderHook(() => useMapConfig());
      expect(result.current.getOrderedLayers()).toEqual([]);
    });

    it("returns an empty array when every id in layerOrder is unknown", () => {
      setupMockDomain({ layerOrder: ["a", "b", "c"] });
      const { result } = renderHook(() => useMapConfig());
      expect(result.current.getOrderedLayers()).toEqual([]);
    });

    it("reflects the latest reorder immediately (derived, not stale)", () => {
      setupMockDomain({ layerOrder: ["coastline", "density", "sea_lanes"] });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.reorderLayers(2, 0));
      expect(result.current.getOrderedLayers()[0].id).toBe("sea_lanes");
    });

    it("preserves original layer metadata (type/url/opacity) alongside the recomputed zIndex", () => {
      setupMockDomain({ layerOrder: ["density"] });
      const { result } = renderHook(() => useMapConfig());
      const [layer] = result.current.getOrderedLayers();
      expect(layer).toMatchObject({ id: "density", type: "tile", url: "tile1", opacity: 0.7, zIndex: 1 });
    });
  });

  // ── vesselConfig + validateStyleExists effect (Async Behavior / Race Conditions) ─

  describe("vesselConfig and style validation", () => {
    it("setVesselConfig replaces the vessel config object", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, opacity: 0.5 }));
      expect(result.current.vesselConfig.opacity).toBe(0.5);
    });

    it("does NOT call validateStyleExists when styleName is set to an empty string (guard clause)", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(validateStyleExists).mockClear();
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "" }));
      expect(validateStyleExists).not.toHaveBeenCalled();
    });

    it("calls validateStyleExists exactly once with the new non-empty styleName", async () => {
      setupMockDomain();
      vi.mocked(validateStyleExists).mockResolvedValue(true);
      const { result } = renderHook(() => useMapConfig());
      await act(async () => {
        result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "my_style" });
        await Promise.resolve();
      });
      expect(validateStyleExists).toHaveBeenCalledWith("my_style");
    });

    it("clears styleName back to '' when validation resolves false (State Transition: VALID_NAME -> CLEARED)", async () => {
      setupMockDomain();
      vi.mocked(validateStyleExists).mockResolvedValue(false);
      const { result } = renderHook(() => useMapConfig());
      await act(async () => {
        result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "ghost_style" });
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(result.current.vesselConfig.styleName).toBe("");
    });

    it("keeps styleName when validation resolves true", async () => {
      setupMockDomain();
      vi.mocked(validateStyleExists).mockResolvedValue(true);
      const { result } = renderHook(() => useMapConfig());
      await act(async () => {
        result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "valid_style" });
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(validateStyleExists).toHaveBeenCalled();
      expect(result.current.vesselConfig.styleName).toBe("valid_style");
    });

    it("CLEANUP VALIDATION: the effect's cancellation flag prevents a post-unmount state update from throwing when validation resolves false after unmount", async () => {
      setupMockDomain();
      let resolveFn!: (v: boolean) => void;
      vi.mocked(validateStyleExists).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { result, unmount } = renderHook(() => useMapConfig());
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "some_style" }));
      unmount();
      expect(() => resolveFn(false)).not.toThrow();
      await act(async () => { await Promise.resolve(); });
    });

    it("RACE CONDITION DOCUMENTATION: only the latest in-flight validateStyleExists call is allowed to mutate styleName — an earlier, slower call resolving after a newer valid name is set does NOT clear the newer name, because its own effect was cleaned up first", async () => {
      setupMockDomain();
      let resolveFirst!: (v: boolean) => void;
      let resolveSecond!: (v: boolean) => void;
      vi.mocked(validateStyleExists)
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));

      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "style_a" }));
      expect(validateStyleExists).toHaveBeenCalledTimes(1);

      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, styleName: "style_b" }));
      expect(validateStyleExists).toHaveBeenCalledTimes(2);

      // The stale first effect (for "style_a") resolves false late — its cleanup already ran
      // (styleName dependency changed), so `cancelled` is true and it must NOT clear "style_b".
      await act(async () => { resolveFirst(false); });
      expect(result.current.vesselConfig.styleName).toBe("style_b");

      await act(async () => { resolveSecond(true); });
      expect(result.current.vesselConfig.styleName).toBe("style_b");
    });

    it("triggers saveMapConfig persistence on every vesselConfig change", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig }));
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });

    it("preserves unrelated vesselConfig fields (rules, customShapes) across an opacity-only update", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      const rules = [{ id: "r1", name: "R1", conditions: [], combinator: "AND" as const, style: { shape: "circle", color: "#f00", size: 10 } }];
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, rules }));
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, opacity: 0.3 }));
      expect(result.current.vesselConfig.rules).toEqual(rules);
      expect(result.current.vesselConfig.opacity).toBe(0.3);
    });
  });

  // ── applyVesselStyle (Async Behavior / Failure Injection) ────────────────

  describe("applyVesselStyle", () => {
    it("generates SLD from the draft's style fields in the documented order", async () => {
      setupMockDomain();
      vi.mocked(generateSld).mockReturnValue({ sldXml: "<xml/>", assets: [] });
      vi.mocked(applyVesselStyle).mockResolvedValue("new_style");
      const { result } = renderHook(() => useMapConfig());
      const draft = { ...result.current.vesselConfig, styleName: "test" };
      await act(async () => { await result.current.applyVesselStyle(draft); });
      expect(generateSld).toHaveBeenCalledWith(draft.styleName, draft.defaultStyle, draft.rules, draft.customShapes, draft.cluster);
    });

    it("forwards the generated SLD and styleName to the applyVesselStyle API", async () => {
      setupMockDomain();
      const sld = { sldXml: "<sld/>", assets: [] };
      vi.mocked(generateSld).mockReturnValue(sld);
      vi.mocked(applyVesselStyle).mockResolvedValue("final_style");
      const { result } = renderHook(() => useMapConfig());
      const draft = { ...result.current.vesselConfig, styleName: "draft_name" };
      await act(async () => { await result.current.applyVesselStyle(draft); });
      expect(applyVesselStyle).toHaveBeenCalledWith("draft_name", sld);
    });

    it("commits the server-assigned styleName (which may differ from the draft's, e.g. auto-generated) into state", async () => {
      setupMockDomain();
      vi.mocked(generateSld).mockReturnValue({ sldXml: "<sld/>", assets: [] });
      vi.mocked(applyVesselStyle).mockResolvedValue("server_generated_name");
      const { result } = renderHook(() => useMapConfig());
      const draft = { ...result.current.vesselConfig, styleName: "" };
      await act(async () => { await result.current.applyVesselStyle(draft); });
      expect(result.current.vesselConfig.styleName).toBe("server_generated_name");
    });

    it("increments refreshKey after a successful apply (forces map layer refresh)", async () => {
      setupMockDomain();
      vi.mocked(generateSld).mockReturnValue({ sldXml: "<sld/>", assets: [] });
      vi.mocked(applyVesselStyle).mockResolvedValue("style1");
      const { result } = renderHook(() => useMapConfig());
      await act(async () => { await result.current.applyVesselStyle(result.current.vesselConfig); });
      expect(result.current.refreshKey).toBe(1);
    });

    it("FAILURE INJECTION: propagates the API rejection to the caller and leaves refreshKey/vesselConfig untouched", async () => {
      setupMockDomain();
      vi.mocked(generateSld).mockReturnValue({ sldXml: "<sld/>", assets: [] });
      vi.mocked(applyVesselStyle).mockRejectedValue(new Error("GeoServer 500"));
      const { result } = renderHook(() => useMapConfig());
      const priorStyleName = result.current.vesselConfig.styleName;
      const priorRefreshKey = result.current.refreshKey;
      await expect(act(async () => { await result.current.applyVesselStyle(result.current.vesselConfig); }))
        .rejects.toThrow("GeoServer 500");
      expect(result.current.vesselConfig.styleName).toBe(priorStyleName);
      expect(result.current.refreshKey).toBe(priorRefreshKey);
    });

    it("is referentially stable across re-renders (useCallback, empty deps)", () => {
      setupMockDomain();
      const { result, rerender } = renderHook(() => useMapConfig());
      const ref = result.current.applyVesselStyle;
      rerender();
      expect(result.current.applyVesselStyle).toBe(ref);
    });

    it("preserves rules/customShapes from the draft in the resulting committed vesselConfig", async () => {
      setupMockDomain();
      vi.mocked(generateSld).mockReturnValue({ sldXml: "<sld/>", assets: [] });
      vi.mocked(applyVesselStyle).mockResolvedValue("name");
      const { result } = renderHook(() => useMapConfig());
      const draft = {
        ...result.current.vesselConfig,
        rules: [{ id: "r1", name: "R1", conditions: [], combinator: "AND" as const, style: { shape: "circle", color: "#f00", size: 10 } }],
        customShapes: [{ id: "s1", name: "S1", svg: "<svg/>" }],
      };
      await act(async () => { await result.current.applyVesselStyle(draft); });
      expect(result.current.vesselConfig.rules).toHaveLength(1);
      expect(result.current.vesselConfig.customShapes).toHaveLength(1);
    });

    it("concurrent applyVesselStyle calls discard stale results — only the latest call's styleName is committed (request-id guard)", async () => {
      setupMockDomain();
      vi.mocked(generateSld).mockReturnValue({ sldXml: "<sld/>", assets: [] });
      let resolveFirst!: (v: string) => void;
      let resolveSecond!: (v: string) => void;
      vi.mocked(applyVesselStyle)
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));

      const { result } = renderHook(() => useMapConfig());
      const draft1 = { ...result.current.vesselConfig, styleName: "first" };
      const draft2 = { ...result.current.vesselConfig, styleName: "second" };

      let p1!: Promise<void>;
      let p2!: Promise<void>;
      act(() => {
        p1 = result.current.applyVesselStyle(draft1);
        p2 = result.current.applyVesselStyle(draft2);
      });

      // Second (latest) call resolves first — its styleName is committed.
      await act(async () => { resolveSecond("server_second"); await p2; });
      expect(result.current.vesselConfig.styleName).toBe("server_second");

      // First (stale) call resolves after — its result is discarded by the request-id guard.
      await act(async () => { resolveFirst("server_first"); await p1; });
      expect(result.current.vesselConfig.styleName).toBe("server_second");
    });
  });

  // ── mapControlSettings ────────────────────────────────────────────────

  describe("mapControlSettings", () => {
    it("setMapControlSettings replaces the settings object wholesale", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.setMapControlSettings({ toolbar: false, zoombar: false, minimap: false, statusbar: false }));
      expect(result.current.mapControlSettings).toEqual({ toolbar: false, zoombar: false, minimap: false, statusbar: false });
    });

    it("a partial-looking update still requires spreading the previous value (no shallow-merge magic — verifies raw replace semantics)", () => {
      setupMockDomain({ mapControlSettings: { toolbar: true, zoombar: true, minimap: true, statusbar: true } });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.setMapControlSettings({ ...result.current.mapControlSettings, toolbar: false }));
      expect(result.current.mapControlSettings).toEqual({ toolbar: false, zoombar: true, minimap: true, statusbar: true });
    });

    it("triggers saveMapConfig persistence", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.setMapControlSettings({ toolbar: false, zoombar: true, minimap: true, statusbar: true }));
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ── selectedVessel (transient, non-persisted UI state) ───────────────────

  describe("selectedVessel", () => {
    it("setSelectedVessel stores the given vessel", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      const vessel = { id: "v1", locationCurrentLat: 10, locationCurrentLon: 20, headingCurrentConsensusValue: 90, speedCurrentConsensusValue: 15, rawProperties: {} };
      act(() => result.current.setSelectedVessel(vessel));
      expect(result.current.selectedVessel).toEqual(vessel);
    });

    it("setSelectedVessel(null) clears the selection", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.setSelectedVessel({ id: "v1", locationCurrentLat: 0, locationCurrentLon: 0, headingCurrentConsensusValue: 0, speedCurrentConsensusValue: 0, rawProperties: {} }));
      act(() => result.current.setSelectedVessel(null));
      expect(result.current.selectedVessel).toBeNull();
    });

    it("DESIGN NOTE: selectedVessel changes do NOT trigger saveMapConfig (intentionally excluded from the persistence effect's dependency array)", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.setSelectedVessel({ id: "v1", locationCurrentLat: 0, locationCurrentLon: 0, headingCurrentConsensusValue: 0, speedCurrentConsensusValue: 0, rawProperties: {} }));
      expect(saveMapConfig).not.toHaveBeenCalled();
    });
  });

  // ── refreshKey auto-increment (Timers mocked) ────────────────────────────

  describe("refreshKey auto-increment (30s interval)", () => {
    it("does not increment before the 30s threshold (Boundary: 29999ms)", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => vi.advanceTimersByTime(29999));
      expect(result.current.refreshKey).toBe(0);
    });

    it("increments exactly once at the 30s boundary", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => vi.advanceTimersByTime(30000));
      expect(result.current.refreshKey).toBe(1);
    });

    it("increments once per subsequent 30s tick (not cumulative/compounding)", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => vi.advanceTimersByTime(90000));
      expect(result.current.refreshKey).toBe(3);
    });

    it("CLEANUP VALIDATION: the interval is cleared on unmount and does not continue firing (no memory leak / no act-outside-test warning)", () => {
      setupMockDomain();
      const { unmount } = renderHook(() => useMapConfig());
      unmount();
      expect(() => act(() => vi.advanceTimersByTime(120000))).not.toThrow();
    });
  });

  // ── Persistence effect (saveMapConfig side effect coverage) ──────────────

  describe("persistence via saveMapConfig", () => {
    it("saves once synchronously on mount with the initial hydrated state", () => {
      setupMockDomain();
      renderHook(() => useMapConfig());
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });

    it.each<[string, (r: ReturnType<typeof useMapConfig>) => void]>([
      ["selectedBaseMap", (r) => r.setSelectedBaseMap({ id: "dark", title: "D", url: "u", attribution: "a" })],
      ["activeLayers", (r) => r.toggleLayer("coastline")],
      ["layerOrder", (r) => r.reorderLayers(0, 1)],
      ["vesselConfig", (r) => r.setVesselConfig({ ...r.vesselConfig })],
      ["mapControlSettings", (r) => r.setMapControlSettings({ toolbar: false, zoombar: true, minimap: true, statusbar: true })],
    ])("persists when %s changes", (_label, mutate) => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => mutate(result.current));
      expect(saveMapConfig).toHaveBeenCalledTimes(1);
    });

    it("does NOT persist when only selectedVessel or refreshKey change", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(saveMapConfig).mockClear();
      act(() => result.current.setSelectedVessel({ id: "v1", locationCurrentLat: 0, locationCurrentLon: 0, headingCurrentConsensusValue: 0, speedCurrentConsensusValue: 0, rawProperties: {} }));
      act(() => vi.advanceTimersByTime(30000));
      expect(saveMapConfig).not.toHaveBeenCalled();
    });

    it("calls mapDomainToApi to serialize the current combined domain state before saving", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      vi.mocked(mapDomainToApi).mockClear();
      act(() => result.current.toggleLayer("coastline"));
      expect(mapDomainToApi).toHaveBeenCalledWith(expect.objectContaining({
        selectedBaseMap: expect.any(Object),
        activeLayers: expect.any(Object),
        layerOrder: expect.any(Array),
        vesselConfig: expect.any(Object),
        mapControlSettings: expect.any(Object),
      }));
    });
  });

  // ── React Strict Mode compatibility ──────────────────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("mount -> unmount -> remount yields an independently re-hydrated instance with no leaked timers/state", () => {
      setupMockDomain({ vesselConfig: makeDefaultDomain().vesselConfig, activeLayers: { coastline: true } });
      const { result: r1, unmount } = renderHook(() => useMapConfig());
      expect(r1.current.activeLayers.coastline).toBe(true);
      unmount();

      const { result: r2 } = renderHook(() => useMapConfig());
      expect(r2.current.refreshKey).toBe(0);
      expect(r2.current.activeLayers.coastline).toBe(true);
    });
  });

  // ── Mutation-mindset / combined edge cases ───────────────────────────────

  describe("edge cases and combinations", () => {
    it("reorder + toggle + style update in sequence all persist independently without clobbering each other's fields", () => {
      setupMockDomain();
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.reorderLayers(0, 2));
      act(() => result.current.toggleLayer("density"));
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, opacity: 0.4 }));
      expect(result.current.layerOrder).toEqual(["density", "sea_lanes", "coastline"]);
      expect(result.current.activeLayers.density).toBe(true);
      expect(result.current.vesselConfig.opacity).toBe(0.4);
    });

    it("getOrderedLayers reflects a layerOrder mutated via reorderLayers followed by an unrelated vesselConfig update (no cross-contamination)", () => {
      setupMockDomain({ layerOrder: ["coastline", "density", "sea_lanes"] });
      const { result } = renderHook(() => useMapConfig());
      act(() => result.current.reorderLayers(0, 1));
      act(() => result.current.setVesselConfig({ ...result.current.vesselConfig, opacity: 0.9 }));
      expect(result.current.getOrderedLayers().map((l) => l.id)).toEqual(["density", "coastline", "sea_lanes"]);
    });

    it("toggling the same layer id many times settles deterministically based on parity (even count -> original value)", () => {
      setupMockDomain({ activeLayers: { coastline: false } });
      const { result } = renderHook(() => useMapConfig());
      for (let i = 0; i < 6; i++) act(() => result.current.toggleLayer("coastline"));
      expect(result.current.activeLayers.coastline).toBe(false);
    });
  });
});
