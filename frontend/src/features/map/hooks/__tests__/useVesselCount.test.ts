import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselCount } from "../useVesselCount";
import type { VesselCountCategory } from "../../model/types";

vi.mock("../../api", () => ({
  fetchVesselCount: vi.fn(),
  fetchVesselCategoryCounts: vi.fn(),
}));

import { fetchVesselCount, fetchVesselCategoryCounts } from "../../api";

function categories(...pairs: [string, number][]): VesselCountCategory[] {
  return pairs.map(([category, count]) => ({ category, count }));
}

describe("useVesselCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("initializes total as 0", () => {
      vi.mocked(fetchVesselCount).mockReturnValue(new Promise(() => {}));
      vi.mocked(fetchVesselCategoryCounts).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useVesselCount());
      expect(result.current.total).toBe(0);
    });

    it("initializes categories as empty array", () => {
      vi.mocked(fetchVesselCount).mockReturnValue(new Promise(() => {}));
      vi.mocked(fetchVesselCategoryCounts).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useVesselCount());
      expect(result.current.categories).toEqual([]);
    });

    it("initializes error as empty string", () => {
      vi.mocked(fetchVesselCount).mockReturnValue(new Promise(() => {}));
      vi.mocked(fetchVesselCategoryCounts).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useVesselCount());
      expect(result.current.error).toBe("");
    });

    it("becomes loading=true once mount effect fires", async () => {
      vi.mocked(fetchVesselCount).mockReturnValue(new Promise(() => {}));
      vi.mocked(fetchVesselCategoryCounts).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.loading).toBe(true));
    });

    it("fetches both count and category counts on mount, in parallel", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(10);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      renderHook(() => useVesselCount());
      await waitFor(() => {
        expect(fetchVesselCount).toHaveBeenCalledTimes(1);
        expect(fetchVesselCategoryCounts).toHaveBeenCalledTimes(1);
      });
    });

    it("without a cqlFilter argument, calls both fetches with undefined", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(0);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      renderHook(() => useVesselCount());
      await waitFor(() => {
        expect(fetchVesselCount).toHaveBeenCalledWith(undefined);
        expect(fetchVesselCategoryCounts).toHaveBeenCalledWith(undefined);
      });
    });
  });

  // ── Success ────────────────────────────────────────────────────────────

  describe("success state", () => {
    it("sets total and categories from resolved data", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(150);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["Cargo", 100], ["Tanker", 50]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.total).toBe(150);
      expect(result.current.categories).toEqual(categories(["Cargo", 100], ["Tanker", 50]));
    });

    it("handles zero total with empty categories (Empty State / Boundary)", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(0);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.total).toBe(0);
      expect(result.current.categories).toEqual([]);
      expect(result.current.error).toBe("");
    });

    it("handles a single category", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["OnlyCategory", 1]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.categories).toHaveLength(1));
    });

    it("handles a large number of categories", async () => {
      const many: [string, number][] = Array.from({ length: 100 }, (_, i) => [`Cat${i}`, i]);
      vi.mocked(fetchVesselCount).mockResolvedValue(5000);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(...many));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.categories).toHaveLength(100));
    });

    it("handles an extremely large total count (boundary: near Number.MAX_SAFE_INTEGER)", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(Number.MAX_SAFE_INTEGER);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.total).toBe(Number.MAX_SAFE_INTEGER));
    });

    it("clears a prior error on a successful refresh (ERROR -> SUCCESS)", async () => {
      vi.mocked(fetchVesselCount).mockRejectedValueOnce(new Error("fail"));
      vi.mocked(fetchVesselCategoryCounts).mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel count data"));

      vi.mocked(fetchVesselCount).mockResolvedValueOnce(20);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValueOnce(categories(["A", 20]));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
      expect(result.current.total).toBe(20);
    });

    it("categories preserve provided sort order (hook does not re-sort)", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(3);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["Z", 1], ["A", 2]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.categories.map((c) => c.category)).toEqual(["Z", "A"]));
    });

    it("handles categories with zero count entries", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(0);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["Empty", 0]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.categories[0].count).toBe(0));
    });

    it("handles duplicate category names without deduping (pass-through)", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(4);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["Cargo", 2], ["Cargo", 2]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.categories).toHaveLength(2));
    });
  });

  // ── Error handling / Promise.all semantics ───────────────────────────────

  describe("error state (Promise.all fail-fast semantics)", () => {
    it("sets error when fetchVesselCount rejects even if category counts would succeed", async () => {
      vi.mocked(fetchVesselCount).mockRejectedValue(new Error("count failed"));
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["A", 1]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel count data"));
    });

    it("sets error when fetchVesselCategoryCounts rejects even if count would succeed", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(100);
      vi.mocked(fetchVesselCategoryCounts).mockRejectedValue(new Error("categories failed"));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel count data"));
    });

    it("Promise.all fail-fast: total and categories remain at prior/default values when either call fails (partial-failure data loss)", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(100);
      vi.mocked(fetchVesselCategoryCounts).mockRejectedValue(new Error("categories failed"));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.error).not.toBe(""));
      // total stays at its initial default (0) even though fetchVesselCount succeeded — documents a real limitation.
      expect(result.current.total).toBe(0);
      expect(result.current.categories).toEqual([]);
    });

    it("sets loading false after failure", async () => {
      vi.mocked(fetchVesselCount).mockRejectedValue(new Error("fail"));
      vi.mocked(fetchVesselCategoryCounts).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("retains prior successful data after a subsequent failed refresh", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValueOnce(50);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValueOnce(categories(["A", 50]));
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.total).toBe(50));

      vi.mocked(fetchVesselCount).mockRejectedValueOnce(new Error("fail"));
      vi.mocked(fetchVesselCategoryCounts).mockRejectedValueOnce(new Error("fail"));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("Failed to load vessel count data");
      expect(result.current.total).toBe(50);
      expect(result.current.categories).toEqual(categories(["A", 50]));
    });

    it("swallows the actual error message (always uses the generic string, regardless of thrown error content)", async () => {
      vi.mocked(fetchVesselCount).mockRejectedValue(new Error("very specific upstream WFS failure: 503"));
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel count data"));
    });

    it("handles non-Error rejections from both calls", async () => {
      vi.mocked(fetchVesselCount).mockRejectedValue("string failure");
      vi.mocked(fetchVesselCategoryCounts).mockRejectedValue({ code: 500 });
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel count data"));
    });
  });

  // ── cqlFilter dependency (parameterized) ─────────────────────────────────

  describe("cqlFilter dependency", () => {
    it("passes the cqlFilter argument through to both fetch functions", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(5);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      renderHook(() => useVesselCount("mmsi = 123"));
      await waitFor(() => {
        expect(fetchVesselCount).toHaveBeenCalledWith("mmsi = 123");
        expect(fetchVesselCategoryCounts).toHaveBeenCalledWith("mmsi = 123");
      });
    });

    it("re-fetches when cqlFilter changes between renders", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { rerender } = renderHook(({ cql }) => useVesselCount(cql), { initialProps: { cql: "a = 1" } });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(1));
      rerender({ cql: "a = 2" });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(2));
      expect(fetchVesselCount).toHaveBeenLastCalledWith("a = 2");
    });

    it("does not re-fetch when cqlFilter stays identical across renders", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { rerender } = renderHook(({ cql }) => useVesselCount(cql), { initialProps: { cql: "a = 1" } });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(1));
      rerender({ cql: "a = 1" });
      expect(fetchVesselCount).toHaveBeenCalledTimes(1);
    });

    it("switching cqlFilter from defined to undefined re-fetches with undefined", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { rerender } = renderHook(({ cql }) => useVesselCount(cql), {
        initialProps: { cql: "a = 1" as string | undefined },
      });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(1));
      rerender({ cql: undefined });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenLastCalledWith(undefined));
    });

    it("handles an empty-string cqlFilter distinctly from undefined", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      renderHook(() => useVesselCount(""));
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledWith(""));
    });

    it("race condition: rapid cqlFilter switch can let a stale response overwrite fresher state", async () => {
      let resolveCountA!: (v: number) => void;
      let resolveCountB!: (v: number) => void;
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      vi.mocked(fetchVesselCount)
        .mockImplementationOnce(() => new Promise((r) => { resolveCountA = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveCountB = r; }));

      const { result, rerender } = renderHook(({ cql }) => useVesselCount(cql), { initialProps: { cql: "A" } });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(1));
      rerender({ cql: "B" });
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(2));

      await act(async () => { resolveCountB(200); });
      expect(result.current.total).toBe(200);

      await act(async () => { resolveCountA(100); });
      // Documents that the earlier ("A") request overwrites the later ("B") one — no request-id guard exists.
      expect(result.current.total).toBe(100);
    });
  });

  // ── refresh() ──────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("refresh is stable while cqlFilter is unchanged", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result, rerender } = renderHook(() => useVesselCount("x = 1"));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender();
      expect(result.current.refresh).toBe(ref1);
    });

    it("refresh identity changes when cqlFilter changes", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result, rerender } = renderHook(({ cql }) => useVesselCount(cql), { initialProps: { cql: "a" } });
      await waitFor(() => expect(result.current.loading).toBe(false));
      const ref1 = result.current.refresh;
      rerender({ cql: "b" });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.refresh).not.toBe(ref1);
    });

    it("calling refresh manually triggers another Promise.all cycle", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(1));
      await act(async () => { await result.current.refresh(); });
      expect(fetchVesselCount).toHaveBeenCalledTimes(2);
      expect(fetchVesselCategoryCounts).toHaveBeenCalledTimes(2);
    });

    it("concurrent refresh calls resolve without throwing", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselCount());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await Promise.all([result.current.refresh(), result.current.refresh()]);
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── Cleanup / unmount ──────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmount while both calls are pending does not throw", async () => {
      let resolveCount: (v: number) => void = () => {};
      let resolveCategories: (v: VesselCountCategory[]) => void = () => {};
      vi.mocked(fetchVesselCount).mockImplementation(() => new Promise((r) => { resolveCount = r; }));
      vi.mocked(fetchVesselCategoryCounts).mockImplementation(() => new Promise((r) => { resolveCategories = r; }));
      const { unmount } = renderHook(() => useVesselCount());
      expect(() => unmount()).not.toThrow();
      await act(async () => {
        resolveCount(1);
        resolveCategories([]);
        await Promise.resolve();
      });
    });

    it("unmount while one call is about to reject does not throw", async () => {
      let rejectFn: (e: unknown) => void = () => {};
      vi.mocked(fetchVesselCount).mockImplementation(() => new Promise((_r, rej) => { rejectFn = rej; }));
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { unmount } = renderHook(() => useVesselCount());
      unmount();
      await act(async () => { rejectFn(new Error("late")); await Promise.resolve().catch(() => {}); });
    });

    it("does not re-fetch merely due to unrelated re-renders", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(1);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue([]);
      const { rerender } = renderHook(() => useVesselCount("stable"));
      await waitFor(() => expect(fetchVesselCount).toHaveBeenCalledTimes(1));
      rerender();
      rerender();
      expect(fetchVesselCount).toHaveBeenCalledTimes(1);
    });
  });

  // ── React Strict Mode ────────────────────────────────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("mount/unmount/remount produces a consistent final state", async () => {
      vi.mocked(fetchVesselCount).mockResolvedValue(42);
      vi.mocked(fetchVesselCategoryCounts).mockResolvedValue(categories(["A", 42]));
      const { result: r1, unmount } = renderHook(() => useVesselCount());
      await waitFor(() => expect(r1.current.loading).toBe(false));
      unmount();

      const { result: r2 } = renderHook(() => useVesselCount());
      await waitFor(() => expect(r2.current.loading).toBe(false));
      expect(r2.current.total).toBe(42);
    });
  });
});
