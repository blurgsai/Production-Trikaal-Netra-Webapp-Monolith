import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type { VesselTableFilter, FilterCombinator, SavedFilterSet } from "../model/types";
import { formatColumnName } from "@/shared/utils";

interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  filters: VesselTableFilter[];
  appliedFilters: VesselTableFilter[];
  allTableColumns: string[];
  columnOptions: Record<string, string[]>;
  savedFilters: SavedFilterSet[];
  onAddFilter: () => void;
  onUpdateFilter: (index: number, update: Partial<VesselTableFilter>) => void;
  onRemoveFilter: (index: number) => void;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  onSaveFilter: (name: string) => void;
  onLoadSavedFilter: (name: string) => void;
  onDeleteSavedFilter: (name: string) => void;
  onLoadColumnOptions: (column: string) => void;
}

const TEXT_OPERATORS: VesselTableFilter["operator"][] = ["=", "!="];
const NUMERIC_OPERATORS: VesselTableFilter["operator"][] = ["=", "!=", "<", "<=", ">", ">="];

function getOperatorsForColumn(column: string): VesselTableFilter["operator"][] {
  const numericSuffixes = [
    "_lat",
    "_lon",
    "_timestamp",
    "_value",
    "_count",
    "_rate",
    "_historylimit",
    "_history",
    "_lastobservedvalue",
    "_variabilityscore",
    "_consensusvalue",
    "_lastupdatets",
    "_turnrate",
    "_accelerationmps2",
    "_distancemeters",
    "_headingchangedeg",
    "_headingdeg",
    "_jerkmps3",
    "_speedovergroundmps",
    "_timedeltaseconds",
    "_windowseconds",
    "_level",
    "_total",
    "_current",
    "_eta",
    "_buildyear",
    "_epfdtype",
    "_maneuverindicator",
    "_positionaccuracy",
    "_radiostatus",
    "_navstatus",
    "_s2",
    "mmsi",
    "imo",
    "id",
  ];

  const isNumeric = numericSuffixes.some((suffix) => column.toLowerCase().endsWith(suffix));
  return isNumeric ? NUMERIC_OPERATORS : TEXT_OPERATORS;
}

function FilterDialog({
  open,
  onClose,
  filters,
  allTableColumns,
  columnOptions,
  savedFilters,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onResetFilters,
  onApplyFilters,
  onSaveFilter,
  onLoadSavedFilter,
  onDeleteSavedFilter,
  onLoadColumnOptions,
}: FilterDialogProps) {
  const [filterTab, setFilterTab] = useState<"filters" | "saved">("filters");
  const [filterName, setFilterName] = useState("");

  const handleApply = () => {
    onApplyFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Filters</span>
        {filters.length > 0 && (
          <Typography variant="caption" color="textSecondary">
            {filters.length} active
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={filterTab}
          onChange={(_, value) => setFilterTab(value as "filters" | "saved")}
          variant="fullWidth"
        >
          <Tab value="filters" label="Apply filters" />
          <Tab value="saved" label="Saved" />
        </Tabs>

        {filterTab === "filters" && (
          <Box sx={{ maxHeight: 400, overflowY: "auto", p: 2 }}>
            {filters.length === 0 && (
              <Box sx={{ textAlign: "center", py: 3, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  No filters applied. Add filters to narrow results.
                </Typography>
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onAddFilter}>
                  Add Filter
                </Button>
              </Box>
            )}
            <Stack spacing={1}>
              {filters.map((filter, index) => {
                const operators = getOperatorsForColumn(filter.column);
                const isNumeric = operators === NUMERIC_OPERATORS;
                const options = columnOptions[filter.column] ?? [];
                return (
                  <Box
                    key={index}
                    sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                  >
                    {index > 0 && (
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ mb: 0.5 }}>
                        <Select
                          size="small"
                          value={filter.combinator ?? "AND"}
                          onChange={(e) =>
                            onUpdateFilter(index, { combinator: e.target.value as FilterCombinator })
                          }
                          sx={{ minWidth: 70, fontSize: "0.75rem" }}
                        >
                          <MenuItem value="AND">AND</MenuItem>
                          <MenuItem value="OR">OR</MenuItem>
                        </Select>
                        <Typography variant="caption" color="textSecondary">
                          with previous
                        </Typography>
                      </Box>
                    )}
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Select
                        size="small"
                        value={filter.column}
                        onChange={(e) => {
                          onUpdateFilter(index, { column: e.target.value, value: "" });
                          onLoadColumnOptions(e.target.value);
                        }}
                        sx={{ flex: 2, minWidth: 120 }}
                        MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                      >
                        {allTableColumns.map((col: string) => (
                          <MenuItem key={col} value={col}>
                            {formatColumnName(col)}
                          </MenuItem>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        value={filter.operator}
                        onChange={(e) =>
                          onUpdateFilter(index, { operator: e.target.value as VesselTableFilter["operator"] })
                        }
                        sx={{ width: 80, flexShrink: 0 }}
                      >
                        {operators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>
                      {isNumeric ? (
                        <TextField
                          size="small"
                          value={filter.value}
                          onChange={(e) => onUpdateFilter(index, { value: e.target.value })}
                          placeholder="Value"
                          sx={{ flex: 1 }}
                        />
                      ) : (
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={options}
                          value={filter.value}
                          onChange={(_, newValue) => onUpdateFilter(index, { value: newValue ?? "" })}
                          onInputChange={(_, newInputValue) => onUpdateFilter(index, { value: newInputValue })}
                          onOpen={() => onLoadColumnOptions(filter.column)}
                          renderInput={(params) => (
                            <TextField {...params} placeholder="Value" />
                          )}
                          sx={{ flex: 1 }}
                        />
                      )}
                      <IconButton color="error" size="small" onClick={() => onRemoveFilter(index)} sx={{ flexShrink: 0 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {filterTab === "saved" && (
          <Box sx={{ maxHeight: 400, overflowY: "auto", p: 2 }}>
            <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Save current filters
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Filter name"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    if (filterName.trim()) {
                      onSaveFilter(filterName.trim());
                      setFilterName("");
                    }
                  }}
                >
                  Save
                </Button>
              </Box>
            </Box>

            {savedFilters.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Saved filters
                </Typography>
                <Stack spacing={0.5}>
                  {savedFilters.map((saved) => (
                    <Box
                      key={saved.name}
                      sx={{
                        p: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap>
                          {saved.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {saved.filters.length} filter{saved.filters.length !== 1 ? "s" : ""}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onLoadSavedFilter(saved.name);
                          onClose();
                        }}
                      >
                        Load
                      </Button>
                      <IconButton size="small" color="error" onClick={() => onDeleteSavedFilter(saved.name)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: "center", py: 2 }}>
                No saved filters yet.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      {filterTab === "filters" && (
        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1, alignItems: "center" }}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={onAddFilter}>
            Add Filter
          </Button>
          <Box flex={1} />
          <Button size="small" variant="outlined" onClick={onResetFilters} disabled={filters.length === 0}>
            Reset
          </Button>
          <Button size="small" variant="contained" onClick={handleApply} disabled={filters.length === 0}>
            Apply
          </Button>
        </Box>
      )}
    </Dialog>
  );
}

export default FilterDialog;
