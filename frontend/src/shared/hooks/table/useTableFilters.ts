import { useState, useCallback, useEffect } from "react";

export interface FilterRow {
  id: number;
  field: string;
  operator: string;
  value: unknown;
  value2?: unknown;
  logic: "AND" | "OR";
}

export interface AppliedFilter {
  field: string;
  operator: string;
  value: unknown;
  value2?: unknown;
  logic?: "AND" | "OR";
}

const createFilterRow = (): FilterRow => ({
  id: Date.now() + Math.random(),
  field: "",
  operator: "",
  value: "",
  value2: "",
  logic: "AND",
});

const mapAppliedFiltersToRows = (
  appliedFilters: AppliedFilter[] = [],
): FilterRow[] => {
  if (!appliedFilters.length) {
    return [createFilterRow()];
  }

  return appliedFilters.map((filter, index) => ({
    id: Date.now() + Math.random() + index,
    field: filter.field || "",
    operator: filter.operator || "",
    value: filter.value ?? "",
    value2: filter.value2 ?? "",
    logic: index === 0 ? "AND" : filter.logic || "AND",
  }));
};

export const useTableFilters = (
  onApplyFilters?: (filters: AppliedFilter[]) => void,
  initialFilters: AppliedFilter[] = [],
) => {
  const [filterRows, setFilterRows] = useState<FilterRow[]>(
    mapAppliedFiltersToRows(initialFilters),
  );

  useEffect(() => {
    setFilterRows(mapAppliedFiltersToRows(initialFilters));
  }, [initialFilters]);

  const addFilterRow = useCallback(() => {
    setFilterRows((prev) => [...prev, createFilterRow()]);
  }, []);

  const removeFilterRow = useCallback((rowId: number) => {
    setFilterRows((prev) => {
      if (prev.length <= 1) {
        return [createFilterRow()];
      }

      return prev.filter((row) => row.id !== rowId);
    });
  }, []);

  const updateFilterRow = useCallback(
    (rowId: number, updates: Partial<FilterRow>) => {
      setFilterRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)),
      );
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setFilterRows([createFilterRow()]);
    onApplyFilters?.([]);
  }, [onApplyFilters]);

  const applyFilters = useCallback(() => {
    const validFilters = filterRows.filter((row) => {
      const isBetween = row.operator === "between";

      return (
        row.field &&
        row.operator &&
        row.value !== "" &&
        row.value !== null &&
        (!isBetween || (row.value2 !== "" && row.value2 !== null))
      );
    });

    const formattedFilters: AppliedFilter[] = validFilters.map(
      (filter, index) => ({
        field: filter.field,
        operator: filter.operator,
        value: filter.value,

        ...(filter.value2 !== "" &&
        filter.value2 !== undefined &&
        filter.value2 !== null
          ? { value2: filter.value2 }
          : {}),

        ...(index > 0 ? { logic: filter.logic } : {}),
      }),
    );

    onApplyFilters?.(formattedFilters);

    return formattedFilters;
  }, [filterRows, onApplyFilters]);

  const getValidFilterCount = useCallback(() => {
    return filterRows.filter((row) => {
      const isBetween = row.operator === "between";

      return (
        row.field &&
        row.operator &&
        row.value !== "" &&
        row.value !== null &&
        (!isBetween || (row.value2 !== "" && row.value2 !== null))
      );
    }).length;
  }, [filterRows]);

  const resetFilters = useCallback(() => {
    setFilterRows([createFilterRow()]);
  }, []);

  return {
    filterRows,

    addFilterRow,
    removeFilterRow,
    updateFilterRow,

    clearAllFilters,
    applyFilters,

    getValidFilterCount,
    resetFilters,

    setFilterRows,
  };
};
