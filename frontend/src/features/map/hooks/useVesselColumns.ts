import { useCallback } from "react";
import { fetchVesselTableColumns, searchColumnValues } from "../api/vesselTableApi";

export function useVesselColumns() {
  const fetchColumns = useCallback(() => fetchVesselTableColumns(), []);
  const searchValues = useCallback(
    (column: string, query: string, limit: number) =>
      searchColumnValues(column, query, limit),
    []
  );
  return { fetchColumns, searchValues };
}
