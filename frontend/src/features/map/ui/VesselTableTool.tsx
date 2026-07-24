import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TablePagination,
  Typography,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
  type GridSortModel,
} from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import { PAGE_SIZE_OPTIONS } from "../model/config";
import { formatColumnName } from "@/shared/utils";

interface VesselTableToolProps {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
  allTableColumns: string[];
  visibleColumns: string[];
  showResults: boolean;
  pageData: {
    rows: { id: string | number; properties: Record<string, unknown> }[];
    total: number;
    returned: number;
  };
  loading: boolean;
  error: string;
  selectedVesselId?: string | null;
  onVesselRowSelect?: (
    row: { id: string | number; properties: Record<string, unknown> } | null
  ) => void;
  onGoToPage: (page: number) => void;
  onChangePageSize: (size: number) => void;
  onSetSort: (column: string | undefined, order: "asc" | "desc") => void;
  onToggleColumn: (column: string) => void;
  onSetColumnVisibility: (model: Record<string, boolean>) => void;
  onClose: () => void;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }
  return String(value);
}

function VesselTableTool({
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
  selectedVesselId = null,
  onVesselRowSelect,
  onGoToPage,
  onChangePageSize,
  onSetSort,
  onToggleColumn,
  onSetColumnVisibility,
  onClose,
}: VesselTableToolProps) {
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);

  const dataGridColumns = useMemo<GridColDef[]>(
    () =>
      allTableColumns.map((col) => ({
        field: col,
        headerName: formatColumnName(col),
        flex: 1,
        minWidth: 120,
        valueFormatter: (value: unknown) => formatValue(value),
      })),
    [allTableColumns]
  );

  const dataGridRows = useMemo(
    () =>
      showResults
        ? pageData.rows.map((row) => ({ id: row.id, ...row.properties }))
        : [],
    [pageData.rows, showResults]
  );

  const columnVisibilityModel = useMemo(
    () => Object.fromEntries(allTableColumns.map((col) => [col, visibleColumns.includes(col)])),
    [allTableColumns, visibleColumns]
  );

  const sortModel: GridSortModel = useMemo(
    () => (sortBy ? [{ field: sortBy, sort: sortOrder }] : []),
    [sortBy, sortOrder]
  );

  const rowSelectionModel: GridRowSelectionModel = useMemo(
    () => ({
      type: "include",
      ids: selectedVesselId != null ? new Set([selectedVesselId]) : new Set(),
    }),
    [selectedVesselId]
  );

  const handleRowSelectionModelChange = (model: GridRowSelectionModel) => {
    if (!onVesselRowSelect) return;
    const id = model.type === "include" ? [...model.ids][0] : undefined;
    if (id == null) {
      onVesselRowSelect(null);
      return;
    }
    const source = pageData.rows.find((row) => String(row.id) === String(id));
    if (source) {
      onVesselRowSelect(source);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TableChartOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>Vessel Table</Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={() => setColumnDialogOpen(true)} aria-label="select columns">
            <ViewColumnIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <Box px={2} py={1} sx={{ bgcolor: "action.hover" }}>
        <Typography variant="caption" color="textSecondary">
          {loading ? "Loading..." : showResults ? `${pageData.total} vessels matched` : "Results hidden"}
        </Typography>
      </Box>

      {error && (
        <Box px={2} py={1} sx={{ color: "error.main" }}>
          <Typography variant="caption">{error}</Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: "auto" }}>
        <DataGrid
          rows={dataGridRows}
          columns={dataGridColumns}
          loading={loading}
          paginationMode="server"
          sortingMode="server"
          rowCount={pageData.total}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            if (model.page !== page) onGoToPage(model.page);
            if (model.pageSize !== pageSize) onChangePageSize(model.pageSize);
          }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          sortModel={sortModel}
          onSortModelChange={(model) => {
            const item = model[0];
            if (item?.sort) {
              onSetSort(item.field, item.sort);
            }
          }}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(model) => onSetColumnVisibility(model)}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={handleRowSelectionModelChange}
          onRowClick={(params) => {
            if (!onVesselRowSelect) return;
            const source = pageData.rows.find((row) => String(row.id) === String(params.id));
            if (source) onVesselRowSelect(source);
          }}
          disableMultipleRowSelection
          disableColumnFilter
          disableVirtualization
          hideFooter
          density="compact"
          slots={{
            noRowsOverlay: () => (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography variant="body2" color="textSecondary">
                  {showResults ? "No vessels found" : "Results hidden"}
                </Typography>
              </Box>
            ),
          }}
          sx={{
            border: "none",
            "& .MuiDataGrid-main": { overflow: "auto" },
            "& .MuiDataGrid-row:focus, & .MuiDataGrid-row:focus-within": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: -2,
            },
          }}
        />
      </Box>

      <Box
        px={2}
        py={1}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ borderTop: 1, borderColor: "divider" }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="textSecondary">
            Rows per page:
          </Typography>
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => onChangePageSize(Number(e.target.value))}
            sx={{ fontSize: "0.75rem", height: 28 }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <TablePagination
          component="div"
          count={pageData.total}
          page={page}
          onPageChange={(_, newPage) => onGoToPage(newPage)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
        />
      </Box>

      <Dialog open={columnDialogOpen} onClose={() => setColumnDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select Columns</DialogTitle>
        <DialogContent>
          <Stack spacing={0.5}>
            {allTableColumns.map((col: string) => (
              <FormControlLabel
                key={col}
                control={
                  <Checkbox
                    checked={visibleColumns.includes(col)}
                    onChange={() => onToggleColumn(col)}
                  />
                }
                label={formatColumnName(col)}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VesselTableTool;
