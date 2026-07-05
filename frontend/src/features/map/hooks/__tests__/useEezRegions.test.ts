import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useEezRegions } from "../useEezRegions";
import type { EezRegionApi } from "../../api/eezRegionsApi";

vi.mock("../../api/eezRegionsApi", () => ({
  fetchEezRegions: vi.fn(),
}));

vi.mock("../../model/mappers", () => ({
  mapEezRegionFromApi: vi.fn(),
}));

import { fetchEezRegions } from "../../api/eezRegionsApi";
import { mapEezRegionFromApi } from "../../model/mappers";

function apiRegion(id: string, name: string, bounds: [number, number, number, number] = [0, 0, 1, 1]): EezRegionApi {
  return { id, name, bounds };
}

describe("useEezRegions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mapEezRegionFromApi).mockImplementation((raw) => ({ id: raw.id, name: raw.name, bounds: raw.bounds }));
  });

  // ── Initial state ────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("initializes regions as empty array", () => {
      vi.mocked(fetchEezRegions).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useEezRegions());
      expect(result.current.regions).toEqual([]);
    });

    it("becomes loading=true once mount effect runs", async () => {
      vi.mocked(fetchEezRegions).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(true));
    });

    it("initializes error as empty string", () => {
      vi.mocked(fetchEezRegions).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useEezRegions());
      expect(result.current.error).toBe("");
    });

    it("fetches exactly once on mount", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      renderHook(() => useEezRegions());
      await waitFor(() => expect(fetchEezRegions).toHaveBeenCalledTimes(1));
    });

    it("exposes refresh as a function", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { result } = renderHook(() => useEezRegions());
      expect(typeof result.current.refresh).toBe("function");
      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  // ── Success ──────────────────────────────────────────────────────────────

  describe("success state", () => {
    it("maps each raw region via mapEezRegionFromApi", async () => {
      const raw = [apiRegion("r1", "Region 1"), apiRegion("r2", "Region 2")];
      vi.mocked(fetchEezRegions).mockResolvedValue(raw);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mapEezRegionFromApi).toHaveBeenCalledTimes(2);
      expect(result.current.regions).toEqual([
        { id: "r1", name: "Region 1", bounds: [0, 0, 1, 1] },
        { id: "r2", name: "Region 2", bounds: [0, 0, 1, 1] },
      ]);
    });

    it("handles empty region list (Empty State)", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.regions).toEqual([]);
      expect(result.current.error).toBe("");
    });

    it("handles a single region (Boundary Value)", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("only", "Only Region")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions).toHaveLength(1));
    });

    it("handles a large region list (300+)", async () => {
      const raw = Array.from({ length: 300 }, (_, i) => apiRegion(`r${i}`, `Region ${i}`));
      vi.mocked(fetchEezRegions).mockResolvedValue(raw);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions).toHaveLength(300));
    });

    it("preserves bounds tuple shape and precision", async () => {
      const bounds: [number, number, number, number] = [-179.999999, -89.999999, 179.999999, 89.999999];
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Extreme", bounds)]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].bounds).toEqual(bounds));
    });

    it("clears a previous error after a successful refresh (ERROR -> SUCCESS transition)", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValueOnce(new Error("network fail"));
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("network fail"));

      vi.mocked(fetchEezRegions).mockResolvedValueOnce([apiRegion("r1", "Region 1")]);
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
      expect(result.current.regions).toHaveLength(1);
    });

    it("sets loading false after success", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "R")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("handles duplicate ids in the payload without deduping (documents pass-through behavior)", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("dup", "A"), apiRegion("dup", "B")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions).toHaveLength(2));
    });
  });

  // ── Error handling ───────────────────────────────────────────────────────

  describe("error state", () => {
    it("uses the thrown Error's message when available", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(new Error("Failed to load EEZ regions: 404 Not Found"));
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions: 404 Not Found"));
    });

    it("falls back to a generic message for non-Error rejections", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue("plain string");
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions"));
    });

    it("falls back to generic message for undefined rejection", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(undefined);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions"));
    });

    it("falls back to generic message for a rejected plain object", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue({ status: 500 });
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions"));
    });

    it("sets loading false after failure", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("retains prior successful regions after a subsequent failed refresh", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValueOnce([apiRegion("r1", "R1")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions).toHaveLength(1));

      vi.mocked(fetchEezRegions).mockRejectedValueOnce(new Error("refresh failed"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("refresh failed");
      expect(result.current.regions).toHaveLength(1);
    });

    it("handles the mapper throwing (Failure Injection)", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "R1")]);
      vi.mocked(mapEezRegionFromApi).mockImplementation(() => { throw new Error("bad bounds"); });
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("bad bounds"));
    });

    it("recovers across repeated failure -> failure -> success cycle", async () => {
      vi.mocked(fetchEezRegions)
        .mockRejectedValueOnce(new Error("e1"))
        .mockRejectedValueOnce(new Error("e2"))
        .mockResolvedValueOnce([apiRegion("r1", "R1")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("e1"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("e2");
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
      expect(result.current.regions).toHaveLength(1);
    });
  });

  // ── refresh callback semantics ───────────────────────────────────────────

  describe("refresh", () => {
    it("refresh is memoized/stable across renders", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { result, rerender } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender();
      expect(result.current.refresh).toBe(ref1);
    });

    it("calling refresh triggers another network call", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(fetchEezRegions).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      expect(fetchEezRegions).toHaveBeenCalledTimes(2);
    });

    it("sets loading true synchronously when refresh starts", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValueOnce([]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let resolveFn!: (v: EezRegionApi[]) => void;
      vi.mocked(fetchEezRegions).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.loading).toBe(true);
      await act(async () => { resolveFn([]); await p; });
      expect(result.current.loading).toBe(false);
    });

    it("concurrent refresh invocations resolve safely without throwing", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "R1")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await Promise.all([result.current.refresh(), result.current.refresh(), result.current.refresh()]);
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── Cleanup / unmount ────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmounting while fetch is pending does not throw", async () => {
      let resolveFn: (v: EezRegionApi[]) => void = () => {};
      vi.mocked(fetchEezRegions).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { unmount } = renderHook(() => useEezRegions());
      expect(() => unmount()).not.toThrow();
      await act(async () => {
        resolveFn([]);
        await Promise.resolve();
      });
    });

    it("unmounting while fetch is about to reject does not throw or trigger unhandled rejection crash", async () => {
      let rejectFn: (e: unknown) => void = () => {};
      vi.mocked(fetchEezRegions).mockImplementation(() => new Promise((_res, rej) => { rejectFn = rej; }));
      const { unmount } = renderHook(() => useEezRegions());
      unmount();
      await act(async () => {
        rejectFn(new Error("late"));
        await Promise.resolve().catch(() => {});
      });
    });

    it("does not re-fetch merely due to re-renders", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { rerender } = renderHook(() => useEezRegions());
      await waitFor(() => expect(fetchEezRegions).toHaveBeenCalledTimes(1));
      rerender();
      rerender();
      expect(fetchEezRegions).toHaveBeenCalledTimes(1);
    });
  });

  // ── Unexpected / malformed data ──────────────────────────────────────────

  describe("unexpected data shapes", () => {
    it("handles a region with an empty bounds-adjacent id", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("", "No Id")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].id).toBe(""));
    });

    it("handles a region with an empty name", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].name).toBe(""));
    });

    it("handles bounds containing zeros for all four values", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Zero", [0, 0, 0, 0])]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].bounds).toEqual([0, 0, 0, 0]));
    });

    it("handles bounds with inverted min/max (data integrity not enforced by hook)", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Inverted", [10, 10, -10, -10])]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].bounds).toEqual([10, 10, -10, -10]));
    });
  });

  // ── React Strict Mode ────────────────────────────────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("mount/unmount/remount cycle produces consistent final state", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "R1")]);
      const { result: r1, unmount } = renderHook(() => useEezRegions());
      await waitFor(() => expect(r1.current.loading).toBe(false));
      unmount();

      const { result: r2 } = renderHook(() => useEezRegions());
      await waitFor(() => expect(r2.current.loading).toBe(false));
      expect(r2.current.regions).toEqual([{ id: "r1", name: "R1", bounds: [0, 0, 1, 1] }]);
    });
  });

  // ── Additional edge cases / State Transition / Error Guessing ────────────

  describe("additional edge cases", () => {
    it("return object has exactly the expected keys", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(Object.keys(result.current).sort()).toEqual(["error", "loading", "refresh", "regions"]);
    });

    it("regions are replaced (not appended) on a subsequent successful load", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValueOnce([apiRegion("r1", "R1"), apiRegion("r2", "R2")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions).toHaveLength(2));
      vi.mocked(fetchEezRegions).mockResolvedValueOnce([apiRegion("r3", "R3")]);
      await act(async () => { await result.current.refresh(); });
      expect(result.current.regions).toEqual([{ id: "r3", name: "R3", bounds: [0, 0, 1, 1] }]);
    });

    it("error is cleared at the start of a new load (before resolution)", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("fail"));
      let resolveFn!: (v: EezRegionApi[]) => void;
      vi.mocked(fetchEezRegions).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.error).toBe("");
      await act(async () => { resolveFn([]); await p; });
    });

    it("handles an Error with an empty message (falls to Error.message which is empty string)", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(new Error(""));
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe(""));
    });

    it("handles a rejection with a number", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(42);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions"));
    });

    it("handles a rejection with null", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(null);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions"));
    });

    it("handles a rejection with a boolean", async () => {
      vi.mocked(fetchEezRegions).mockRejectedValue(true);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.error).toBe("Failed to load EEZ regions"));
    });

    it("handles a mapper returning null for a valid region (defensive)", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "R1")]);
      vi.mocked(mapEezRegionFromApi).mockReturnValue(null as unknown as { id: string; name: string; bounds: [number, number, number, number] });
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.regions).toEqual([null]);
    });

    it("handles a mapper returning undefined for a valid region", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "R1")]);
      vi.mocked(mapEezRegionFromApi).mockReturnValue(undefined as unknown as { id: string; name: string; bounds: [number, number, number, number] });
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.regions).toEqual([undefined]);
    });

    it("multiple sequential refreshes each trigger a separate API call", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(fetchEezRegions).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      await act(async () => { await result.current.refresh(); });
      expect(fetchEezRegions).toHaveBeenCalledTimes(3);
    });

    it("loading is true while a refresh is pending, then false after resolution", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValueOnce([]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      let resolveFn!: (v: EezRegionApi[]) => void;
      vi.mocked(fetchEezRegions).mockImplementationOnce(() => new Promise((r) => { resolveFn = r; }));
      let p!: Promise<void>;
      act(() => { p = result.current.refresh(); });
      expect(result.current.loading).toBe(true);
      await act(async () => { resolveFn([]); await p; });
      expect(result.current.loading).toBe(false);
    });

    it("handles region with very long name (500 chars)", async () => {
      const longName = "A".repeat(500);
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", longName)]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].name).toBe(longName));
    });

    it("handles region with special characters in name", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Region's \"Special\" <Name>")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].name).toBe("Region's \"Special\" <Name>"));
    });

    it("handles region with unicode name", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "海域")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].name).toBe("海域"));
    });

    it("handles bounds with extreme negative values", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Extreme", [-180, -90, -0.000001, -0.000001])]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].bounds).toEqual([-180, -90, -0.000001, -0.000001]));
    });

    it("handles bounds with extreme positive values", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Extreme", [0.000001, 0.000001, 180, 90])]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions[0].bounds).toEqual([0.000001, 0.000001, 180, 90]));
    });

    it("handles a mixed list of valid and empty-name regions", async () => {
      vi.mocked(fetchEezRegions).mockResolvedValue([apiRegion("r1", "Valid"), apiRegion("r2", ""), apiRegion("r3", "Also Valid")]);
      const { result } = renderHook(() => useEezRegions());
      await waitFor(() => expect(result.current.regions.map((r) => r.name)).toEqual(["Valid", "", "Also Valid"]));
    });
  });
});
