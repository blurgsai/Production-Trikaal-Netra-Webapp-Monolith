import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVesselColumns } from "../useVesselColumns";

vi.mock("../../api/vesselTableApi", () => ({
  fetchVesselTableColumns: vi.fn(),
  searchColumnValues: vi.fn(),
}));

import { fetchVesselTableColumns, searchColumnValues } from "../../api/vesselTableApi";

describe("useVesselColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Return shape / initial state ─────────────────────────────────────

  describe("return shape", () => {
    it("returns exactly fetchColumns and searchValues", () => {
      const { result } = renderHook(() => useVesselColumns());
      expect(Object.keys(result.current).sort()).toEqual(["fetchColumns", "searchValues"]);
    });

    it("does not invoke either API function merely on mount", () => {
      renderHook(() => useVesselColumns());
      expect(fetchVesselTableColumns).not.toHaveBeenCalled();
      expect(searchColumnValues).not.toHaveBeenCalled();
    });
  });

  // ── fetchColumns: Equivalence Partitioning / Boundary ─────────────────

  describe("fetchColumns", () => {
    it("delegates directly to fetchVesselTableColumns with no arguments", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["a", "b"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.fetchColumns(); });
      expect(fetchVesselTableColumns).toHaveBeenCalledWith();
    });

    it("returns the resolved value unmodified (pure passthrough)", async () => {
      const columns = ["identification_mmsi", "identification_imo"];
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(columns);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.fetchColumns(); });
      expect(returned).toBe(columns);
    });

    it("handles an empty result set (Empty State)", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = ["sentinel"];
      await act(async () => { returned = await result.current.fetchColumns(); });
      expect(returned).toEqual([]);
    });

    it("handles a single-column boundary result", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["only_col"]);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.fetchColumns(); });
      expect(returned).toEqual(["only_col"]);
    });

    it("handles a large column set (Large Dataset, 200 columns)", async () => {
      const columns = Array.from({ length: 200 }, (_, i) => `col_${i}`);
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(columns);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.fetchColumns(); });
      expect(returned).toHaveLength(200);
    });

    it("propagates API rejection to the caller unmodified (Negative Testing / Failure Injection)", async () => {
      const err = new Error("DescribeFeatureType failed: 500");
      vi.mocked(fetchVesselTableColumns).mockRejectedValue(err);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.fetchColumns()).rejects.toBe(err);
    });

    it("propagates a non-Error rejection unmodified", async () => {
      vi.mocked(fetchVesselTableColumns).mockRejectedValue("string failure");
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.fetchColumns()).rejects.toBe("string failure");
    });

    it("does not call searchColumnValues as a side effect", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["a"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.fetchColumns(); });
      expect(searchColumnValues).not.toHaveBeenCalled();
    });

    it("calling fetchColumns multiple times issues one API call per invocation (no caching/memoized result)", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["a"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.fetchColumns(); });
      await act(async () => { await result.current.fetchColumns(); });
      await act(async () => { await result.current.fetchColumns(); });
      expect(fetchVesselTableColumns).toHaveBeenCalledTimes(3);
    });

    it("concurrent fetchColumns invocations both resolve independently", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["a", "b"]);
      const { result } = renderHook(() => useVesselColumns());
      const [r1, r2] = await act(async () =>
        Promise.all([result.current.fetchColumns(), result.current.fetchColumns()])
      );
      expect(r1).toEqual(["a", "b"]);
      expect(r2).toEqual(["a", "b"]);
      expect(fetchVesselTableColumns).toHaveBeenCalledTimes(2);
    });
  });

  // ── searchValues: Equivalence Partitioning / Boundary / Decision Table ─

  describe("searchValues", () => {
    it("delegates to searchColumnValues with (column, query, limit) in order", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(["v1"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col1", "abc", 10); });
      expect(searchColumnValues).toHaveBeenCalledWith("col1", "abc", 10);
    });

    it("returns the resolved value unmodified", async () => {
      const values = ["x", "y", "z"];
      vi.mocked(searchColumnValues).mockResolvedValue(values);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.searchValues("col1", "q", 5); });
      expect(returned).toBe(values);
    });

    it.each([
      ["empty query string", ""],
      ["whitespace query", "   "],
      ["long query (500 chars)", "a".repeat(500)],
      ["SQL/CQL injection-like query", "' OR '1'='1"],
      ["unicode query", "船舶"],
    ])("forwards a %s to searchColumnValues without transformation", async (_label, query) => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col1", query, 10); });
      expect(searchColumnValues).toHaveBeenCalledWith("col1", query, 10);
    });

    it.each([
      ["zero", 0],
      ["negative", -1],
      ["very large", 100000],
    ])("forwards a %s limit value without validation/clamping", async (_label, limit) => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col1", "q", limit); });
      expect(searchColumnValues).toHaveBeenCalledWith("col1", "q", limit);
    });

    it("forwards an empty column name without validation", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("", "q", 10); });
      expect(searchColumnValues).toHaveBeenCalledWith("", "q", 10);
    });

    it("handles an empty result set", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = ["sentinel"];
      await act(async () => { returned = await result.current.searchValues("col1", "nomatch", 10); });
      expect(returned).toEqual([]);
    });

    it("preserves duplicate values returned by the API (no implicit dedupe)", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(["dup", "dup"]);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.searchValues("col1", "d", 10); });
      expect(returned).toEqual(["dup", "dup"]);
    });

    it("propagates API rejection unmodified", async () => {
      const err = new Error("WFS search failed");
      vi.mocked(searchColumnValues).mockRejectedValue(err);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.searchValues("col1", "q", 10)).rejects.toBe(err);
    });

    it("does not call fetchVesselTableColumns as a side effect", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(["v"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col1", "q", 10); });
      expect(fetchVesselTableColumns).not.toHaveBeenCalled();
    });

    it("concurrent searchValues calls with distinct params dispatch independently", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(["v"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => {
        await Promise.all([
          result.current.searchValues("col1", "a", 5),
          result.current.searchValues("col2", "b", 10),
        ]);
      });
      expect(searchColumnValues).toHaveBeenNthCalledWith(1, "col1", "a", 5);
      expect(searchColumnValues).toHaveBeenNthCalledWith(2, "col2", "b", 10);
    });
  });

  // ── Callback stability / Memoization correctness ──────────────────────

  describe("callback stability", () => {
    it("fetchColumns is referentially stable across re-renders (useCallback, empty deps)", () => {
      const { result, rerender } = renderHook(() => useVesselColumns());
      const ref = result.current.fetchColumns;
      rerender();
      rerender();
      expect(result.current.fetchColumns).toBe(ref);
    });

    it("searchValues is referentially stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useVesselColumns());
      const ref = result.current.searchValues;
      rerender();
      expect(result.current.searchValues).toBe(ref);
    });

    it("fetchColumns identity is stable even after being invoked (no state accumulation)", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["a"]);
      const { result } = renderHook(() => useVesselColumns());
      const ref1 = result.current.fetchColumns;
      await act(async () => { await result.current.fetchColumns(); });
      expect(result.current.fetchColumns).toBe(ref1);
    });

    it("distinct hook instances produce distinct callback identities (no module-level singleton leak)", () => {
      const { result: r1 } = renderHook(() => useVesselColumns());
      const { result: r2 } = renderHook(() => useVesselColumns());
      expect(r1.current.fetchColumns).not.toBe(r2.current.fetchColumns);
      expect(r1.current.searchValues).not.toBe(r2.current.searchValues);
    });
  });

  // ── Cleanup / lifecycle ────────────────────────────────────────────────

  describe("cleanup and lifecycle", () => {
    it("unmounting while fetchColumns is pending does not throw", async () => {
      let resolveFn: (v: string[]) => void = () => {};
      vi.mocked(fetchVesselTableColumns).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { result, unmount } = renderHook(() => useVesselColumns());
      const p = result.current.fetchColumns();
      expect(() => unmount()).not.toThrow();
      resolveFn(["a"]);
      await p.catch(() => {});
    });

    it("unmounting while searchValues is pending does not throw", async () => {
      let resolveFn: (v: string[]) => void = () => {};
      vi.mocked(searchColumnValues).mockImplementation(() => new Promise((r) => { resolveFn = r; }));
      const { result, unmount } = renderHook(() => useVesselColumns());
      const p = result.current.searchValues("col1", "q", 10);
      unmount();
      resolveFn([]);
      await p.catch(() => {});
    });

    it("this hook holds no internal state, so unmount performs no cleanup side effects to verify beyond not throwing", () => {
      const { unmount } = renderHook(() => useVesselColumns());
      expect(() => unmount()).not.toThrow();
    });
  });

  // ── Additional edge cases / Error Guessing / Boundary ───────────────────

  describe("additional edge cases", () => {
    it("fetchColumns returns a promise (async function)", () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      expect(result.current.fetchColumns()).toBeInstanceOf(Promise);
    });

    it("searchValues returns a promise (async function)", () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      expect(result.current.searchValues("col", "q", 10)).toBeInstanceOf(Promise);
    });

    it("fetchColumns resolves to undefined when API returns undefined", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(undefined as unknown as string[]);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] | undefined = "sentinel" as unknown as string[] | undefined;
      await act(async () => { returned = await result.current.fetchColumns(); });
      expect(returned).toBeUndefined();
    });

    it("searchValues resolves to undefined when API returns undefined", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(undefined as unknown as string[]);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] | undefined = "sentinel" as unknown as string[] | undefined;
      await act(async () => { returned = await result.current.searchValues("col", "q", 10); });
      expect(returned).toBeUndefined();
    });

    it("fetchColumns propagates rejection with a number", async () => {
      vi.mocked(fetchVesselTableColumns).mockRejectedValue(42);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.fetchColumns()).rejects.toBe(42);
    });

    it("fetchColumns propagates rejection with null", async () => {
      vi.mocked(fetchVesselTableColumns).mockRejectedValue(null);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.fetchColumns()).rejects.toBeNull();
    });

    it("fetchColumns propagates rejection with undefined", async () => {
      vi.mocked(fetchVesselTableColumns).mockRejectedValue(undefined);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.fetchColumns()).rejects.toBeUndefined();
    });

    it("searchValues propagates rejection with a number", async () => {
      vi.mocked(searchColumnValues).mockRejectedValue(42);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.searchValues("col", "q", 10)).rejects.toBe(42);
    });

    it("searchValues propagates rejection with null", async () => {
      vi.mocked(searchColumnValues).mockRejectedValue(null);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.searchValues("col", "q", 10)).rejects.toBeNull();
    });

    it("searchValues propagates rejection with undefined", async () => {
      vi.mocked(searchColumnValues).mockRejectedValue(undefined);
      const { result } = renderHook(() => useVesselColumns());
      await expect(result.current.searchValues("col", "q", 10)).rejects.toBeUndefined();
    });

    it("searchValues with a very long column name (500 chars) is forwarded as-is", async () => {
      const longCol = "c".repeat(500);
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues(longCol, "q", 10); });
      expect(searchColumnValues).toHaveBeenCalledWith(longCol, "q", 10);
    });

    it("searchValues with unicode column name is forwarded as-is", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("列名", "q", 10); });
      expect(searchColumnValues).toHaveBeenCalledWith("列名", "q", 10);
    });

    it("searchValues with special characters in column name is forwarded as-is", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col; DROP TABLE--", "q", 10); });
      expect(searchColumnValues).toHaveBeenCalledWith("col; DROP TABLE--", "q", 10);
    });

    it("searchValues with fractional limit is forwarded as-is", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col", "q", 10.5); });
      expect(searchColumnValues).toHaveBeenCalledWith("col", "q", 10.5);
    });

    it("searchValues with NaN limit is forwarded as-is", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col", "q", NaN); });
      expect(searchColumnValues).toHaveBeenCalledWith("col", "q", NaN);
    });

    it("searchValues with Infinity limit is forwarded as-is", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("col", "q", Infinity); });
      expect(searchColumnValues).toHaveBeenCalledWith("col", "q", Infinity);
    });

    it("calling fetchColumns then searchValues does not cross-contaminate API calls", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["a"]);
      vi.mocked(searchColumnValues).mockResolvedValue(["v"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => {
        await result.current.fetchColumns();
        await result.current.searchValues("col", "q", 10);
      });
      expect(fetchVesselTableColumns).toHaveBeenCalledTimes(1);
      expect(searchColumnValues).toHaveBeenCalledTimes(1);
    });

    it("multiple concurrent searchValues calls with same params each get a separate API call", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(["v"]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => {
        await Promise.all([
          result.current.searchValues("col", "q", 10),
          result.current.searchValues("col", "q", 10),
        ]);
      });
      expect(searchColumnValues).toHaveBeenCalledTimes(2);
    });

    it("fetchColumns with a large result preserves order (no sorting)", async () => {
      const columns = ["z", "a", "m", "b", "y"];
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(columns);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.fetchColumns(); });
      expect(returned).toEqual(columns);
    });

    it("searchValues with large result preserves order (no sorting)", async () => {
      const values = ["z", "a", "m", "b", "y"];
      vi.mocked(searchColumnValues).mockResolvedValue(values);
      const { result } = renderHook(() => useVesselColumns());
      let returned: string[] = [];
      await act(async () => { returned = await result.current.searchValues("col", "q", 10); });
      expect(returned).toEqual(values);
    });

    it("fetchColumns identity is stable even after an error (no state reset)", async () => {
      vi.mocked(fetchVesselTableColumns).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselColumns());
      const ref1 = result.current.fetchColumns;
      await act(async () => { await result.current.fetchColumns().catch(() => {}); });
      expect(result.current.fetchColumns).toBe(ref1);
    });

    it("searchValues identity is stable even after being invoked", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue(["v"]);
      const { result } = renderHook(() => useVesselColumns());
      const ref1 = result.current.searchValues;
      await act(async () => { await result.current.searchValues("col", "q", 10); });
      expect(result.current.searchValues).toBe(ref1);
    });

    it("searchValues with empty column, empty query, and zero limit is forwarded as-is", async () => {
      vi.mocked(searchColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselColumns());
      await act(async () => { await result.current.searchValues("", "", 0); });
      expect(searchColumnValues).toHaveBeenCalledWith("", "", 0);
    });
  });
});
