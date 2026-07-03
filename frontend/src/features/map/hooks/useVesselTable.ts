import { useState, useEffect, useCallback, useMemo } from "react";
import type { VesselTableFilter, SavedFilterSet, Polygon, VesselTableQuery } from "../model/types";
import { fetchVesselTable, fetchVesselTableColumns, fetchUniqueColumnValues } from "../api/vesselTableApi";
import { mapVesselTableResponse, type VesselTablePage } from "../model/mappers.vesselTable";
import { buildWfsCqlFilter, buildPolygonCqlFilter, combineCqlFilters } from "../model/cqlFilter";
import { loadSavedFilters, saveFilter, deleteSavedFilter } from "../api/vesselFilterStorage";
import { DEFAULT_TABLE_COLUMNS, DEFAULT_PAGE_SIZE } from "../model/config";

interface UseVesselTableOptions {
  pageSize?: number;
  polygonFilters?: Polygon[];
  onPolygonFiltersChange?: (polygons: Polygon[]) => void;
}

export function useVesselTable(options: UseVesselTableOptions = {}) {
  const { polygonFilters = [], onPolygonFiltersChange } = options;
  const [filters, setFilters] = useState<VesselTableFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<VesselTableFilter[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(options.pageSize ?? DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [allTableColumns, setAllTableColumns] = useState<string[]>(DEFAULT_TABLE_COLUMNS);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_TABLE_COLUMNS);
  const [showResults, setShowResults] = useState(true);
  const [pageData, setPageData] = useState<VesselTablePage>({ rows: [], total: 0, returned: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [columnOptions, setColumnOptions] = useState<Record<string, string[]>>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilterSet[]>([]);

  const cqlFilter = useMemo(() => {
    const tableFilter = buildWfsCqlFilter(appliedFilters);
    const polygonFilter = buildPolygonCqlFilter(polygonFilters);
    return combineCqlFilters([tableFilter, polygonFilter]) ?? undefined;
  }, [appliedFilters, polygonFilters]);

  useEffect(() => {
    fetchVesselTableColumns()
      .then((columns) => {
        setAllTableColumns(columns);
      })
      .catch((err) => {
        console.error("Failed to fetch columns:", err);
      });
  }, []);

  useEffect(() => {
    setSavedFilters(loadSavedFilters());
  }, []);

  useEffect(() => {
    setVisibleColumns((prev) => prev.filter((col) => allTableColumns.includes(col)));
  }, [allTableColumns]);

  const load = useCallback(async () => {
    if (!showResults) {
      setPageData({ rows: [], total: 0, returned: 0 });
      return;
    }
    setLoading(true);
    setError("");
    try {
      console.log("🔍 Table CQL Debug:", {
        appliedFilters,
        polygonFilters,
        cqlFilter,
      });
      
      const query: VesselTableQuery = {
        cqlFilter,
        page,
        pageSize,
        sortBy,
        sortOrder,
      };
      const response = await fetchVesselTable(query);
      setPageData(mapVesselTableResponse(response));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load vessel table";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [cqlFilter, page, pageSize, sortBy, sortOrder, showResults]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setPage(0);
  }, [filters]);

  const addFilter = useCallback(() => {
    setFilters((prev) => [
      ...prev,
      { column: "identification_mmsi", operator: "=", value: "", combinator: "AND" },
    ]);
    setPage(0);
  }, []);

  const updateFilter = useCallback((index: number, update: Partial<VesselTableFilter>) => {
    setFilters((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
    setPage(0);
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
    setPage(0);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters([]);
    setAppliedFilters([]);
    setPage(0);
  }, []);

  const goToPage = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  const toggleSort = useCallback((column: string) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
        return column;
      }
      setSortOrder("asc");
      return column;
    });
    setPage(0);
  }, []);

  const setSort = useCallback((column: string | undefined, order: "asc" | "desc") => {
    setSortBy(column);
    setSortOrder(order);
    setPage(0);
  }, []);

  const toggleColumn = useCallback((column: string) => {
    setVisibleColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  }, []);

  const setColumnVisibility = useCallback((model: Record<string, boolean>) => {
    setVisibleColumns((prev) => {
      const stillVisible = prev.filter((col) => model[col]);
      const newlyVisible = Object.keys(model).filter((col) => model[col] && !prev.includes(col));
      return [...stillVisible, ...newlyVisible];
    });
  }, []);

  const toggleResults = useCallback(() => {
    setShowResults((prev) => !prev);
  }, []);

  const loadColumnOptions = useCallback(async (column: string) => {
    if (columnOptions[column]?.length) return;
    try {
      const values = await fetchUniqueColumnValues(column, 10);
      setColumnOptions((prev) => ({ ...prev, [column]: values }));
    } catch (err) {
      console.error(`Failed to load options for ${column}:`, err);
    }
  }, [columnOptions]);

  const buildCqlFilter = useCallback(
    (filterList: VesselTableFilter[], polygonFilterList?: Polygon[]) => {
      const tableFilter = buildWfsCqlFilter(filterList);
      const polygonFilter = polygonFilterList ? buildPolygonCqlFilter(polygonFilterList) : null;
      return combineCqlFilters([tableFilter, polygonFilter]) ?? undefined;
    },
    []
  );

  const saveCurrentFilter = useCallback(
    (name: string) => {
      const updated = saveFilter(name, appliedFilters, polygonFilters);
      setSavedFilters(updated);
    },
    [appliedFilters, polygonFilters]
  );

  const loadSavedFilter = useCallback(
    (name: string) => {
      const found = savedFilters.find((s) => s.name === name);
      if (!found) return;
      setFilters(found.filters);
      setAppliedFilters(found.filters);
      onPolygonFiltersChange?.(found.polygonFilters ?? []);
      setPage(0);
    },
    [savedFilters, onPolygonFiltersChange]
  );

  const deleteSavedFilterByName = useCallback((name: string) => {
    const updated = deleteSavedFilter(name);
    setSavedFilters(updated);
  }, []);

  return {
    filters,
    appliedFilters,
    cqlFilter,
    page,
    pageSize,
    sortBy,
    sortOrder,
    allTableColumns,
    visibleColumns,
    showResults,
    pageData,
    loading,
    error,
    columnOptions,
    savedFilters,
    applyFilters,
    addFilter,
    updateFilter,
    removeFilter,
    resetFilters,
    goToPage,
    changePageSize,
    toggleSort,
    setSort,
    toggleColumn,
    setColumnVisibility,
    toggleResults,
    loadColumnOptions,
    buildCqlFilter,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter: deleteSavedFilterByName,
    refresh: load,
  };
}
