import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVesselTable } from "./useVesselTable";
import type { VesselTableResponseApi } from "../api/vesselTableApi";
import type { VesselTableFilter, Polygon, SavedFilterSet } from "../model/types";

vi.mock("../api/vesselTableApi", () => ({
  fetchVesselTable: vi.fn(),
  fetchVesselTableColumns: vi.fn(),
  fetchUniqueColumnValues: vi.fn(),
  searchColumnValues: vi.fn(),
}));

vi.mock("../api/vesselFilterStorage", () => ({
  loadSavedFilters: vi.fn(),
  saveFilter: vi.fn(),
  deleteSavedFilter: vi.fn(),
}));

vi.mock("../model/cqlFilter", () => ({
  buildWfsCqlFilter: vi.fn(),
  buildPolygonCqlFilter: vi.fn(),
  combineCqlFilters: vi.fn(),
}));

vi.mock("../model/mappers", () => ({
  mapVesselTableResponse: vi.fn(),
}));

import { fetchVesselTable, fetchVesselTableColumns, fetchUniqueColumnValues } from "../api/vesselTableApi";
import { loadSavedFilters, saveFilter, deleteSavedFilter } from "../api/vesselFilterStorage";
import { buildWfsCqlFilter, buildPolygonCqlFilter, combineCqlFilters } from "../model/cqlFilter";
import { mapVesselTableResponse } from "../model/mappers";

const DEFAULT_COLUMNS = [
  "identification_mmsi", "identification_imo", "identification_shipname",
  "navigationstatus", "location_current_lat", "location_current_lon",
  "heading_current_consensusvalue", "kinematics_speedovergroundmps",
];

function makeTableResponse(count: number): VesselTableResponseApi {
  return {
    type: "FeatureCollection",
    totalFeatures: count,
    numberMatched: count,
    numberReturned: count,
    features: Array.from({ length: count }, (_, i) => ({
      type: "Feature" as const,
      id: `vessel-${i}`,
      properties: { identification_mmsi: `MMSI${i}` },
    })),
  };
}

function makeFilter(overrides?: Partial<VesselTableFilter>): VesselTableFilter {
  return { column: "identification_mmsi", operator: "=", value: "123", combinator: "AND", ...overrides };
}

function makePolygon(id: string): Polygon {
  return { id, points: [{ lat: 10, lng: 20 }, { lat: 20, lng: 30 }, { lat: 30, lng: 10 }] };
}

function setupDefaults() {
  vi.mocked(fetchVesselTableColumns).mockResolvedValue([...DEFAULT_COLUMNS]);
  vi.mocked(fetchVesselTable).mockResolvedValue(makeTableResponse(5));
  vi.mocked(mapVesselTableResponse).mockReturnValue({ rows: [], total: 5, returned: 5 });
  vi.mocked(loadSavedFilters).mockReturnValue([]);
  vi.mocked(buildWfsCqlFilter).mockReturnValue(null);
  vi.mocked(buildPolygonCqlFilter).mockReturnValue(null);
  vi.mocked(combineCqlFilters).mockReturnValue(null);
}

describe("useVesselTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaults();
  });

  // ── Initial state (React Lifecycle) ────────────────────────────────────

  describe("initial state", () => {
    it("initializes filters/appliedFilters as empty arrays", () => {
      const { result } = renderHook(() => useVesselTable());
      expect(result.current.filters).toEqual([]);
      expect(result.current.appliedFilters).toEqual([]);
    });

    it("initializes page as 0 and pageSize as DEFAULT_PAGE_SIZE (10)", () => {
      const { result } = renderHook(() => useVesselTable());
      expect(result.current.page).toBe(0);
      expect(result.current.pageSize).toBe(10);
    });

    it("initializes sortBy undefined, sortOrder asc", () => {
      const { result } = renderHook(() => useVesselTable());
      expect(result.current.sortBy).toBeUndefined();
      expect(result.current.sortOrder).toBe("asc");
    });

    it("initializes showResults as true and error as empty string", () => {
      const { result } = renderHook(() => useVesselTable());
      expect(result.current.showResults).toBe(true);
      expect(result.current.error).toBe("");
    });

    it("initializes columnOptions as {} and savedFilters from loadSavedFilters()", () => {
      const saved: SavedFilterSet[] = [{ name: "preset", filters: [], polygonFilters: [], createdAt: "2024-01-01" }];
      vi.mocked(loadSavedFilters).mockReturnValue(saved);
      const { result } = renderHook(() => useVesselTable());
      expect(result.current.columnOptions).toEqual({});
      expect(result.current.savedFilters).toEqual(saved);
    });

    it("respects a custom pageSize option", () => {
      const { result } = renderHook(() => useVesselTable({ pageSize: 25 }));
      expect(result.current.pageSize).toBe(25);
    });

    it("fetches columns and table data exactly once on mount", async () => {
      renderHook(() => useVesselTable());
      await waitFor(() => {
        expect(fetchVesselTableColumns).toHaveBeenCalledTimes(1);
        expect(fetchVesselTable).toHaveBeenCalledTimes(1);
      });
    });

    it("initial query includes page=0, pageSize=default, and no sort", async () => {
      renderHook(() => useVesselTable());
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalled());
      const query = vi.mocked(fetchVesselTable).mock.calls[0][0];
      expect(query).toMatchObject({ page: 0, pageSize: 10, sortBy: undefined, sortOrder: "asc" });
    });
  });

  // ── Filters: addFilter / updateFilter / removeFilter (Decision Table) ──

  describe("filter CRUD (decision table)", () => {
    it("addFilter appends a filter with sane defaults (column=identification_mmsi, operator='=', value='', combinator=AND)", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.addFilter());
      expect(result.current.filters).toEqual([
        { column: "identification_mmsi", operator: "=", value: "", combinator: "AND" },
      ]);
    });

    it("addFilter resets page to 0 (Decision: page reset on structural filter change)", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(4));
      act(() => result.current.addFilter());
      expect(result.current.page).toBe(0);
    });

    it.each<[string, Partial<VesselTableFilter>]>([
      ["column", { column: "identification_imo" }],
      ["operator", { operator: "contains" }],
      ["value", { value: "test-value" }],
      ["combinator", { combinator: "OR" }],
    ])("updateFilter updates only the %s field, preserving the rest", (_label, patch) => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.addFilter());
      act(() => result.current.updateFilter(0, patch));
      expect(result.current.filters[0]).toEqual({
        column: "identification_mmsi", operator: "=", value: "", combinator: "AND", ...patch,
      });
    });

    it("updateFilter resets page to 0", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => { result.current.addFilter(); result.current.goToPage(3); result.current.updateFilter(0, { value: "x" }); });
      expect(result.current.page).toBe(0);
    });

    it("updateFilter with an out-of-bounds index is a safe no-op (bounds validation)", () => {
      const { result } = renderHook(() => useVesselTable());
      expect(() => act(() => result.current.updateFilter(5, { value: "x" }))).not.toThrow();
      expect(result.current.filters).toEqual([]);
    });

    it("removeFilter removes exactly the targeted index, preserving order of the rest", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => { result.current.addFilter(); result.current.addFilter(); result.current.addFilter(); });
      act(() => result.current.updateFilter(0, { value: "first" }));
      act(() => result.current.updateFilter(1, { value: "second" }));
      act(() => result.current.updateFilter(2, { value: "third" }));
      act(() => result.current.removeFilter(1));
      expect(result.current.filters.map((f) => f.value)).toEqual(["first", "third"]);
    });

    it("removeFilter resets page to 0", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => { result.current.addFilter(); result.current.goToPage(2); result.current.removeFilter(0); });
      expect(result.current.page).toBe(0);
    });

    it("removeFilter on an empty filter list is a safe no-op", () => {
      const { result } = renderHook(() => useVesselTable());
      expect(() => act(() => result.current.removeFilter(0))).not.toThrow();
      expect(result.current.filters).toEqual([]);
    });

    it("resetFilters clears both filters and appliedFilters and resets page", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => { result.current.addFilter(); result.current.applyFilters(); result.current.goToPage(6); });
      act(() => result.current.resetFilters());
      expect(result.current.filters).toEqual([]);
      expect(result.current.appliedFilters).toEqual([]);
      expect(result.current.page).toBe(0);
    });

    it("applyFilters snapshots the draft filters into appliedFilters, decoupled from future draft edits (State Transition: DRAFT -> APPLIED)", () => {
      const { result } = renderHook(() => useVesselTable());
      // Each mutation is flushed in its own act() so the closure used by applyFilters
      // observes the latest committed `filters` state (realistic UI usage: edit, then
      // a separate "Apply" click on a later render).
      act(() => result.current.addFilter());
      act(() => result.current.updateFilter(0, { value: "A" }));
      act(() => result.current.applyFilters());
      act(() => result.current.updateFilter(0, { value: "B" }));
      expect(result.current.appliedFilters[0].value).toBe("A");
      expect(result.current.filters[0].value).toBe("B");
    });

    it("calling applyFilters in the same synchronous batch as addFilter/updateFilter correctly applies the latest filters (ref-based closure)", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => {
        result.current.addFilter();
        result.current.updateFilter(0, { value: "A" });
        result.current.applyFilters();
      });
      expect(result.current.appliedFilters).toEqual([
        { column: "identification_mmsi", operator: "=", value: "A", combinator: "AND" },
      ]);
      expect(result.current.filters[0].value).toBe("A");
    });
  });

  // ── Pagination (Boundary Value Analysis) ────────────────────────────────

  describe("pagination", () => {
    it.each([0, 1, 100, Number.MAX_SAFE_INTEGER])("goToPage(%i) sets page verbatim (no upper bound enforced)", (page) => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(page));
      expect(result.current.page).toBe(page);
    });

    it("goToPage accepts a negative page (no lower-bound validation — Negative Testing)", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(-5));
      expect(result.current.page).toBe(-5);
    });

    it("changePageSize updates pageSize and resets page to 0", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(3));
      act(() => result.current.changePageSize(25));
      expect(result.current.pageSize).toBe(25);
      expect(result.current.page).toBe(0);
    });

    it("changePageSize accepts 0 without validation (Boundary / Negative Testing)", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.changePageSize(0));
      expect(result.current.pageSize).toBe(0);
    });

    it("goToPage/changePageSize are referentially stable (useCallback, empty deps)", () => {
      const { result, rerender } = renderHook(() => useVesselTable());
      const goRef = result.current.goToPage;
      const sizeRef = result.current.changePageSize;
      rerender();
      expect(result.current.goToPage).toBe(goRef);
      expect(result.current.changePageSize).toBe(sizeRef);
    });
  });

  // ── Sorting (State Transition Testing) ───────────────────────────────────

  describe("sorting", () => {
    it("toggleSort on a fresh column sets sortBy and defaults sortOrder to asc", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.toggleSort("colA"));
      expect(result.current.sortBy).toBe("colA");
      expect(result.current.sortOrder).toBe("asc");
    });

    it("toggleSort state machine: asc -> desc -> asc on the same column", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.toggleSort("colA"));
      expect(result.current.sortOrder).toBe("asc");
      act(() => result.current.toggleSort("colA"));
      expect(result.current.sortOrder).toBe("desc");
      act(() => result.current.toggleSort("colA"));
      expect(result.current.sortOrder).toBe("asc");
    });

    it("toggleSort on a different column resets sortOrder to asc regardless of prior column's order", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => { result.current.toggleSort("colA"); result.current.toggleSort("colA"); }); // colA now desc
      act(() => result.current.toggleSort("colB"));
      expect(result.current.sortBy).toBe("colB");
      expect(result.current.sortOrder).toBe("asc");
    });

    it("toggleSort resets page to 0", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(2));
      act(() => result.current.toggleSort("colA"));
      expect(result.current.page).toBe(0);
    });

    it("setSort sets both column and order directly, bypassing the toggle state machine", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.setSort("colX", "desc"));
      expect(result.current.sortBy).toBe("colX");
      expect(result.current.sortOrder).toBe("desc");
    });

    it("setSort(undefined, 'asc') clears the active sort column", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.setSort("colA", "desc"));
      act(() => result.current.setSort(undefined, "asc"));
      expect(result.current.sortBy).toBeUndefined();
    });

    it("setSort resets page to 0", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(4));
      act(() => result.current.setSort("colA", "asc"));
      expect(result.current.page).toBe(0);
    });
  });

  // ── Column visibility ─────────────────────────────────────────────────

  describe("column visibility", () => {
    it("toggleColumn adds a column not currently visible", () => {
      const { result } = renderHook(() => useVesselTable());
      const before = result.current.visibleColumns.length;
      act(() => result.current.toggleColumn("brand_new_col"));
      expect(result.current.visibleColumns).toContain("brand_new_col");
      expect(result.current.visibleColumns).toHaveLength(before + 1);
    });

    it("toggleColumn removes a column currently visible", () => {
      const { result } = renderHook(() => useVesselTable());
      const col = result.current.visibleColumns[0];
      act(() => result.current.toggleColumn(col));
      expect(result.current.visibleColumns).not.toContain(col);
    });

    it("toggleColumn twice on the same column is idempotent (add then remove returns to baseline set)", () => {
      const { result } = renderHook(() => useVesselTable());
      const before = [...result.current.visibleColumns];
      act(() => { result.current.toggleColumn("temp_col"); result.current.toggleColumn("temp_col"); });
      expect(result.current.visibleColumns).toEqual(before);
    });

    it("setColumnVisibility(model) shows only columns with truthy values and preserves already-visible ones marked true", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.setColumnVisibility({ identification_mmsi: true, identification_imo: false, new_col: true }));
      expect(result.current.visibleColumns).toContain("identification_mmsi");
      expect(result.current.visibleColumns).not.toContain("identification_imo");
      expect(result.current.visibleColumns).toContain("new_col");
    });

    it("after fetchVesselTableColumns resolves, visibleColumns is filtered to the intersection with allTableColumns", async () => {
      vi.mocked(fetchVesselTableColumns).mockResolvedValue(["only_a", "only_b"]);
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.allTableColumns).toEqual(["only_a", "only_b"]));
      result.current.visibleColumns.forEach((c) => expect(["only_a", "only_b"]).toContain(c));
    });
  });

  // ── toggleResults ──────────────────────────────────────────────────────

  describe("toggleResults (state transition)", () => {
    it("toggles showResults true -> false -> true", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.toggleResults());
      expect(result.current.showResults).toBe(false);
      act(() => result.current.toggleResults());
      expect(result.current.showResults).toBe(true);
    });

    it("when showResults becomes false, pageData is forced to the empty-state shape without a network call", async () => {
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.loading).toBe(false));
      vi.mocked(fetchVesselTable).mockClear();
      act(() => result.current.toggleResults());
      await waitFor(() => expect(result.current.pageData).toEqual({ rows: [], total: 0, returned: 0 }));
      expect(fetchVesselTable).not.toHaveBeenCalled();
    });

    it("toggling showResults back to true re-triggers a network fetch", async () => {
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.toggleResults());
      await waitFor(() => expect(result.current.pageData.rows).toEqual([]));
      vi.mocked(fetchVesselTable).mockClear();
      act(() => result.current.toggleResults());
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalled());
    });
  });

  // ── loadColumnOptions (caching / async behavior) ────────────────────────

  describe("loadColumnOptions", () => {
    it("fetches unique values with a limit of 10 for a fresh column", async () => {
      vi.mocked(fetchUniqueColumnValues).mockResolvedValue(["v1", "v2"]);
      const { result } = renderHook(() => useVesselTable());
      await act(async () => { await result.current.loadColumnOptions("identification_mmsi"); });
      expect(fetchUniqueColumnValues).toHaveBeenCalledWith("identification_mmsi", 10);
      expect(result.current.columnOptions.identification_mmsi).toEqual(["v1", "v2"]);
    });

    it("does not re-fetch for a column already cached with non-empty values (dedupe/caching behavior)", async () => {
      vi.mocked(fetchUniqueColumnValues).mockResolvedValue(["v1"]);
      const { result } = renderHook(() => useVesselTable());
      await act(async () => { await result.current.loadColumnOptions("col1"); });
      vi.mocked(fetchUniqueColumnValues).mockClear();
      await act(async () => { await result.current.loadColumnOptions("col1"); });
      expect(fetchUniqueColumnValues).not.toHaveBeenCalled();
    });

    it("re-fetches for a column previously cached with an EMPTY array (falsy .length guard re-triggers fetch — potential inefficiency)", async () => {
      vi.mocked(fetchUniqueColumnValues).mockResolvedValue([]);
      const { result } = renderHook(() => useVesselTable());
      await act(async () => { await result.current.loadColumnOptions("col1"); });
      vi.mocked(fetchUniqueColumnValues).mockClear();
      await act(async () => { await result.current.loadColumnOptions("col1"); });
      expect(fetchUniqueColumnValues).toHaveBeenCalledWith("col1", 10);
    });

    it("swallows fetch errors and does not populate columnOptions for that column (Failure Injection)", async () => {
      vi.mocked(fetchUniqueColumnValues).mockRejectedValue(new Error("fail"));
      const { result } = renderHook(() => useVesselTable());
      await expect(act(async () => { await result.current.loadColumnOptions("col1"); })).resolves.toBeUndefined();
      expect(result.current.columnOptions.col1).toBeUndefined();
    });

    it("different columns are cached independently", async () => {
      vi.mocked(fetchUniqueColumnValues).mockImplementation(async (col) => [`${col}-val`]);
      const { result } = renderHook(() => useVesselTable());
      await act(async () => { await result.current.loadColumnOptions("colA"); });
      await act(async () => { await result.current.loadColumnOptions("colB"); });
      expect(result.current.columnOptions).toEqual({ colA: ["colA-val"], colB: ["colB-val"] });
    });
  });

  // ── buildCqlFilter ───────────────────────────────────────────────────────

  describe("buildCqlFilter", () => {
    it("combines table and polygon filters via the cqlFilter model functions", () => {
      vi.mocked(buildWfsCqlFilter).mockReturnValue("col = 'v'");
      vi.mocked(buildPolygonCqlFilter).mockReturnValue("WITHIN(...)");
      vi.mocked(combineCqlFilters).mockReturnValue("(col = 'v') AND (WITHIN(...))");
      const { result } = renderHook(() => useVesselTable());
      const cql = result.current.buildCqlFilter([makeFilter()], [makePolygon("p1")]);
      expect(cql).toBe("(col = 'v') AND (WITHIN(...))");
    });

    it("returns undefined (not null) when combineCqlFilters yields null (type-coercion Boundary check)", () => {
      vi.mocked(combineCqlFilters).mockReturnValue(null);
      const { result } = renderHook(() => useVesselTable());
      const cql = result.current.buildCqlFilter([], []);
      expect(cql).toBeUndefined();
    });

    it("omitting polygonFilterList short-circuits and does not invoke buildPolygonCqlFilter at all", async () => {
      const { result } = renderHook(() => useVesselTable());
      // The mount's own load effect calls buildPolygonCqlFilter([]); clear that noise first.
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalled());
      vi.mocked(buildPolygonCqlFilter).mockClear();
      result.current.buildCqlFilter([makeFilter()]);
      expect(buildPolygonCqlFilter).not.toHaveBeenCalled();
    });

    it("is referentially stable (useCallback, empty deps)", () => {
      const { result, rerender } = renderHook(() => useVesselTable());
      const ref = result.current.buildCqlFilter;
      rerender();
      expect(result.current.buildCqlFilter).toBe(ref);
    });
  });

  // ── Saved filters (localStorage-backed, mocked) ─────────────────────────

  describe("saved filters", () => {
    it("saveCurrentFilter persists the name + current appliedFilters + polygonFilters", () => {
      vi.mocked(saveFilter).mockReturnValue([]);
      const polygons = [makePolygon("p1")];
      const { result } = renderHook(() => useVesselTable({ polygonFilters: polygons }));
      act(() => { result.current.addFilter(); result.current.applyFilters(); });
      act(() => result.current.saveCurrentFilter("my_preset"));
      expect(saveFilter).toHaveBeenCalledWith("my_preset", result.current.appliedFilters, polygons);
    });

    it("saveCurrentFilter updates the savedFilters list from the storage layer's return value", () => {
      const saved: SavedFilterSet[] = [{ name: "my_preset", filters: [], polygonFilters: [], createdAt: "now" }];
      vi.mocked(saveFilter).mockReturnValue(saved);
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.saveCurrentFilter("my_preset"));
      expect(result.current.savedFilters).toEqual(saved);
    });

    it("loadSavedFilter hydrates filters + appliedFilters from a matching preset by name", () => {
      const filter = makeFilter({ value: "loaded" });
      vi.mocked(loadSavedFilters).mockReturnValue([{ name: "preset1", filters: [filter], polygonFilters: [], createdAt: "now" }]);
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.loadSavedFilter("preset1"));
      expect(result.current.filters).toEqual([filter]);
      expect(result.current.appliedFilters).toEqual([filter]);
    });

    it("loadSavedFilter resets page to 0", () => {
      vi.mocked(loadSavedFilters).mockReturnValue([{ name: "preset1", filters: [], polygonFilters: [], createdAt: "now" }]);
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.goToPage(5));
      act(() => result.current.loadSavedFilter("preset1"));
      expect(result.current.page).toBe(0);
    });

    it("loadSavedFilter with an unknown name is a no-op (Negative Testing)", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.loadSavedFilter("does_not_exist"));
      expect(result.current.filters).toEqual([]);
    });

    it("loadSavedFilter invokes onPolygonFiltersChange with the preset's polygons", () => {
      const onPolygonFiltersChange = vi.fn();
      const polygons = [makePolygon("p1")];
      vi.mocked(loadSavedFilters).mockReturnValue([{ name: "preset1", filters: [], polygonFilters: polygons, createdAt: "now" }]);
      const { result } = renderHook(() => useVesselTable({ onPolygonFiltersChange }));
      act(() => result.current.loadSavedFilter("preset1"));
      expect(onPolygonFiltersChange).toHaveBeenCalledWith(polygons);
    });

    it("loadSavedFilter falls back to an empty array for onPolygonFiltersChange when the preset has no polygons (Missing Field)", () => {
      const onPolygonFiltersChange = vi.fn();
      vi.mocked(loadSavedFilters).mockReturnValue([{ name: "preset1", filters: [], polygonFilters: undefined, createdAt: "now" }]);
      const { result } = renderHook(() => useVesselTable({ onPolygonFiltersChange }));
      act(() => result.current.loadSavedFilter("preset1"));
      expect(onPolygonFiltersChange).toHaveBeenCalledWith([]);
    });

    it("loadSavedFilter does not throw when onPolygonFiltersChange is not provided", () => {
      vi.mocked(loadSavedFilters).mockReturnValue([{ name: "preset1", filters: [], polygonFilters: [], createdAt: "now" }]);
      const { result } = renderHook(() => useVesselTable());
      expect(() => act(() => result.current.loadSavedFilter("preset1"))).not.toThrow();
    });

    it("deleteSavedFilter (exposed as deleteSavedFilter) delegates to the storage API by name and refreshes savedFilters", () => {
      const remaining: SavedFilterSet[] = [{ name: "other", filters: [], polygonFilters: [], createdAt: "now" }];
      vi.mocked(deleteSavedFilter).mockReturnValue(remaining);
      const { result } = renderHook(() => useVesselTable());
      act(() => result.current.deleteSavedFilter("gone"));
      expect(deleteSavedFilter).toHaveBeenCalledWith("gone");
      expect(result.current.savedFilters).toEqual(remaining);
    });
  });

  // ── Data loading / async behavior / error handling ──────────────────────

  describe("data loading", () => {
    it("maps the raw WFS response through mapVesselTableResponse", async () => {
      const response = makeTableResponse(3);
      vi.mocked(fetchVesselTable).mockResolvedValue(response);
      vi.mocked(mapVesselTableResponse).mockReturnValue({ rows: [{ id: "1", properties: {} }], total: 1, returned: 1 });
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(mapVesselTableResponse).toHaveBeenCalledWith(response));
      expect(result.current.pageData.total).toBe(1);
    });

    it("surfaces the thrown Error's message directly on failure", async () => {
      vi.mocked(fetchVesselTable).mockRejectedValue(new Error("WFS 503 Service Unavailable"));
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.error).toBe("WFS 503 Service Unavailable"));
    });

    it("falls back to a generic message for a non-Error rejection", async () => {
      vi.mocked(fetchVesselTable).mockRejectedValue("plain string");
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.error).toBe("Failed to load vessel table"));
    });

    it("sets loading false after both success and failure paths", async () => {
      vi.mocked(fetchVesselTable).mockRejectedValueOnce(new Error("fail"));
      const { result, rerender } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.loading).toBe(false));
      vi.mocked(fetchVesselTable).mockResolvedValueOnce(makeTableResponse(1));
      await act(async () => { await result.current.refresh(); });
      rerender();
      expect(result.current.loading).toBe(false);
    });

    it("refresh() re-issues the query using current state (page/pageSize/sort/cqlFilter)", async () => {
      vi.mocked(fetchVesselTable).mockClear();
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(1));
      act(() => result.current.setSort("colX", "desc"));
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(2));
      const lastQuery = vi.mocked(fetchVesselTable).mock.calls[1][0];
      expect(lastQuery.sortBy).toBe("colX");
      expect(lastQuery.sortOrder).toBe("desc");
    });

    it("clears a previous error automatically at the start of the next successful load cycle", async () => {
      vi.mocked(fetchVesselTable).mockRejectedValueOnce(new Error("first failure"));
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.error).toBe("first failure"));
      vi.mocked(fetchVesselTable).mockResolvedValueOnce(makeTableResponse(2));
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBe("");
    });
  });

  // ── Polygon filters (props-driven) ──────────────────────────────────────

  describe("polygon filters (props)", () => {
    it("passes provided polygonFilters into buildPolygonCqlFilter on every load", async () => {
      const polygons = [makePolygon("p1")];
      renderHook(() => useVesselTable({ polygonFilters: polygons }));
      await waitFor(() => expect(buildPolygonCqlFilter).toHaveBeenCalledWith(polygons));
    });

    it("defaults to an empty polygon array when the option is omitted", async () => {
      renderHook(() => useVesselTable());
      await waitFor(() => expect(buildPolygonCqlFilter).toHaveBeenCalledWith([]));
    });

    it("changing the polygonFilters prop across renders triggers a re-fetch with the new cqlFilter", async () => {
      vi.mocked(fetchVesselTable).mockClear();
      const { rerender } = renderHook(({ polys }) => useVesselTable({ polygonFilters: polys }), {
        initialProps: { polys: [] as Polygon[] },
      });
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(1));
      rerender({ polys: [makePolygon("p1")] });
      await waitFor(() => expect(buildPolygonCqlFilter).toHaveBeenLastCalledWith([makePolygon("p1")]));
    });
  });

  // ── Race conditions / concurrent async requests ──────────────────────────

  describe("race conditions", () => {
    it("rapid consecutive page changes discard stale (slower) responses — latest page's data is preserved (request-id guard)", async () => {
      vi.mocked(mapVesselTableResponse).mockImplementation((resp) => ({
        rows: resp.features.map((f) => ({ id: f.id as string, properties: f.properties })),
        total: resp.totalFeatures,
        returned: resp.numberReturned,
      }));

      function taggedResponse(id: string): VesselTableResponseApi {
        return {
          type: "FeatureCollection",
          totalFeatures: 1,
          numberMatched: 1,
          numberReturned: 1,
          features: [{ type: "Feature", id, properties: {} }],
        };
      }

      let resolveFirst!: (v: VesselTableResponseApi) => void;
      let resolveSecond!: (v: VesselTableResponseApi) => void;
      vi.mocked(fetchVesselTable).mockClear();
      vi.mocked(fetchVesselTable)
        .mockResolvedValueOnce(makeTableResponse(5)) // initial mount load
        .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; })) // triggered by goToPage(1)
        .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r; })); // triggered by goToPage(2)

      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(1));

      act(() => result.current.goToPage(1));
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(2));
      act(() => result.current.goToPage(2));
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(3));

      // Page 2's request resolves first (fast network) — its data appears as expected.
      await act(async () => { resolveSecond(taggedResponse("page2")); });
      expect(result.current.pageData.rows[0]?.id).toBe("page2");

      // Page 1's stale request resolves after — its result is discarded by the request-id guard.
      await act(async () => { resolveFirst(taggedResponse("page1")); });
      expect(result.current.pageData.rows[0]?.id).toBe("page2");
    });

    it("concurrent manual refresh() calls all settle without throwing", async () => {
      const { result } = renderHook(() => useVesselTable());
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => {
        await Promise.all([result.current.refresh(), result.current.refresh(), result.current.refresh()]);
      });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── Cleanup / unmount ─────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("unmounting while the initial load is pending does not throw", async () => {
      vi.mocked(fetchVesselTable).mockImplementation(() => new Promise(() => {}));
      const { unmount } = renderHook(() => useVesselTable());
      expect(() => unmount()).not.toThrow();
    });

    it("unmounting while fetchVesselTableColumns is pending does not throw", async () => {
      vi.mocked(fetchVesselTableColumns).mockImplementation(() => new Promise(() => {}));
      const { unmount } = renderHook(() => useVesselTable());
      expect(() => unmount()).not.toThrow();
    });

    it("does not issue additional network calls purely from unrelated re-renders", async () => {
      const { rerender } = renderHook(() => useVesselTable());
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalledTimes(1));
      rerender();
      rerender();
      expect(fetchVesselTable).toHaveBeenCalledTimes(1);
    });
  });

  // ── Edge cases / mutation-mindset ────────────────────────────────────────

  describe("edge cases", () => {
    it("combined filter+sort+pagination+polygon state produces one coherent query object per load", async () => {
      vi.mocked(fetchVesselTable).mockClear();
      vi.mocked(buildWfsCqlFilter).mockReturnValue("mmsi = '123'");
      vi.mocked(buildPolygonCqlFilter).mockReturnValue("WITHIN(...)");
      vi.mocked(combineCqlFilters).mockReturnValue("(mmsi = '123') AND (WITHIN(...))");
      const { result } = renderHook(() => useVesselTable({ polygonFilters: [makePolygon("p1")] }));
      await waitFor(() => expect(fetchVesselTable).toHaveBeenCalled());
      act(() => { result.current.addFilter(); result.current.updateFilter(0, { value: "123" }); result.current.applyFilters(); });
      act(() => result.current.setSort("colA", "desc"));
      act(() => result.current.changePageSize(25));
      await waitFor(() => {
        const calls = vi.mocked(fetchVesselTable).mock.calls;
        const last = calls[calls.length - 1][0];
        expect(last.pageSize).toBe(25);
        expect(last.sortBy).toBe("colA");
        expect(last.sortOrder).toBe("desc");
        expect(last.page).toBe(0);
      });
    });

    it("removing a filter mid-way then adding a new one does not resurrect the removed one's values", () => {
      const { result } = renderHook(() => useVesselTable());
      act(() => { result.current.addFilter(); result.current.updateFilter(0, { value: "stale" }); });
      act(() => result.current.removeFilter(0));
      act(() => result.current.addFilter());
      expect(result.current.filters[0].value).toBe("");
    });

    it("toggleSort called on the same column many times in a row cycles asc/desc deterministically (Mutation-Mindset: off-by-one check)", () => {
      const { result } = renderHook(() => useVesselTable());
      const orders: Array<"asc" | "desc"> = [];
      for (let i = 0; i < 5; i++) {
        act(() => result.current.toggleSort("colA"));
        orders.push(result.current.sortOrder);
      }
      expect(orders).toEqual(["asc", "desc", "asc", "desc", "asc"]);
    });
  });
});
