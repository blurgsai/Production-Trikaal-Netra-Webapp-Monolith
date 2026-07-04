import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVesselTrajectory } from "./useVesselTrajectory";
import type { FetchTrajectoryParams } from "../api/trajectoryApi";
import type { TrajectoryResponseApi } from "../api/types";

vi.mock("../api", () => ({
  fetchVesselTrajectory: vi.fn(),
}));

import { fetchVesselTrajectory } from "../api";

function makeParams(overrides?: Partial<FetchTrajectoryParams>): FetchTrajectoryParams {
  return { vesselId: "vessel-1", lat: 19.076, lon: 72.8777, heading: 90, speed: 12.5, timeSeconds: 3600, ...overrides };
}

function response(count: number, seed = 0): TrajectoryResponseApi {
  return {
    trajectory: Array.from({ length: count }, (_, i) => ({
      lat: 19.076 + (seed + i) * 0.001,
      lng: 72.8777 + (seed + i) * 0.001,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
    })),
  };
}

describe("useVesselTrajectory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state (React Lifecycle) ───────────────────────────────────

  describe("initial state", () => {
    it("initializes trajectory as an empty array", () => {
      const { result } = renderHook(() => useVesselTrajectory());
      expect(result.current.trajectory).toEqual([]);
    });

    it("initializes loading as false (imperative hook, no auto-fetch)", () => {
      const { result } = renderHook(() => useVesselTrajectory());
      expect(result.current.loading).toBe(false);
    });

    it("initializes error as empty string", () => {
      const { result } = renderHook(() => useVesselTrajectory());
      expect(result.current.error).toBe("");
    });

    it("does not call the API merely on mount (imperative-only contract)", () => {
      renderHook(() => useVesselTrajectory());
      expect(fetchVesselTrajectory).not.toHaveBeenCalled();
    });

    it("does not call the API on re-render without invoking load", () => {
      const { rerender } = renderHook(() => useVesselTrajectory());
      rerender();
      rerender();
      expect(fetchVesselTrajectory).not.toHaveBeenCalled();
    });
  });

  // ── vesselId guard (Decision Table) ───────────────────────────────────

  describe("load() vesselId guard", () => {
    it.each([
      ["empty string", ""],
      ["undefined", undefined as unknown as string],
      ["null", null as unknown as string],
    ])("does not call the API when vesselId is %s", async (_label, vesselId) => {
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams({ vesselId })); });
      expect(fetchVesselTrajectory).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("");
    });

    it("proceeds for a normal non-empty vesselId", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams({ vesselId: "v1" })); });
      expect(fetchVesselTrajectory).toHaveBeenCalledTimes(1);
    });

    it("proceeds for vesselId '0' (truthy string boundary)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams({ vesselId: "0" })); });
      expect(fetchVesselTrajectory).toHaveBeenCalled();
    });

    it("proceeds for whitespace-only vesselId (truthy, no trimming performed)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams({ vesselId: "   " })); });
      expect(fetchVesselTrajectory).toHaveBeenCalled();
    });
  });

  // ── Success (Equivalence Partitioning / Boundary Value Analysis) ──────

  describe("success state", () => {
    it("loading transitions false -> true -> false around a successful load", async () => {
      let resolveFn!: (v: TrajectoryResponseApi) => void;
      vi.mocked(fetchVesselTrajectory).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { result } = renderHook(() => useVesselTrajectory());
      let p!: Promise<void>;
      act(() => { p = result.current.load(makeParams()); });
      expect(result.current.loading).toBe(true);
      await act(async () => { resolveFn(response(3)); await p; });
      expect(result.current.loading).toBe(false);
    });

    it("stores mapped trajectory points on success", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(4));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(4);
    });

    it("clears prior error on a new successful load (ERROR -> SUCCESS transition)", async () => {
      vi.mocked(fetchVesselTrajectory).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.error).toBe("Failed to load trajectory");

      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce(response(2));
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.error).toBe("");
    });

    it("empty trajectory array in response yields empty state (Empty State)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue({ trajectory: [] });
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toEqual([]);
      expect(result.current.error).toBe("");
    });

    it("null/undefined trajectory field falls back to empty array (nullish coalescing, Missing Fields)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce({ trajectory: undefined as unknown as [] });
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toEqual([]);

      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce({ trajectory: null as unknown as [] });
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toEqual([]);
    });

    it("single-point trajectory (Boundary Value: minimum non-empty)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(1);
    });

    it("very large trajectory (Large Dataset, 500 points)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(500));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(500);
    });

    it("duplicate points are preserved without deduplication (Duplicate Data)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue({
        trajectory: [
          { lat: 1, lng: 1, timestamp: "t1" },
          { lat: 1, lng: 1, timestamp: "t1" },
        ],
      });
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(2);
    });

    it("passes params through to the API call verbatim", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      const params = makeParams({ lat: -33.86, lon: 151.2, heading: 270, speed: 0 });
      await act(async () => { await result.current.load(params); });
      expect(fetchVesselTrajectory).toHaveBeenCalledWith(params);
    });

    it("boundary heading values (0 and 360) are passed through unmodified", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams({ heading: 0 })); });
      await act(async () => { await result.current.load(makeParams({ heading: 360 })); });
      expect(fetchVesselTrajectory).toHaveBeenNthCalledWith(1, expect.objectContaining({ heading: 0 }));
      expect(fetchVesselTrajectory).toHaveBeenNthCalledWith(2, expect.objectContaining({ heading: 360 }));
    });

    it("replaces (not merges/appends) previous trajectory on a subsequent successful load", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce(response(5));
      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce(response(2));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(5);
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(2);
    });
  });

  // ── Error / Negative / Failure Injection ──────────────────────────────

  describe("error state", () => {
    it("sets a generic error message on rejection (does not leak original error text)", async () => {
      vi.mocked(fetchVesselTrajectory).mockRejectedValue(new Error("upstream 500"));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.error).toBe("Failed to load trajectory");
    });

    it("clears trajectory on failure even if previous data existed (state overwritten, not preserved)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce(response(5));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(5);

      vi.mocked(fetchVesselTrajectory).mockRejectedValueOnce(new Error("fail"));
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toEqual([]);
    });

    it("sets loading false after an error (finally block executes)", async () => {
      vi.mocked(fetchVesselTrajectory).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.loading).toBe(false);
    });

    it.each([
      ["string", "plain string error"],
      ["undefined", undefined],
      ["null", null],
      ["plain object", { code: 500 }],
      ["number", 42],
    ])("normalizes a %s rejection to the same generic error message", async (_label, rejection) => {
      vi.mocked(fetchVesselTrajectory).mockRejectedValue(rejection);
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.error).toBe("Failed to load trajectory");
    });
  });

  // ── clear() ────────────────────────────────────────────────────────────

  describe("clear", () => {
    it("resets trajectory to an empty array", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(3));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      act(() => result.current.clear());
      expect(result.current.trajectory).toEqual([]);
    });

    it("resets error to empty string", async () => {
      vi.mocked(fetchVesselTrajectory).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      act(() => result.current.clear());
      expect(result.current.error).toBe("");
    });

    it("does not touch the loading flag (clear is a synchronous, non-async reset)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      act(() => result.current.clear());
      expect(result.current.loading).toBe(false);
    });

    it("is idempotent — calling clear repeatedly on empty state is a no-op", () => {
      const { result } = renderHook(() => useVesselTrajectory());
      act(() => { result.current.clear(); result.current.clear(); });
      expect(result.current.trajectory).toEqual([]);
      expect(result.current.error).toBe("");
    });

    it("clear followed by a fresh load produces the newly loaded data (no residual state)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce(response(3));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      act(() => result.current.clear());
      vi.mocked(fetchVesselTrajectory).mockResolvedValueOnce(response(7));
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toHaveLength(7);
    });
  });

  // ── Callback stability / Memoization correctness ───────────────────────

  describe("callback stability", () => {
    it("load is referentially stable across re-renders (useCallback with empty deps)", () => {
      const { result, rerender } = renderHook(() => useVesselTrajectory());
      const ref = result.current.load;
      rerender();
      rerender();
      expect(result.current.load).toBe(ref);
    });

    it("clear is referentially stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useVesselTrajectory());
      const ref = result.current.clear;
      rerender();
      expect(result.current.clear).toBe(ref);
    });

    it("load remains stable even after being invoked (no dependency on internal state)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      const ref1 = result.current.load;
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.load).toBe(ref1);
    });
  });

  // ── Race Condition Analysis / Stale Closure Prevention ─────────────────

  describe("race conditions and concurrent requests", () => {
    it("BUG DOCUMENTATION: a slow first request resolving after a fast second request overwrites fresher data (no request-id guard, no AbortController)", async () => {
      let resolveFirst!: (v: TrajectoryResponseApi) => void;
      let resolveSecond!: (v: TrajectoryResponseApi) => void;
      vi.mocked(fetchVesselTrajectory)
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; }));

      const { result } = renderHook(() => useVesselTrajectory());
      let p1!: Promise<void>;
      let p2!: Promise<void>;
      act(() => {
        p1 = result.current.load(makeParams({ vesselId: "slow" }));
        p2 = result.current.load(makeParams({ vesselId: "fast" }));
      });

      // Fast (second) request wins the race and resolves first.
      await act(async () => { resolveSecond(response(2, 100)); await p2; });
      expect(result.current.trajectory).toHaveLength(2);

      // Slow (first, stale) request resolves after — clobbers the fresher "fast" data.
      await act(async () => { resolveFirst(response(9, 1)); await p1; });
      expect(result.current.trajectory).toHaveLength(9);
    });

    it("multiple concurrent load() calls all settle without throwing (Promise.all)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(2));
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => {
        await Promise.all([
          result.current.load(makeParams({ vesselId: "v1" })),
          result.current.load(makeParams({ vesselId: "v2" })),
          result.current.load(makeParams({ vesselId: "v3" })),
        ]);
      });
      expect(result.current.loading).toBe(false);
    });

    it("loading flag reflects the last-settled call, not necessarily the last-invoked call", async () => {
      let resolveFirst!: (v: TrajectoryResponseApi) => void;
      vi.mocked(fetchVesselTrajectory)
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
        .mockResolvedValueOnce(response(1));

      const { result } = renderHook(() => useVesselTrajectory());
      let p1!: Promise<void>;
      let p2!: Promise<void>;
      act(() => {
        p1 = result.current.load(makeParams({ vesselId: "slow" }));
        p2 = result.current.load(makeParams({ vesselId: "fast" }));
      });
      await act(async () => { await p2; });
      // fast call's finally sets loading=false first...
      expect(result.current.loading).toBe(false);
      await act(async () => { resolveFirst(response(1)); await p1; });
      // ...then slow call's finally also sets loading=false (idempotent, no flicker back to true).
      expect(result.current.loading).toBe(false);
    });

    it("BUG DOCUMENTATION: a still-pending call's later rejection clobbers state already set by an earlier-resolved concurrent call", async () => {
      let rejectFirst!: (e: unknown) => void;
      vi.mocked(fetchVesselTrajectory)
        .mockImplementationOnce(() => new Promise((_r, rej) => { rejectFirst = rej; }))
        .mockResolvedValueOnce(response(3));

      const { result } = renderHook(() => useVesselTrajectory());
      let p1!: Promise<void>;
      let p2!: Promise<void>;
      await act(async () => {
        p1 = result.current.load(makeParams({ vesselId: "bad" }));
        p2 = result.current.load(makeParams({ vesselId: "good" }));
        await p2;
      });
      // The already-resolved "good" call applied its data first.
      expect(result.current.trajectory).toHaveLength(3);

      // The still-pending "bad" call rejects afterward and its catch handler unconditionally
      // clears trajectory/sets error — overwriting the good, already-applied data. There is no
      // request-id/AbortController guard preventing a stale in-flight call from stomping on newer state.
      await act(async () => { rejectFirst(new Error("bad request")); await p1; });
      expect(result.current.error).toBe("Failed to load trajectory");
      expect(result.current.trajectory).toEqual([]);
    });
  });

  // ── Cleanup Validation (unmount safety) ─────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmounting while a load() promise is pending does not throw synchronously", async () => {
      let resolveFn: (v: TrajectoryResponseApi) => void = () => {};
      vi.mocked(fetchVesselTrajectory).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { result, unmount } = renderHook(() => useVesselTrajectory());
      let p!: Promise<void>;
      act(() => { p = result.current.load(makeParams()); });
      expect(() => unmount()).not.toThrow();
      await act(async () => { resolveFn(response(1)); await p; });
    });

    it("unmounting while a load() promise is about to reject does not throw or crash the process (no unhandled rejection)", async () => {
      let rejectFn: (e: unknown) => void = () => {};
      vi.mocked(fetchVesselTrajectory).mockImplementation(() => new Promise((_r, rej) => { rejectFn = rej; }));
      const { result, unmount } = renderHook(() => useVesselTrajectory());
      let p!: Promise<void>;
      act(() => { p = result.current.load(makeParams()); });
      unmount();
      await act(async () => {
        rejectFn(new Error("late failure"));
        await p.catch(() => {});
      });
    });
  });

  // ── React Strict Mode compatibility ──────────────────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("mount -> unmount -> remount yields a fresh, independent hook instance with no leaked state", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(3));
      const { result: r1, unmount } = renderHook(() => useVesselTrajectory());
      await act(async () => { await r1.current.load(makeParams()); });
      expect(r1.current.trajectory).toHaveLength(3);
      unmount();

      const { result: r2 } = renderHook(() => useVesselTrajectory());
      expect(r2.current.trajectory).toEqual([]);
    });
  });

  // ── Unexpected data / Mutation-mindset edge cases ────────────────────────

  describe("unexpected data and mutation-mindset checks", () => {
    it("negative latitude/longitude boundary values are stored verbatim", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue({
        trajectory: [{ lat: -90, lng: -180, timestamp: "t" }],
      });
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory[0]).toEqual({ lat: -90, lng: -180, timestamp: "t" });
    });

    it("extreme positive latitude/longitude boundary values are stored verbatim", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue({
        trajectory: [{ lat: 90, lng: 180, timestamp: "t" }],
      });
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory[0]).toEqual({ lat: 90, lng: 180, timestamp: "t" });
    });

    it("does not mutate the array reference returned by the API (referential integrity check)", async () => {
      const raw = response(2);
      const originalArray = raw.trajectory;
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(raw);
      const { result } = renderHook(() => useVesselTrajectory());
      await act(async () => { await result.current.load(makeParams()); });
      expect(result.current.trajectory).toBe(originalArray);
    });

    it("a second call with identical params still triggers a fresh network call (no implicit caching)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      const params = makeParams();
      await act(async () => { await result.current.load(params); });
      await act(async () => { await result.current.load(params); });
      expect(fetchVesselTrajectory).toHaveBeenCalledTimes(2);
    });

    it("timeSeconds omitted entirely is passed through as undefined (hook does not default it)", async () => {
      vi.mocked(fetchVesselTrajectory).mockResolvedValue(response(1));
      const { result } = renderHook(() => useVesselTrajectory());
      const { timeSeconds: _omit, ...rest } = makeParams();
      await act(async () => { await result.current.load(rest); });
      expect(fetchVesselTrajectory).toHaveBeenCalledWith(rest);
    });
  });
});
