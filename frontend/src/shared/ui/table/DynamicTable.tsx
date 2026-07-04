import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Typography,
  TablePagination,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  TableSortLabel,
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SortIcon from "@mui/icons-material/Sort";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SettingsIcon from "@mui/icons-material/Settings";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import CustomiseColumns from "@/shared/ui/table/CustomiseColumns";
import ProgressiveFilter from "@/shared/ui/table/ProgressiveFilter";
import TableExport from "@/shared/ui/table/TableExport";

import type { AppliedFilter } from "@/shared/hooks/table/useTableFilters";
import { useTimezone } from "@/shared/contexts/TimezoneContext";
import { timestampToMs } from "@/shared/utils/timestampHelpers";
import { getOperatorsByType } from "@/shared/utils/tableHelpers";

import type { SxProps } from "@mui/system";
import type { TableMetadata } from "../../model/table/types";
import type { TableUiTheme } from "@/shared/theme/tableUiTheme";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// ── Types
type TableColumn = {
  field: string;
  label: string;
  type: string;
};

export interface ExportField {
  field: string;
  label: string;
}

export type ExportFormat = "csv" | "xml" | "xls" | "kml" | "gml";
export type TableRowData = Record<string, unknown>;

interface DynamicTableProps {
  loading: boolean;
  metadata: TableMetadata | null;

  tableData: TableRowData[];
  totalRecords: number;

  page: number;
  rowsPerPage: number;

  visibleColumns: string[];
  filters: AppliedFilter[];

  sortConfig: {
    field: string | null;
    order: "asc" | "desc" | null;
  };

  handleChangePage: (event: unknown, page: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;

  handleApplyColumns: (columns: string[]) => void;
  handleApplyFilters: (filters: AppliedFilter[]) => void;

  handleRequestSort: (field: string, forcedDirection?: string) => void;

  exporting: boolean;
  handleExport: (
    fields: ExportField[],
    filters: AppliedFilter[],
    format: ExportFormat,
  ) => Promise<{ success: boolean; message?: string }>;

  getFieldValues?: (field: string, search?: string) => Promise<string[]>;

  theme: TableUiTheme;

  vesselFlags?: Record<string, string>;
  columnRenderers?: Record<
    string,
    (value: unknown, row: TableRowData) => React.ReactNode
  >;

  primaryKeyField: string;
  getRowStyle?: (row: Record<string, unknown>) => SxProps;

  showRowActions?: boolean;
  onRowAction?: (
    event: React.MouseEvent<HTMLElement>,
    row: Record<string, unknown>,
  ) => void;
  toolbarActions?: React.ReactNode;
  exportFormats?: ExportFormat[];
}

export default function DynamicTable({
  loading,
  metadata,
  tableData,
  totalRecords,

  page,
  rowsPerPage,

  visibleColumns,
  filters,

  sortConfig,

  handleChangePage,
  handleChangeRowsPerPage,

  handleApplyColumns,
  handleApplyFilters,

  handleRequestSort,

  exporting,
  handleExport,

  getFieldValues,

  theme,

  vesselFlags = {},
  columnRenderers = {},

  primaryKeyField,
  getRowStyle,
  showRowActions = false,
  onRowAction,
  toolbarActions,
  exportFormats = ["csv", "xml", "xls"],
}: DynamicTableProps) {
  const { selectedTimezone, setSelectedTimezone } = useTimezone();

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [activeColumn, setActiveColumn] = useState<TableColumn | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);

  useEffect(() => {
    setSelectedRows([]);
  }, [tableData]);

  const filteredColumns = useMemo<TableColumn[]>(() => {
    if (!metadata?.columns) return [];

    return visibleColumns
      .map((fieldName) => {
        const column = metadata.columns.find((c) => c.field === fieldName);

        return {
          field: fieldName,
          label: column?.label ?? fieldName,
          type: column?.type ?? "string",
        };
      })
      .filter(Boolean);
  }, [metadata, visibleColumns]);

  const columnOptions = useMemo(() => {
    if (!metadata?.columns) return [];

    return metadata.columns.map((column) => ({
      value: column.field,
      label: column.label,
    }));
  }, [metadata]);

  const filterColumns = useMemo(() => {
    if (!metadata?.columns) return [];

    return metadata.columns.map((column) => ({
      field: column.field,
      label: column.label,
      type: column.type,
    }));
  }, [metadata]);

  const renderCellValue = (row: TableRowData, column: TableColumn) => {
    const value = row[column.field];
    if (columnRenderers[column.field])
      return columnRenderers[column.field](value, row);
    if (value == null) return "NA";

    if (
      column.type === "timestamp" ||
      column.field?.toLowerCase().includes("timestamp")
    ) {
      try {
        const msValue = timestampToMs(value);
        if (!msValue || !Number.isFinite(msValue)) return "NA";
        return dayjs(msValue)
          .tz(selectedTimezone)
          .format("YYYY-MM-DD HH:mm:ss");
      } catch {
        return "NA";
      }
    }

    if (column.type === "date" || column.type === "datetime") {
      const ms = new Date(value as string | number | Date).getTime();
      if (!Number.isFinite(ms)) return "NA";
      return dayjs(ms).tz(selectedTimezone).format("YYYY-MM-DD HH:mm:ss");
    }

    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj.lat && obj.lon) return `${obj.lat}, ${obj.lon}`;
      return JSON.stringify(value);
    }

    return String(value);
  };

  const getRowKey = (row: TableRowData, idx: number): string => {
    const rowKey = primaryKeyField ? row[primaryKeyField] : idx;

    if (rowKey !== undefined && rowKey !== null) {
      return String(rowKey);
    }

    return `row-${idx}`;
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    column: TableColumn,
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveColumn(column);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveColumn(null);
  };

  const handleSortAction = (direction: string) => {
    if (!activeColumn) return;
    handleRequestSort(activeColumn.field, direction);
    handleMenuClose();
  };

  const handleHideAction = () => {
    if (!activeColumn?.field) return;
    handleApplyColumns(visibleColumns.filter((f) => f !== activeColumn.field));
    handleMenuClose();
  };

  const handleManageAction = () => {
    handleMenuClose();

    const button = document.querySelector(
      '[data-columns-button="true"]',
    ) as HTMLButtonElement;

    button?.click();
  };

  const handleSelectRow = (id: string) => {
    const idx = selectedRows.indexOf(id);
    let next: string[] = [];
    if (idx === -1) next = [...selectedRows, id];
    else if (idx === 0) next = selectedRows.slice(1);
    else if (idx === selectedRows.length - 1) next = selectedRows.slice(0, -1);
    else next = [...selectedRows.slice(0, idx), ...selectedRows.slice(idx + 1)];
    setSelectedRows(next);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(tableData.map((row, idx) => getRowKey(row, idx)));
    } else {
      setSelectedRows([]);
    }
  };

  if (loading && !tableData.length) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", p: 4, gap: 1.5 }}>
        <CircularProgress sx={{ color: theme.primaryColor }} />
        <Typography variant="body2" color="text.secondary">Loading data…</Typography>
      </Box>
    );
  }

  if (!metadata) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", p: 4, gap: 1 }}>
        <ErrorOutlineIcon sx={{ fontSize: 32, color: "error.main" }} />
        <Typography variant="body2" color="error">
          Failed to load table metadata
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.backgroundColor,
        minHeight: 0,
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        p: 0,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: 2,
        boxShadow: "none",
      }}
    >
      {/* ── Toolbar ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          p: 2,
          backgroundColor: theme.surfaceColor,
          flexWrap: "wrap",
          gap: 2,
          borderBottom: `1px solid ${theme.borderColor}`,
          minHeight: "60px",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel
            sx={{
              color: theme.textMuted,
              "&.Mui-focused": { color: theme.primaryColor },
            }}
          >
            Timezone
          </InputLabel>
          <Select
            value={selectedTimezone}
            label="Timezone"
            onChange={(e) => setSelectedTimezone(e.target.value)}
            sx={{
              color: theme.textColor,
              ".MuiOutlinedInput-notchedOutline": {
                borderColor: theme.primaryColor,
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.primaryHoverColor,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.primaryColor,
              },
              ".MuiSvgIcon-root": { color: theme.primaryColor },
              height: "36.5px",
              backgroundColor: theme.inputBackgroundColor,
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: theme.popoverBackgroundColor,
                  color: theme.textColor,
                  border: `1px solid ${theme.borderColor}`,
                  "& .MuiMenuItem-root:hover": {
                    backgroundColor: theme.primarySoft,
                  },
                  "& .Mui-selected": {
                    backgroundColor: `${theme.primarySoft} !important`,
                  },
                },
              },
            }}
          >
            <MenuItem value="Asia/Kolkata">India (IST)</MenuItem>
            <MenuItem value="UTC">UTC</MenuItem>
            <MenuItem value="America/New_York">New York (EST)</MenuItem>
            <MenuItem value="Europe/London">London (GMT)</MenuItem>
            <MenuItem value="Asia/Tokyo">Tokyo (JST)</MenuItem>
            <MenuItem value="Australia/Sydney">Sydney (AEST)</MenuItem>
          </Select>
        </FormControl>

        <ProgressiveFilter
          columns={filterColumns}
          appliedFilters={filters}
          onApplyFilters={handleApplyFilters}
          getOperatorsByType={getOperatorsByType}
          getFieldValues={getFieldValues}
          theme={theme}
        />

        <CustomiseColumns
          onApplyColumns={handleApplyColumns}
          options={columnOptions}
          initialSelected={visibleColumns}
          open={columnsOpen}
          onOpen={() => setColumnsOpen(true)}
          onClose={() => setColumnsOpen(false)}
        />

        {toolbarActions}

        <TableExport
          exporting={exporting}
          theme={theme}
          disabled={tableData.length === 0 || visibleColumns.length === 0}
          exportFormats={exportFormats}
          onExport={async (format) => {
            const exportFields = filteredColumns.map((column) => ({
              field: column.field,
              label: column.label,
            }));

            const result = await handleExport(exportFields, filters, format);

            if (result && !result.success) {
              console.error(result.message);
            }
          }}
        />
      </Box>

      <Paper
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme.tableBackgroundColor,
          boxShadow: "none",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          minHeight: 0,
          borderRadius: 0,
        }}
      >
        <TableContainer
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            overflowY: "auto",
            overflowX: "auto",
            position: "relative",
            "&::-webkit-scrollbar": { height: "8px", width: "8px" },
            "&::-webkit-scrollbar-track": {
              backgroundColor: theme.tableBackgroundColor,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(255,255,255,0.22)",
              borderRadius: "10px",
              border: `2px solid ${theme.tableBackgroundColor}`,
            },
          }}
        >
          {loading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                backgroundColor: theme.overlayColor,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          )}

          <Table
            sx={{
              width: "max-content",
              minWidth: "100%",
              tableLayout: "auto",
            }}
          >
            {/* ══ HEAD ══ */}
            <TableHead sx={{ position: "sticky", top: 0, zIndex: 12 }}>
              <TableRow>
                {/* Checkbox col */}
                <TableCell
                  sx={{
                    width: "50px",
                    minWidth: "50px",
                    maxWidth: "50px",
                    padding: 0,
                    textAlign: "center",
                    verticalAlign: "middle",
                    backgroundColor: theme.headerBackgroundColor,
                    position: "sticky",
                    left: 0,
                    top: 0,
                    zIndex: 15,
                    border: `.5px solid ${theme.borderColor}`,
                    boxShadow: "2px 0 5px -2px rgba(0,0,0,0.5)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Checkbox
                      size="small"
                      sx={{
                        p: 0.5,
                        color: theme.borderColor,
                        "&.Mui-checked": { color: theme.primaryColor },
                        "&.MuiCheckbox-indeterminate": {
                          color: theme.primaryColor,
                        },
                      }}
                      indeterminate={
                        selectedRows.length > 0 &&
                        selectedRows.length < tableData.length
                      }
                      checked={
                        tableData.length > 0 &&
                        selectedRows.length === tableData.length
                      }
                      onChange={handleSelectAllClick}
                    />
                  </Box>
                </TableCell>

                {/* Data cols */}
                {filteredColumns.map((column, colIndex) => {
                  const isPrimaryId =
                    column.field.toLowerCase() ===
                    primaryKeyField.toLowerCase();
                  return (
                    <React.Fragment key={column.field}>
                      <TableCell
                        key={column.field}
                        sortDirection={
                          sortConfig.field === column.field
                            ? (sortConfig.order ?? false)
                            : false
                        }
                        sx={{
                          backgroundColor: theme.headerBackgroundColor,
                          color: theme.textColor,
                          border: `.5px solid ${theme.borderColor}`,
                          fontWeight: 600,
                          padding: "8px 12px",
                          minWidth: "150px",
                          position: isPrimaryId ? "sticky" : "relative",
                          left: isPrimaryId ? "50px" : "auto",
                          top: 0,
                          zIndex: isPrimaryId ? 20 : 2,
                          boxShadow: isPrimaryId
                            ? "2px 0 5px -2px rgba(0,0,0,0.5)"
                            : "none",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          "&:hover": {
                            backgroundColor: theme.hoverBackgroundColor,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            gap: 0.5,
                          }}
                        >
                          <TableSortLabel
                            active={
                              sortConfig.field === column.field &&
                              !!sortConfig.order
                            }
                            direction={
                              sortConfig.field === column.field &&
                              sortConfig.order
                                ? sortConfig.order
                                : "asc"
                            }
                            onClick={() => handleRequestSort(column.field)}
                            sx={{
                              color: `${theme.textColor} !important`,
                              "&.Mui-active": {
                                color: `${theme.primaryColor} !important`,
                              },
                              "& .MuiTableSortLabel-icon": {
                                color: `${theme.primaryColor} !important`,
                              },
                              "&:hover": { color: theme.primaryColor },
                              flexGrow: 1,
                              minWidth: 0,
                              maxWidth: "calc(100% - 24px)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            hideSortIcon={false}
                          >
                            {column.label}
                          </TableSortLabel>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, column);
                            }}
                            sx={{
                              padding: "2px",
                              color: theme.textColor,
                              "&:hover": { color: theme.primaryColor },
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      {showRowActions &&
                        colIndex === filteredColumns.length - 1 && (
                          <TableCell
                            sx={{
                              width: "56px",
                              minWidth: "56px",
                              maxWidth: "56px",
                              padding: 0,
                              backgroundColor: theme.headerBackgroundColor,
                              position: "sticky",
                              right: 0,
                              top: 0,
                              zIndex: 15,
                              border: `.5px solid ${theme.borderColor}`,
                              boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.5)",
                            }}
                          />
                        )}
                    </React.Fragment>
                  );
                })}
              </TableRow>
            </TableHead>

            {/* ══ BODY ══ */}
            <TableBody>
              {tableData.map((row, index) => {
                const rowId = getRowKey(row, index);
                const isSelected = selectedRows.includes(rowId);
                const rowWithFlag = {
                  ...row,
                  flagColor: vesselFlags[rowId] || null,
                };
                const customRowStyle = getRowStyle?.(row);

                const rowBg = isSelected
                  ? theme.primarySoft
                  : ((customRowStyle as Record<string, unknown>)?.backgroundColor ??
                    theme.rowBackgroundColor);

                return (
                  <TableRow
                    key={rowId}
                    sx={{
                      ...(customRowStyle as Record<string, unknown>),
                      backgroundColor: rowBg,
                      "&:hover td": {
                        backgroundColor: theme.hoverBackgroundColor,
                      },
                    }}
                  >
                    {/* Checkbox */}
                    <TableCell
                      sx={{
                        width: "50px",
                        minWidth: "50px",
                        maxWidth: "50px",
                        padding: 0,
                        textAlign: "center",
                        verticalAlign: "middle",
                        backgroundColor: rowBg,
                        position: "sticky",
                        left: 0,
                        zIndex: 5,
                        border: `.5px solid ${theme.borderColor}`,
                        boxShadow: "2px 0 5px -2px rgba(0,0,0,0.5)",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                        sx={{
                          p: 0.5,
                          color: theme.borderColor,
                          "&.Mui-checked": { color: theme.primaryColor },
                        }}
                      />
                    </TableCell>

                    {/* Data cells */}
                    {filteredColumns.map((column, colIndex) => {
                      const isPrimaryId =
                        column.field.toLowerCase() ===
                        primaryKeyField.toLowerCase();

                      return (
                        <React.Fragment key={column.field}>
                          <TableCell
                            sx={{
                              color: theme.textColor,
                              border: `.5px solid ${theme.borderColor}`,
                              padding: "8px 12px",
                              minWidth: "150px",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                              backgroundColor: rowBg,
                              position: isPrimaryId ? "sticky" : "relative",
                              left: isPrimaryId ? "50px" : "auto",
                              zIndex: isPrimaryId ? 10 : 1,
                              boxShadow: isPrimaryId
                                ? "2px 0 5px -2px rgba(0,0,0,0.5)"
                                : "none",
                            }}
                          >
                            {renderCellValue(rowWithFlag, column)}
                          </TableCell>

                          {showRowActions &&
                            colIndex === filteredColumns.length - 1 && (
                              <TableCell
                                sx={{
                                  width: "56px",
                                  minWidth: "56px",
                                  maxWidth: "56px",
                                  padding: 0,
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  backgroundColor: rowBg,
                                  position: "sticky",
                                  right: 0,
                                  zIndex: 5,
                                  border: `.5px solid ${theme.borderColor}`,
                                  boxShadow: "-2px 0 5px -2px rgba(0,0,0,0.5)",
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={(e) => onRowAction?.(e, row)}
                                  sx={{
                                    color: theme.textColor,
                                    opacity: 0.65,
                                    "&:hover": {
                                      opacity: 1,
                                      color: theme.primaryColor,
                                    },
                                  }}
                                >
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            )}
                        </React.Fragment>
                      );
                    })}
                  </TableRow>
                );
              })}

              {tableData.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={2 + filteredColumns.length}
                    sx={{
                      textAlign: "center",
                      py: 4,
                      color: theme.textColor,
                      backgroundColor: theme.rowBackgroundColor,
                    }}
                  >
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 30, 50, 100]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => handleChangePage(e, newPage)}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            color: theme.textColor,
            backgroundColor: theme.headerBackgroundColor,
            borderTop: `1px solid ${theme.borderColor}`,
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
              { color: theme.textColor },
            ".MuiTablePagination-select": { color: theme.textColor },
            ".MuiTablePagination-actions": { color: theme.textColor },
          }}
        />
      </Paper>

      {/* ── Column header context menu ── */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: theme.popoverBackgroundColor,
            color: theme.textColor,
            border: `1px solid ${theme.borderColor}`,
          },
        }}
      >
        <MenuItem onClick={() => handleSortAction("asc")}>
          <ListItemIcon>
            <ArrowUpwardIcon fontSize="small" sx={{ color: theme.textColor }} />
          </ListItemIcon>
          <ListItemText primary="Sort by ASC" />
        </MenuItem>
        <MenuItem onClick={() => handleSortAction("desc")}>
          <ListItemIcon>
            <ArrowDownwardIcon
              fontSize="small"
              sx={{ color: theme.textColor }}
            />
          </ListItemIcon>
          <ListItemText primary="Sort by DESC" />
        </MenuItem>
        <MenuItem onClick={() => handleSortAction("unsort")}>
          <ListItemIcon>
            <SortIcon fontSize="small" sx={{ color: theme.textColor }} />
          </ListItemIcon>
          <ListItemText primary="Unsort" />
        </MenuItem>
        <Divider sx={{ borderColor: theme.borderSoft }} />
        <MenuItem onClick={handleHideAction}>
          <ListItemIcon>
            <VisibilityOffIcon
              fontSize="small"
              sx={{ color: theme.textColor }}
            />
          </ListItemIcon>
          <ListItemText primary="Hide column" />
        </MenuItem>
        <MenuItem onClick={handleManageAction}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" sx={{ color: theme.textColor }} />
          </ListItemIcon>
          <ListItemText primary="Manage columns" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
