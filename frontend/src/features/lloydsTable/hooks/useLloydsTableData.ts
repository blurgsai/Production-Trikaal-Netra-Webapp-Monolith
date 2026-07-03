import { useQuery } from "@tanstack/react-query";

import { fetchTableData } from "../api/lloydsTableApi";
import { mapTableData } from "../model/mappers";
import type { AppliedFilter } from "@/shared/hooks/table/useTableFilters";

export interface LloydsTableQueryParams {
  page: number;
  pageSize: number;
  fields?: string[];
  filters?: AppliedFilter[];
  sortField?: string | null;
  sortOrder?: "asc" | "desc" | null;
}

export const useLloydsTableData = (params: LloydsTableQueryParams) => {
  return useQuery({
    queryKey: ["lloyds-table", params],

    queryFn: async () => {
      const response = await fetchTableData({
        page: params.page + 1,
        page_size: params.pageSize,

        fields:
          params.fields && params.fields.length > 0
            ? params.fields.join(",")
            : undefined,

        filters: params.filters?.length
          ? JSON.stringify(params.filters)
          : undefined,

        sort_field: params.sortField || undefined,
        sort_order: params.sortOrder || undefined,
      });

      const mapped = mapTableData(response);

      // TEMP-fix: Remove once backend duplicate issue is fixed
      const uniqueRows = Array.from(
        new Map(mapped.rows.map((row) => [row.vessel_id, row])).values(),
      );

      return {
        ...mapped,
        rows: uniqueRows,
      };
    },

    placeholderData: (previousData) => previousData,
  });
};
