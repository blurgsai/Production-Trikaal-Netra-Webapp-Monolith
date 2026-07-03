import { useMemo, useState } from "react";
import { Box } from "@mui/material";

import DynamicTable from "@/shared/ui/table/DynamicTable";
import { TimezoneProvider } from "@/shared/contexts/TimezoneContext";
import theme from "@/shared/theme/tableUiTheme";
import type { AppliedFilter } from "@/shared/hooks/table/useTableFilters";

import { useLloydsMetadata } from "../hooks/useLloydsMetadata";
import { useLloydsTableData } from "../hooks/useLloydsTableData";
import { useLloydsTableExport } from "../hooks/useLloydsTableExport";
import { useLloydsDistinctValues } from "../hooks/useLloydsDistinctValues";

import {
  LLOYDS_PRIORITY_COLUMNS,
  LLOYDS_PRIMARY_KEY_FIELD,
} from "../constants/priorityColumns";

export function LloydsTable() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<AppliedFilter[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const metadataQuery = useLloydsMetadata();
  const metadata = metadataQuery.data ?? null;

  const defaultColumns = useMemo(() => {
    if (!metadata) return [];

    const allFields = metadata.columns.map((column) => column.field);

    const prioritized = LLOYDS_PRIORITY_COLUMNS.filter((field) =>
      allFields.includes(field),
    );

    const remaining = allFields.filter((field) => !prioritized.includes(field));

    return [...prioritized, ...remaining].slice(0, 8);
  }, [metadata]);

  const activeColumns =
    visibleColumns.length > 0 ? visibleColumns : defaultColumns;

  const tableQuery = useLloydsTableData({
    page,
    pageSize,
    fields: activeColumns,
    filters,
    sortField,
    sortOrder,
  });

  const exportHook = useLloydsTableExport();
  const getFieldValues = useLloydsDistinctValues();

  const handleRequestSort = (field: string, forcedDirection?: string) => {
    if (forcedDirection === "unsort") {
      setSortField(null);
      setSortOrder(null);
      return;
    }

    if (forcedDirection) {
      setSortField(field);
      setSortOrder(forcedDirection as "asc" | "desc");
      return;
    }

    if (sortField === field) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else if (sortOrder === "desc") {
        setSortField(null);
        setSortOrder(null);
      } else {
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <TimezoneProvider>
      <Box
        sx={{
          width: "100%",
          height: "calc(100vh - 80px)",
          overflow: "hidden",
          p: 3,
        }}
      >
        <DynamicTable
          loading={metadataQuery.isLoading || tableQuery.isLoading}
          metadata={metadata}
          tableData={tableQuery.data?.rows ?? []}
          totalRecords={tableQuery.data?.pagination?.totalRecords ?? 0}
          page={page}
          rowsPerPage={pageSize}
          visibleColumns={activeColumns}
          filters={filters}
          sortConfig={{
            field: sortField,
            order: sortOrder,
          }}
          handleChangePage={(_, newPage) => setPage(newPage)}
          handleChangeRowsPerPage={(event) => {
            setPageSize(Number(event.target.value));
            setPage(0);
          }}
          handleApplyColumns={(columns) => {
            setVisibleColumns(columns);
            setPage(0);
          }}
          handleApplyFilters={(newFilters) => {
            setFilters(newFilters);
            setPage(0);
          }}
          handleRequestSort={handleRequestSort}
          exporting={exportHook.exporting}
          handleExport={exportHook.handleExport}
          theme={theme}
          getFieldValues={getFieldValues}
          primaryKeyField={LLOYDS_PRIMARY_KEY_FIELD}
        />
      </Box>
    </TimezoneProvider>
  );
}
