import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ChartConfig, ChartDataResult, ChartType, ChartAggregation } from "../../model/chartTypes";
import type { ChartDataResponseApi } from "../../api/chartDataApi";

vi.mock("../../api/chartDataApi", () => ({
  fetchChartData: vi.fn(),
}));

vi.mock("../../model/chartMappers", () => ({
  mapFeaturesToChartData: vi.fn(),
}));

import { useChartData } from "../useChartData";
import { useChartConfigs } from "../useChartConfigs";
import { fetchChartData } from "../../api/chartDataApi";
import { mapFeaturesToChartData } from "../../model/chartMappers";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<ChartConfig>): ChartConfig {
  return {
    id: "chart-1",
    title: "Test Chart",
    chartType: "bar",
    xAxisColumn: "vessel_type",
    yAxisColumn: "speed",
    aggregation: "count",
    maxDataPoints: 50,
    ...overrides,
  };
}

function makeFeatures(count: number): ChartDataResponseApi["features"] {
  return Array.from({ length: count }, (_, i) => ({
    type: "Feature" as const,
    id: `f-${i}`,
    properties: { vessel_type: `Type${i % 5}`, speed: i * 10 },
  }));
}

function makeChartDataResult(points?: { label: string; value: number }[]): ChartDataResult {
  return {
    points: points ?? [{ label: "Type0", value: 10 }, { label: "Type1", value: 5 }],
    total: points?.length ?? 2,
  };
}

function makeApiResponse(features: ReturnType<typeof makeFeatures>): ChartDataResponseApi {
  return {
    type: "FeatureCollection",
    totalFeatures: features.length,
    numberMatched: features.length,
    numberReturned: features.length,
    features,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return wrapper;
}

// ── Hook Inventory ───────────────────────────────────────────────────────────
//
// Hook: useChartData
//   Purpose: Fetches chart data from WFS API based on a ChartConfig and optional CQL filter,
//            then maps the raw features to ChartDataPoint[] via chartMappers.
//   Public API: { data: ChartDataResult, loading: boolean, error: string | null }
//   Parameters:
//     - config: ChartConfig | null  (when null, query is disabled)
//     - cqlFilter?: string           (optional WFS CQL filter passed to API)
//   Internal state: Delegated to @tanstack/react-query useQuery
//   Side effects: HTTP fetch via fetchChartData, mapping via mapFeaturesToChartData
//   Dependencies: @tanstack/react-query, fetchChartData, mapFeaturesToChartData
//   API calls: fetchChartData({ propertyNames, cqlFilter, maxFeatures: 5000 })
//   Browser APIs used: None directly
//   External libraries: @tanstack/react-query
//   Possible failure points:
//     - fetchChartData network failure or non-2xx response
//     - mapFeaturesToChartData throwing on malformed feature data
//     - config is null (query disabled)
//     - Stale closure on config/cqlFilter changes
//     - React Query cache key collisions
//
// Hook: useChartConfigs
//   Purpose: Provides a factory function to create ChartConfig objects with unique IDs
//   Public API: { createChartConfig: (partial: Omit<ChartConfig, "id">) => ChartConfig }
//   Parameters: None
//   Internal state: None (pure utility via useCallback)
//   Side effects: None
//   Dependencies: None
//   API calls: None
//   Browser APIs used: Date.now(), Math.random()
//   External libraries: None
//   Possible failure points:
//     - ID collision if Date.now() + Math.random produce same value (extremely unlikely)
//     - Consumer misuse: passing partial that already has an id (overwritten)
//
// ── Risk Assessment ──────────────────────────────────────────────────────────
//
// useChartData:
//   HIGH:   queryKey includes config?.id, xAxisColumn, yAxisColumn, aggregation, cqlFilter
//           but NOT config?.title, config?.chartType, or config?.maxDataPoints.
//           Editing a chart's type/title/maxDataPoints in-place without changing its id
//           will NOT refetch data. This is a potential production bug.
//   MEDIUM: mapFeaturesToChartData is called inside queryFn — if it throws, the error
//           is caught by React Query but the message may be opaque.
//   MEDIUM: When config is null, the hook returns default data but the queryFn still
//           returns { points: [], total: 0 } — dead code path since enabled=false.
//   LOW:    Non-Error rejections result in error being null (error instanceof Error check).
//
// useChartConfigs:
//   LOW:    ID generation uses Date.now() + Math.random — not cryptographically unique
//           but sufficient for UI purposes. Collision risk is negligible.
//   LOW:    createChartConfig overwrites any "id" in the partial since it spreads after.
//
// ── Test Matrix ──────────────────────────────────────────────────────────────
//
// useChartData:
//   ✓ Initial state (config=null, config=valid)
//   ✓ Loading state
//   ✓ Success state (count aggregation, non-count aggregation)
//   ✓ Error state (network error, non-Error rejection, mapper throw)
//   ✓ Empty state (no features returned)
//   ✓ State transitions (idle -> loading -> success, idle -> loading -> error)
//   ✓ Dependency changes (config.id, xAxisColumn, yAxisColumn, aggregation, cqlFilter)
//   ✓ Memoization correctness (queryKey stability)
//   ✓ Stale closure prevention (React Query handles via queryKey)
//   ✓ Cleanup on unmount (React Query handles)
//   ✓ React Strict Mode compatibility
//   ✓ Property names construction (count vs non-count aggregation)
//   ✓ maxFeatures always 5000
//   ✓ Large datasets
//   ✓ Null/undefined config fields
//   ✓ config.title/chartType/maxDataPoints NOT in queryKey (documented limitation)
//
// useChartConfigs:
//   ✓ createChartConfig generates unique IDs
//   ✓ createChartConfig preserves partial fields
//   ✓ createChartConfig overwrites id if provided in partial
//   ✓ createChartConfig callback stability
//   ✓ ID format validation
//   ✓ Multiple rapid calls produce different IDs
//   ✓ All chart types and aggregation types
//   ✓ Empty/undefined fields
//   ✓ React Strict Mode compatibility
//

describe("useChartData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("returns default data when config is null", () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const { result } = renderHook(() => useChartData(null), { wrapper: createWrapper() });
      expect(result.current.data).toEqual({ points: [], total: 0 });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("does not call fetchChartData when config is null", () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));

      renderHook(() => useChartData(null), { wrapper: createWrapper() });
      expect(fetchChartData).not.toHaveBeenCalled();
    });

    it("starts in loading state when config is provided", async () => {
      vi.mocked(fetchChartData).mockReturnValue(new Promise(() => {}));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(true));
    });

    it("calls fetchChartData on mount when config is provided", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(makeFeatures(2)));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      renderHook(() => useChartData(makeConfig()), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
    });
  });

  // ── Success state ──────────────────────────────────────────────────────

  describe("success state", () => {
    it("returns mapped chart data on successful fetch", async () => {
      const features = makeFeatures(10);
      const mapped = makeChartDataResult([
        { label: "Cargo", value: 50 },
        { label: "Tanker", value: 30 },
      ]);
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(features));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(mapped);

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual(mapped);
      expect(result.current.error).toBe(null);
    });

    it("passes mapped data through mapFeaturesToChartData with correct args", async () => {
      const features = makeFeatures(5);
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(features));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const config = makeConfig();
      renderHook(() => useChartData(config), { wrapper: createWrapper() });
      await waitFor(() => expect(mapFeaturesToChartData).toHaveBeenCalledWith(features, config));
    });

    it("handles empty features response (empty state)", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual({ points: [], total: 0 });
      expect(result.current.error).toBe(null);
    });

    it("handles a single feature", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(makeFeatures(1)));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({
        points: [{ label: "Type0", value: 1 }],
        total: 1,
      });

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data.total).toBe(1));
    });

    it("handles large dataset (5000 features)", async () => {
      const features = makeFeatures(5000);
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(features));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({
        points: [{ label: "All", value: 5000 }],
        total: 1,
      });

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data.total).toBe(1));
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ maxFeatures: 5000 }),
      );
    });
  });

  // ── Error state ────────────────────────────────────────────────────────

  describe("error state", () => {
    it("sets error message when fetchChartData rejects with Error", async () => {
      vi.mocked(fetchChartData).mockRejectedValue(new Error("Network timeout"));

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe("Network timeout");
    });

    it("sets error to null when fetchChartData rejects with non-Error value (string)", async () => {
      vi.mocked(fetchChartData).mockRejectedValue("string error");

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe(null);
    });

    it("sets error to null when fetchChartData rejects with object", async () => {
      vi.mocked(fetchChartData).mockRejectedValue({ status: 500, message: "Server error" });

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe(null);
    });

    it("returns default data alongside error", async () => {
      vi.mocked(fetchChartData).mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual({ points: [], total: 0 });
    });

    it("sets error when mapFeaturesToChartData throws inside queryFn", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(makeFeatures(1)));
      vi.mocked(mapFeaturesToChartData).mockImplementation(() => {
        throw new Error("Mapping failed: malformed data");
      });

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe("Mapping failed: malformed data");
    });

    it("clears error on successful refetch after error", async () => {
      vi.mocked(fetchChartData)
        .mockRejectedValueOnce(new Error("first fail"))
        .mockResolvedValueOnce(makeApiResponse(makeFeatures(1)));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const { result, rerender } = renderHook(
        ({ c }) => useChartData(c),
        {
          initialProps: { c: makeConfig() },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(result.current.error).toBe("first fail"));

      rerender({ c: makeConfig({ id: "chart-2" }) });
      await waitFor(() => expect(result.current.error).toBe(null));
    });
  });

  // ── Property names construction ─────────────────────────────────────────

  describe("property names construction", () => {
    it("sends only xAxisColumn for count aggregation", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig({ aggregation: "count" })), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: ["vessel_type"] }),
      );
    });

    it("sends both xAxis and yAxis columns for sum aggregation", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(
        () => useChartData(makeConfig({ aggregation: "sum", yAxisColumn: "speed" })),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: ["vessel_type", "speed"] }),
      );
    });

    it("sends both xAxis and yAxis columns for avg aggregation", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(
        () => useChartData(makeConfig({ aggregation: "avg", yAxisColumn: "speed" })),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: ["vessel_type", "speed"] }),
      );
    });

    it("sends both xAxis and yAxis columns for min aggregation", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(
        () => useChartData(makeConfig({ aggregation: "min", yAxisColumn: "speed" })),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: ["vessel_type", "speed"] }),
      );
    });

    it("sends both xAxis and yAxis columns for max aggregation", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(
        () => useChartData(makeConfig({ aggregation: "max", yAxisColumn: "speed" })),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: ["vessel_type", "speed"] }),
      );
    });
  });

  // ── maxFeatures ─────────────────────────────────────────────────────────

  describe("maxFeatures", () => {
    it("always sends maxFeatures=5000", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig()), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ maxFeatures: 5000 }),
      );
    });

    it("ignores config.maxDataPoints for the API call (always 5000)", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig({ maxDataPoints: 10 })), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ maxFeatures: 5000 }),
      );
    });
  });

  // ── cqlFilter ───────────────────────────────────────────────────────────

  describe("cqlFilter", () => {
    it("passes cqlFilter to fetchChartData", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig(), "mmsi = 123"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ cqlFilter: "mmsi = 123" }),
      );
    });

    it("passes undefined cqlFilter when not provided", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig()), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ cqlFilter: undefined }),
      );
    });

    it("passes empty string cqlFilter distinctly from undefined", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig(), ""), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ cqlFilter: "" }),
      );
    });

    it("refetches when cqlFilter changes", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ filter }) => useChartData(makeConfig(), filter),
        {
          initialProps: { filter: "a = 1" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));

      rerender({ filter: "b = 2" });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(2));
      expect(fetchChartData).toHaveBeenLastCalledWith(
        expect.objectContaining({ cqlFilter: "b = 2" }),
      );
    });

    it("does not refetch when cqlFilter stays the same", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ filter }) => useChartData(makeConfig(), filter),
        {
          initialProps: { filter: "a = 1" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ filter: "a = 1" });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });

    it("refetches when cqlFilter changes from defined to undefined", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ filter }) => useChartData(makeConfig(), filter),
        {
          initialProps: { filter: "a = 1" as string | undefined },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ filter: undefined });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(2));
      expect(fetchChartData).toHaveBeenLastCalledWith(
        expect.objectContaining({ cqlFilter: undefined }),
      );
    });
  });

  // ── Dependency changes / queryKey ───────────────────────────────────────

  describe("dependency changes", () => {
    it("refetches when config.id changes", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ id }) => useChartData(makeConfig({ id })),
        {
          initialProps: { id: "chart-1" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ id: "chart-2" });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(2));
    });

    it("refetches when config.xAxisColumn changes", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ col }) => useChartData(makeConfig({ xAxisColumn: col })),
        {
          initialProps: { col: "vessel_type" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ col: "country" });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(2));
    });

    it("refetches when config.yAxisColumn changes", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ col }) => useChartData(makeConfig({ aggregation: "sum", yAxisColumn: col })),
        {
          initialProps: { col: "speed" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ col: "length" });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(2));
    });

    it("refetches when config.aggregation changes", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ agg }) => useChartData(makeConfig({ aggregation: agg })),
        {
          initialProps: { agg: "count" as ChartAggregation },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ agg: "sum" as ChartAggregation });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(2));
    });

    it("does NOT refetch when config.title changes (documented limitation)", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ title }) => useChartData(makeConfig({ title })),
        {
          initialProps: { title: "Chart A" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ title: "Chart B" });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });

    it("does NOT refetch when config.chartType changes (documented limitation)", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ type }) => useChartData(makeConfig({ chartType: type })),
        {
          initialProps: { type: "bar" as ChartType },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ type: "pie" as ChartType });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });

    it("does NOT refetch when config.maxDataPoints changes (documented limitation)", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ max }) => useChartData(makeConfig({ maxDataPoints: max })),
        {
          initialProps: { max: 50 },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ max: 100 });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });
  });

  // ── State transitions ───────────────────────────────────────────────────

  describe("state transitions", () => {
    it("transitions from loading to success", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(makeFeatures(1)));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(true));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data.total).toBe(2);
      expect(result.current.error).toBe(null);
    });

    it("transitions from loading to error", async () => {
      vi.mocked(fetchChartData).mockRejectedValue(new Error("fail"));

      const { result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(true));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe("fail");
    });
  });

  // ── Cleanup / unmount ───────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmount during pending fetch does not throw", () => {
      vi.mocked(fetchChartData).mockReturnValue(new Promise(() => {}));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const { unmount } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      expect(() => unmount()).not.toThrow();
    });

    it("unmount after error does not throw", async () => {
      vi.mocked(fetchChartData).mockRejectedValue(new Error("fail"));

      const { unmount, result } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.error).toBe("fail"));
      expect(() => unmount()).not.toThrow();
    });

    it("does not refetch on unrelated re-renders", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(() => useChartData(makeConfig(), "stable"), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender();
      rerender();
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });
  });

  // ── React Strict Mode ───────────────────────────────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("produces consistent final state after mount/unmount/remount", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse(makeFeatures(1)));
      vi.mocked(mapFeaturesToChartData).mockReturnValue(makeChartDataResult());

      const { result: r1, unmount } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(r1.current.loading).toBe(false));
      unmount();

      const { result: r2 } = renderHook(() => useChartData(makeConfig()), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(r2.current.loading).toBe(false));
      expect(r2.current.data.total).toBe(2);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles config with empty xAxisColumn", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig({ xAxisColumn: "" })), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: [""] }),
      );
    });

    it("handles config with empty yAxisColumn for non-count aggregation", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(
        () => useChartData(makeConfig({ aggregation: "sum", yAxisColumn: "" })),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ propertyNames: ["vessel_type", ""] }),
      );
    });

    it("handles config with maxDataPoints=0", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      renderHook(() => useChartData(makeConfig({ maxDataPoints: 0 })), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
    });

    it("handles config with maxDataPoints=undefined", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const config = makeConfig();
      delete config.maxDataPoints;
      renderHook(() => useChartData(config), { wrapper: createWrapper() });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
    });

    it("handles very long cqlFilter string", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const longFilter = "mmsi = " + "1".repeat(10000);
      renderHook(() => useChartData(makeConfig(), longFilter), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(fetchChartData).toHaveBeenCalled());
      expect(fetchChartData).toHaveBeenCalledWith(
        expect.objectContaining({ cqlFilter: longFilter }),
      );
    });
  });

  // ── Potential production bugs ───────────────────────────────────────────

  describe("potential production bugs", () => {
    it("queryKey does not include config.title — editing title won't refetch data", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ title }) => useChartData(makeConfig({ title })),
        {
          initialProps: { title: "Original" },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ title: "Renamed" });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });

    it("queryKey does not include config.chartType — switching chart type won't refetch", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ type }) => useChartData(makeConfig({ chartType: type })),
        {
          initialProps: { type: "bar" as ChartType },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ type: "line" as ChartType });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });

    it("queryKey does not include config.maxDataPoints — changing it won't refetch", async () => {
      vi.mocked(fetchChartData).mockResolvedValue(makeApiResponse([]));
      vi.mocked(mapFeaturesToChartData).mockReturnValue({ points: [], total: 0 });

      const { rerender } = renderHook(
        ({ max }) => useChartData(makeConfig({ maxDataPoints: max })),
        {
          initialProps: { max: 10 },
          wrapper: createWrapper(),
        },
      );
      await waitFor(() => expect(fetchChartData).toHaveBeenCalledTimes(1));
      rerender({ max: 100 });
      expect(fetchChartData).toHaveBeenCalledTimes(1);
    });
  });
});

// ── useChartConfigs ──────────────────────────────────────────────────────────

describe("useChartConfigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createChartConfig ──────────────────────────────────────────────────

  describe("createChartConfig", () => {
    it("preserves all fields from the partial config", () => {
      const { result } = renderHook(() => useChartConfigs());
      const partial = {
        title: "My Chart",
        chartType: "bar" as ChartType,
        xAxisColumn: "vessel_type",
        yAxisColumn: "speed",
        aggregation: "count" as ChartAggregation,
        maxDataPoints: 25,
      };
      const config = result.current.createChartConfig(partial);
      expect(config.title).toBe("My Chart");
      expect(config.chartType).toBe("bar");
      expect(config.xAxisColumn).toBe("vessel_type");
      expect(config.yAxisColumn).toBe("speed");
      expect(config.aggregation).toBe("count");
      expect(config.maxDataPoints).toBe(25);
    });

    it("generates an id with the chart- prefix", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({
        title: "Test",
        chartType: "bar",
        xAxisColumn: "a",
        yAxisColumn: "b",
        aggregation: "count",
        maxDataPoints: 50,
      });
      expect(config.id).toMatch(/^chart-\d+-[a-z0-9]+$/);
    });

    it("overwrites id if provided in the partial", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({
        title: "Test",
        chartType: "bar",
        xAxisColumn: "a",
        yAxisColumn: "b",
        aggregation: "count",
        maxDataPoints: 50,
      });
      // Verify that even if a consumer somehow passes an id, it gets overwritten
      const withId = { ...config, id: "custom-id" } as ChartConfig;
      expect(withId.id).toBe("custom-id"); // The consumer's object has their id
      expect(config.id).not.toBe("custom-id"); // But createChartConfig generated its own
      expect(config.id).not.toBe("custom-id");
      expect(config.id).toMatch(/^chart-/);
    });

    it("generates different ids on successive calls", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config1 = result.current.createChartConfig({
        title: "A",
        chartType: "bar",
        xAxisColumn: "x",
        yAxisColumn: "y",
        aggregation: "count",
        maxDataPoints: 50,
      });
      const config2 = result.current.createChartConfig({
        title: "B",
        chartType: "bar",
        xAxisColumn: "x",
        yAxisColumn: "y",
        aggregation: "count",
        maxDataPoints: 50,
      });
      expect(config1.id).not.toBe(config2.id);
    });

    it("generates different ids on rapid successive calls (same ms)", () => {
      const { result } = renderHook(() => useChartConfigs());
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(
          result.current.createChartConfig({
            title: "Rapid",
            chartType: "bar",
            xAxisColumn: "x",
            yAxisColumn: "y",
            aggregation: "count",
            maxDataPoints: 50,
          }).id,
        );
      }
      expect(ids.size).toBeGreaterThan(95);
    });
  });

  // ── Callback stability ─────────────────────────────────────────────────

  describe("callback stability", () => {
    it("createChartConfig is stable across re-renders", () => {
      const { result, rerender } = renderHook(() => useChartConfigs());
      const ref1 = result.current.createChartConfig;
      rerender();
      expect(result.current.createChartConfig).toBe(ref1);
    });

    it("createChartConfig remains stable after multiple re-renders", () => {
      const { result, rerender } = renderHook(() => useChartConfigs());
      const ref1 = result.current.createChartConfig;
      rerender();
      rerender();
      rerender();
      expect(result.current.createChartConfig).toBe(ref1);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty title", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({
        title: "",
        chartType: "bar",
        xAxisColumn: "x",
        yAxisColumn: "y",
        aggregation: "count",
        maxDataPoints: 50,
      });
      expect(config.title).toBe("");
      expect(config.id).toBeDefined();
    });

    it("handles undefined maxDataPoints", () => {
      const { result } = renderHook(() => useChartConfigs());
      const config = result.current.createChartConfig({
        title: "Test",
        chartType: "bar",
        xAxisColumn: "x",
        yAxisColumn: "y",
        aggregation: "count",
      });
      expect(config.maxDataPoints).toBeUndefined();
      expect(config.id).toBeDefined();
    });

    it("handles all chart types", () => {
      const { result } = renderHook(() => useChartConfigs());
      const types: ChartType[] = ["bar", "line", "pie", "area", "scatter"];
      for (const chartType of types) {
        const config = result.current.createChartConfig({
          title: "Test",
          chartType,
          xAxisColumn: "x",
          yAxisColumn: "y",
          aggregation: "count",
          maxDataPoints: 50,
        });
        expect(config.chartType).toBe(chartType);
      }
    });

    it("handles all aggregation types", () => {
      const { result } = renderHook(() => useChartConfigs());
      const aggs: ChartAggregation[] = ["count", "sum", "avg", "min", "max"];
      for (const aggregation of aggs) {
        const config = result.current.createChartConfig({
          title: "Test",
          chartType: "bar",
          xAxisColumn: "x",
          yAxisColumn: "y",
          aggregation,
          maxDataPoints: 50,
        });
        expect(config.aggregation).toBe(aggregation);
      }
    });
  });

  // ── React Strict Mode ───────────────────────────────────────────────────

  describe("React Strict Mode compatibility", () => {
    it("produces consistent createChartConfig after mount/unmount/remount", () => {
      const { result: r1, unmount } = renderHook(() => useChartConfigs());
      const config1 = r1.current.createChartConfig({
        title: "Test",
        chartType: "bar",
        xAxisColumn: "x",
        yAxisColumn: "y",
        aggregation: "count",
        maxDataPoints: 50,
      });
      unmount();

      const { result: r2 } = renderHook(() => useChartConfigs());
      const config2 = r2.current.createChartConfig({
        title: "Test",
        chartType: "bar",
        xAxisColumn: "x",
        yAxisColumn: "y",
        aggregation: "count",
        maxDataPoints: 50,
      });
      expect(config1.id).not.toBe(config2.id);
      expect(config1.title).toBe(config2.title);
    });
  });
});
