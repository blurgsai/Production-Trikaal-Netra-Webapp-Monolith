import { useState, useCallback, useEffect } from "react";

export const useTableColumns = (
  initialColumns: string[] = [],
  onApplyColumns?: (columns: string[]) => void,
) => {
  const [selected, setSelected] = useState<string[]>(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setSelected(initialColumns);
  }, [initialColumns]);

  const toggleColumn = useCallback((value: string) => {
    setSelected((prev) => {
      const exists = prev.includes(value);

      if (exists) {
        return prev.filter((column) => column !== value);
      }

      return [...prev, value];
    });
  }, []);

  const selectAll = useCallback(
    (
      allColumns: Array<{
        value: string;
      }>,
    ) => {
      setSelected(allColumns.map((column) => column.value));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setSelected([]);
  }, []);

  const applyColumns = useCallback(() => {
    onApplyColumns?.(selected);
    return selected;
  }, [selected, onApplyColumns]);

  const filterColumns = useCallback(
    <
      T extends {
        label: string;
      },
    >(
      columns: T[],
    ) => {
      if (!searchQuery.trim()) {
        return columns;
      }

      const search = searchQuery.toLowerCase();

      return columns.filter((column) =>
        column.label.toLowerCase().includes(search),
      );
    },
    [searchQuery],
  );

  const resetSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    selected,
    setSelected,
    searchQuery,
    setSearchQuery,
    toggleColumn,
    selectAll,
    clearAll,
    applyColumns,
    filterColumns,
    resetSearch,
  };
};
