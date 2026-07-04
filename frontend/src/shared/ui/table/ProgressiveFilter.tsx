import { useState } from "react";

import {
  Box,
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Typography,
  Popover,
  IconButton,
  Divider,
  Autocomplete,
} from "@mui/material";

import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearAllIcon from "@mui/icons-material/ClearAll";

import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";

import dayjs from "dayjs";

import { useTableFilters } from "@/shared/hooks/table/useTableFilters";
import type { AppliedFilter } from "@/shared/hooks/table/useTableFilters";
import type { TableUiTheme } from "@/shared/theme/tableUiTheme";

export interface ColumnDefinition {
  field: string;
  label: string;
  type: string;
}

interface ProgressiveFilterProps {
  columns: ColumnDefinition[];

  appliedFilters?: AppliedFilter[];

  onApplyFilters: (filters: AppliedFilter[]) => void;

  getOperatorsByType: (type: string) => {
    value: string;
    label: string;
  }[];

  getFieldValues?: (field: string, search?: string) => Promise<string[]>;

  theme: TableUiTheme;
}

export default function ProgressiveFilter({
  columns,
  appliedFilters = [],
  onApplyFilters,
  getOperatorsByType,
  getFieldValues,
  theme,
}: ProgressiveFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const [fieldValueOptions, setFieldValueOptions] = useState<
    Record<string, string[]>
  >({});

  const {
    filterRows,
    addFilterRow,
    removeFilterRow,
    updateFilterRow,
    clearAllFilters,
    applyFilters,
    getValidFilterCount,
  } = useTableFilters(onApplyFilters, appliedFilters);

  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    applyFilters();
    handleClose();
  };

  const fetchValues = async (field: string, search = "") => {
    if (!getFieldValues || !field) return;

    const values = await getFieldValues(field, search);

    setFieldValueOptions((prev) => ({
      ...prev,
      [field]: values ?? [],
    }));
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FilterListIcon />}
        onClick={handleOpen}
      >
        Filters
        {getValidFilterCount() > 0 ? `(${getValidFilterCount()})` : ""}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            width: 850,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Advanced Filters
          </Typography>

          <Box>
            {getValidFilterCount() > 0 && (
              <Button
                size="small"
                startIcon={<ClearAllIcon />}
                onClick={clearAllFilters}
                sx={{
                  color: theme.dangerColor,
                  "&:hover": {
                    bgcolor: theme.hoverBackgroundColor,
                  },
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "4px",
                  p: 1,
                  marginRight: "15px",
                }}
              >
                Clear All
              </Button>
            )}

            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        <Box
          sx={{
            p: 3,
            maxHeight: 500,
            overflowY: "auto",
          }}
        >
          {filterRows.map((row, index) => {
            const fieldConfig = columns.find(
              (column) => column.field === row.field,
            );

            const fieldType = fieldConfig?.type ?? "string";

            const operators = getOperatorsByType(fieldType);

            const isBetween = row.operator === "between";

            return (
              <Box
                key={row.id}
                sx={{
                  mb: 3,
                }}
              >
                {index > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 2,
                    }}
                  >
                    <Divider sx={{ flex: 1 }} />

                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Logic</InputLabel>

                      <Select
                        value={row.logic || "AND"}
                        label="Logic"
                        onChange={(e) =>
                          updateFilterRow(row.id, {
                            logic: e.target.value,
                          })
                        }
                      >
                        <MenuItem value="AND">AND</MenuItem>
                        <MenuItem value="OR">OR</MenuItem>
                      </Select>
                    </FormControl>

                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                  }}
                >
                  <FormControl
                    sx={{
                      flex: 1,
                    }}
                  >
                    <InputLabel>Field</InputLabel>

                    <Select
                      label="Field"
                      value={row.field}
                      onChange={(event) =>
                        updateFilterRow(row.id, {
                          field: event.target.value,
                          operator: "",
                          value: "",
                          value2: "",
                        })
                      }
                    >
                      {columns.map((column) => (
                        <MenuItem key={column.field} value={column.field}>
                          {column.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl
                    sx={{
                      flex: 1,
                    }}
                  >
                    <InputLabel>Operator</InputLabel>

                    <Select
                      label="Operator"
                      value={row.operator}
                      onChange={(event) =>
                        updateFilterRow(row.id, {
                          operator: event.target.value,
                        })
                      }
                    >
                      {operators.map((operator) => (
                        <MenuItem key={operator.value} value={operator.value}>
                          {operator.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box
                    sx={{
                      flex: 2,
                    }}
                  >
                    {fieldType === "timestamp" ? (
                      isBetween ? (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                          }}
                        >
                          <DateTimePicker
                            label="From"
                            value={
                              row.value ? dayjs(row.value as string) : null
                            }
                            onChange={(value) =>
                              updateFilterRow(row.id, {
                                value: value?.toISOString() ?? "",
                              })
                            }
                          />

                          <DateTimePicker
                            label="To"
                            value={
                              row.value2 ? dayjs(row.value2 as string) : null
                            }
                            onChange={(value) =>
                              updateFilterRow(row.id, {
                                value2: value?.toISOString() ?? "",
                              })
                            }
                          />
                        </Box>
                      ) : (
                        <DateTimePicker
                          label="Date & Time"
                          value={row.value ? dayjs(row.value as string) : null}
                          onChange={(value) =>
                            updateFilterRow(row.id, {
                              value: value?.toISOString() ?? "",
                            })
                          }
                        />
                      )
                    ) : fieldType === "date" ? (
                      <DatePicker
                        label="Date"
                        value={row.value ? dayjs(row.value as string) : null}
                        onChange={(value) =>
                          updateFilterRow(row.id, {
                            value: value?.format("YYYY-MM-DD") ?? "",
                          })
                        }
                      />
                    ) : (
                      <Autocomplete
                        freeSolo
                        options={fieldValueOptions[row.field] ?? []}
                        inputValue={String(row.value ?? "")}
                        onFocus={() => fetchValues(row.field)}
                        onInputChange={(_, value) => {
                          updateFilterRow(row.id, {
                            value,
                          });

                          fetchValues(row.field, value);
                        }}
                        componentsProps={{
                          paper: {
                            sx: {
                              backgroundColor: theme.popoverBackgroundColor,
                              color: theme.textColor,

                              "& .MuiAutocomplete-option": {
                                color: theme.textColor,
                              },

                              "& .MuiAutocomplete-option:hover": {
                                backgroundColor: theme.primarySoft,
                              },
                            },
                          },
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Value" />
                        )}
                      />
                    )}
                  </Box>

                  <IconButton onClick={() => removeFilterRow(row.id)}>
                    <DeleteIcon sx={{ color: theme.dangerColor }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}

          <Button startIcon={<AddIcon />} onClick={addFilterRow}>
            Add Another Filter
          </Button>
        </Box>

        <Divider />

        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button onClick={handleClose}>Cancel</Button>

          <Button variant="contained" onClick={handleApply}>
            Apply Filters
          </Button>
        </Box>
      </Popover>
    </>
  );
}
