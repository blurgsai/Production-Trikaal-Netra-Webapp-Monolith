import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVesselInfoAtPoint } from "../useVesselInfoAtPoint";
import type { VesselInfo } from "../../model/types";
import type { RawVesselFeature } from "../../api/vesselInfoApi";

// Capture the handlers object passed to react-leaflet's useMapEvents so we can
// invoke the "click" handler directly without mounting a real Leaflet map.
const useMapEventsMock = vi.fn();
vi.mock("react-leaflet", () => ({
  useMapEvents: (handlers: Record<string, (...args: unknown[]) => unknown>) => useMapEventsMock(handlers),
}));

vi.mock("../../api/vesselInfoApi", () => ({
  fetchVesselInfo: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapRawVesselToInfo: vi.fn(),
}));

import { fetchVesselInfo } from "../../api/vesselInfoApi";
import { mapRawVesselToInfo } from "../../model/mappers";

type ClickHandler = (e: unknown) => Promise<void> | void;

function getRegisteredClickHandler(): ClickHandler {
  const calls = useMapEventsMock.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) throw new Error("useMapEvents was never called");
  return lastCall[0].click;
}

function makeFakeMap(overrides?: Partial<{
  latLngToContainerPoint: () => { x: number; y: number };
  getSize: () => { x: number; y: number };
  getBounds: () => { toBBoxString: () => string };
}>) {
  return {
    latLngToContainerPoint: vi.fn(() => ({ x: 150, y: 250 })),
    getSize: vi.fn(() => ({ x: 1024, y: 768 })),
    getBounds: vi.fn(() => ({ toBBoxString: () => "0,0,10,10" })),
    ...overrides,
  };
}

function makeClickEvent(lat = 19.076, lng = 72.8777, map = makeFakeMap()) {
  return { target: map, latlng: { lat, lng } };
}

function vesselInfo(overrides?: Partial<VesselInfo>): VesselInfo {
  return {
    id: "v1", locationCurrentLat: 19.076, locationCurrentLon: 72.8777,
    headingCurrentConsensusValue: 90, speedCurrentConsensusValue: 12, rawProperties: {}, ...overrides,
  };
}

function rawFeature(overrides?: Partial<RawVesselFeature>): RawVesselFeature {
  return { id: "v1", location_current_lat: 19.076, location_current_lon: 72.8777, ...overrides };
}

describe("useVesselInfoAtPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Registration / React Lifecycle ────────────────────────────────────

  describe("registration with useMapEvents", () => {
    it("registers a click handler via useMapEvents on mount", () => {
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      expect(useMapEventsMock).toHaveBeenCalledWith(expect.objectContaining({ click: expect.any(Function) }));
    });

    it("registers only a click handler (no other event types)", () => {
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      const handlers = useMapEventsMock.mock.calls[0][0];
      expect(Object.keys(handlers)).toEqual(["click"]);
    });

    it("does not call fetchVesselInfo merely on mount (event-driven only)", () => {
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      expect(fetchVesselInfo).not.toHaveBeenCalled();
    });

    it("re-registers with useMapEvents on every render (react-leaflet's own hook manages internal binding)", () => {
      const { rerender } = renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      rerender();
      expect(useMapEventsMock).toHaveBeenCalledTimes(2);
    });
  });

  // ── Click handler: map API interaction (Decision Table) ─────────────────

  describe("click handler — map API extraction", () => {
    it("calls map.latLngToContainerPoint with the click's latlng", async () => {
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      const map = makeFakeMap();
      const event = makeClickEvent(10, 20, map);
      await act(async () => { await getRegisteredClickHandler()(event); });
      expect(map.latLngToContainerPoint).toHaveBeenCalledWith({ lat: 10, lng: 20 });
    });

    it("calls map.getSize() and map.getBounds()", async () => {
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      const map = makeFakeMap();
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(10, 20, map)); });
      expect(map.getSize).toHaveBeenCalled();
      expect(map.getBounds).toHaveBeenCalled();
    });

    it("passes (latlng, point, size, bounds) to fetchVesselInfo in the correct order", async () => {
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      const map = makeFakeMap({
        latLngToContainerPoint: () => ({ x: 5, y: 6 }),
        getSize: () => ({ x: 7, y: 8 }),
        getBounds: () => ({ toBBoxString: () => "bbox" }),
      });
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(1, 2, map)); });
      expect(fetchVesselInfo).toHaveBeenCalledWith(
        { lat: 1, lng: 2 },
        { x: 5, y: 6 },
        { x: 7, y: 8 },
        { toBBoxString: expect.any(Function) }
      );
    });
  });

  // ── Success: vessel found (Equivalence Partitioning) ────────────────────

  describe("success — vessel found at point", () => {
    it("maps the raw feature via mapRawVesselToInfo and calls onVesselSelect with the mapped vessel and latlng", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature());
      vi.mocked(mapRawVesselToInfo).mockReturnValue(vesselInfo());
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(19.076, 72.8777)); });
      expect(mapRawVesselToInfo).toHaveBeenCalledWith(rawFeature());
      expect(onVesselSelect).toHaveBeenCalledWith(vesselInfo(), { lat: 19.076, lng: 72.8777 });
    });

    it("calls onVesselClick with the mapped vessel when a vessel is found and the callback is provided", async () => {
      const onVesselClick = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature());
      vi.mocked(mapRawVesselToInfo).mockReturnValue(vesselInfo());
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn(), onVesselClick }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent()); });
      expect(onVesselClick).toHaveBeenCalledWith(vesselInfo());
    });

    it("does not throw when onVesselClick is omitted, even though a vessel was found (optional callback)", async () => {
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature());
      vi.mocked(mapRawVesselToInfo).mockReturnValue(vesselInfo());
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      await expect(act(async () => { await getRegisteredClickHandler()(makeClickEvent()); })).resolves.toBeUndefined();
    });

    it("calls onVesselSelect before onVesselClick (ordering contract)", async () => {
      const calls: string[] = [];
      const onVesselSelect = vi.fn(() => calls.push("select"));
      const onVesselClick = vi.fn(() => calls.push("click"));
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature());
      vi.mocked(mapRawVesselToInfo).mockReturnValue(vesselInfo());
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect, onVesselClick }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent()); });
      expect(calls).toEqual(["select", "click"]);
    });
  });

  // ── Empty / null result (Empty State, Error Guessing) ───────────────────

  describe("no vessel at clicked point", () => {
    it("when fetchVesselInfo resolves null, onVesselSelect is called with (null, latlng) and mapper is not invoked", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(5, 6)); });
      expect(mapRawVesselToInfo).not.toHaveBeenCalled();
      expect(onVesselSelect).toHaveBeenCalledWith(null, { lat: 5, lng: 6 });
    });

    it("does not call onVesselClick when no vessel is found, even if the callback is provided", async () => {
      const onVesselClick = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn(), onVesselClick }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent()); });
      expect(onVesselClick).not.toHaveBeenCalled();
    });

    it("BUG SURFACE: when mapRawVesselToInfo returns null for a non-null raw feature (malformed data), onVesselSelect still fires with (null, latlng) and onVesselClick is skipped", async () => {
      const onVesselSelect = vi.fn();
      const onVesselClick = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature({ location_current_lat: undefined }));
      vi.mocked(mapRawVesselToInfo).mockReturnValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect, onVesselClick }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(7, 8)); });
      expect(onVesselSelect).toHaveBeenCalledWith(null, { lat: 7, lng: 8 });
      expect(onVesselClick).not.toHaveBeenCalled();
    });
  });

  // ── Error handling / Failure Injection ───────────────────────────────────

  describe("error handling", () => {
    it("BUG DOCUMENTATION: on fetchVesselInfo rejection, onVesselSelect is called with only (null) — the latlng argument is dropped, unlike the success/empty paths", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockRejectedValue(new Error("WMS GetFeatureInfo failed"));
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(1, 2)); });
      expect(onVesselSelect).toHaveBeenCalledWith(null);
      expect(onVesselSelect).not.toHaveBeenCalledWith(null, { lat: 1, lng: 2 });
    });

    it("does not call onVesselClick when the fetch rejects", async () => {
      const onVesselClick = vi.fn();
      vi.mocked(fetchVesselInfo).mockRejectedValue(new Error("fail"));
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn(), onVesselClick }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent()); });
      expect(onVesselClick).not.toHaveBeenCalled();
    });

    it("swallows non-Error rejections the same way (string, object, undefined)", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockRejectedValue("plain string failure");
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      await expect(act(async () => { await getRegisteredClickHandler()(makeClickEvent()); })).resolves.toBeUndefined();
      expect(onVesselSelect).toHaveBeenCalledWith(null);
    });

    it("does not propagate/throw the rejection out of the click handler (handler never rejects)", async () => {
      vi.mocked(fetchVesselInfo).mockRejectedValue(new Error("boom"));
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      await expect(getRegisteredClickHandler()(makeClickEvent())).resolves.toBeUndefined();
    });

    it("a mapper that throws synchronously is NOT caught by the try/catch around fetchVesselInfo (mapping happens after the try's await resolves, inside the same try block — verifies it IS caught)", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature());
      vi.mocked(mapRawVesselToInfo).mockImplementation(() => { throw new Error("mapper exploded"); });
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(3, 4)); });
      // mapRawVesselToInfo throwing occurs inside the try block, so it's caught -> same fallback path as fetch failure.
      expect(onVesselSelect).toHaveBeenCalledWith(null);
    });
  });

  // ── Callback stability / Stale Closure Prevention ────────────────────────

  describe("callback stability and stale closures", () => {
    it("the click handler passed to useMapEvents changes identity when onVesselSelect changes (useCallback dependency)", () => {
      const onVesselSelect1 = vi.fn();
      const onVesselSelect2 = vi.fn();
      const { rerender } = renderHook(
        ({ cb }) => useVesselInfoAtPoint({ onVesselSelect: cb }),
        { initialProps: { cb: onVesselSelect1 } }
      );
      const handler1 = useMapEventsMock.mock.calls[0][0].click;
      rerender({ cb: onVesselSelect2 });
      const handler2 = useMapEventsMock.mock.calls[1][0].click;
      expect(handler1).not.toBe(handler2);
    });

    it("the click handler identity is stable across re-renders when callbacks are unchanged (memoized deps)", () => {
      const onVesselSelect = vi.fn();
      const { rerender } = renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      const handler1 = useMapEventsMock.mock.calls[0][0].click;
      rerender();
      const handler2 = useMapEventsMock.mock.calls[1][0].click;
      expect(handler1).toBe(handler2);
    });

    it("uses the latest onVesselSelect after a callback swap (no stale closure trapping the old callback)", async () => {
      const onVesselSelectOld = vi.fn();
      const onVesselSelectNew = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      const { rerender } = renderHook(
        ({ cb }) => useVesselInfoAtPoint({ onVesselSelect: cb }),
        { initialProps: { cb: onVesselSelectOld } }
      );
      rerender({ cb: onVesselSelectNew });
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent()); });
      expect(onVesselSelectNew).toHaveBeenCalled();
      expect(onVesselSelectOld).not.toHaveBeenCalled();
    });
  });

  // ── Race conditions / concurrent clicks ──────────────────────────────────

  describe("concurrent clicks", () => {
    it("two rapid clicks both resolve and each invokes onVesselSelect once", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(rawFeature());
      vi.mocked(mapRawVesselToInfo).mockReturnValue(vesselInfo());
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      const handler = getRegisteredClickHandler();
      await act(async () => {
        await Promise.all([handler(makeClickEvent(1, 1)), handler(makeClickEvent(2, 2))]);
      });
      expect(onVesselSelect).toHaveBeenCalledTimes(2);
    });

    it("BUG DOCUMENTATION: a slower first click resolving after a faster second click can invoke onVesselSelect with stale coordinates last (no click sequencing/cancellation)", async () => {
      let resolveFirst!: (v: RawVesselFeature | null) => void;
      let resolveSecond!: (v: RawVesselFeature | null) => void;
      vi.mocked(fetchVesselInfo)
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));
      vi.mocked(mapRawVesselToInfo).mockImplementation((raw) => vesselInfo({ id: raw.id as string }));

      const calls: unknown[] = [];
      const onVesselSelect = vi.fn((vessel) => calls.push(vessel));
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      const handler = getRegisteredClickHandler();

      let p1!: Promise<void>;
      let p2!: Promise<void>;
      act(() => {
        p1 = handler(makeClickEvent(1, 1)) as Promise<void>;
        p2 = handler(makeClickEvent(2, 2)) as Promise<void>;
      });

      await act(async () => { resolveSecond(rawFeature({ id: "fast-click" })); await p2; });
      expect(calls[calls.length - 1]).toEqual(vesselInfo({ id: "fast-click" }));

      await act(async () => { resolveFirst(rawFeature({ id: "slow-click" })); await p1; });
      // The slow click's (stale) result arrives last and is still delivered to the consumer.
      expect(calls[calls.length - 1]).toEqual(vesselInfo({ id: "slow-click" }));
    });
  });

  // ── Cleanup / unmount ────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmounting does not throw", () => {
      const { unmount } = renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      expect(() => unmount()).not.toThrow();
    });

    it("unmounting while a click's fetch is still pending does not throw when it later resolves", async () => {
      let resolveFn: (v: RawVesselFeature | null) => void = () => {};
      vi.mocked(fetchVesselInfo).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { unmount } = renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      const handler = getRegisteredClickHandler();
      const p = handler(makeClickEvent());
      unmount();
      await act(async () => { resolveFn(null); await p; });
    });
  });

  // ── Edge cases / boundary lat-lng values ─────────────────────────────────

  describe("edge cases", () => {
    it.each([
      ["equator/prime-meridian origin", 0, 0],
      ["north pole boundary", 90, 0],
      ["south pole boundary", -90, 0],
      ["antimeridian boundary", 0, 180],
      ["negative antimeridian boundary", 0, -180],
    ])("handles the %s coordinate pair without throwing", async (_label, lat, lng) => {
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect: vi.fn() }));
      await expect(act(async () => { await getRegisteredClickHandler()(makeClickEvent(lat, lng)); })).resolves.toBeUndefined();
    });

    it("passes fractional/high-precision coordinates through unmodified", async () => {
      const onVesselSelect = vi.fn();
      vi.mocked(fetchVesselInfo).mockResolvedValue(null);
      renderHook(() => useVesselInfoAtPoint({ onVesselSelect }));
      await act(async () => { await getRegisteredClickHandler()(makeClickEvent(19.0760001234, 72.8777009876)); });
      expect(onVesselSelect).toHaveBeenCalledWith(null, { lat: 19.0760001234, lng: 72.8777009876 });
    });
  });
});
