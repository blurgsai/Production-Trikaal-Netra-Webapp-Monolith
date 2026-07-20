import { useState } from "react";
import {
  Box,
  Button,
  Chip,
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
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";

import type {
  ArticleProgressiveFilter,
  ArticleFilterOperator,
  ArticleFilterCombinator,
  SavedArticleFilterSet,
  ArticleMetadata,
} from "../model/types";
import { ARTICLE_FILTER_FIELDS } from "../model/types";

interface ArticleFilterDialogProps {
  open: boolean;
  onClose: () => void;
  filters: ArticleProgressiveFilter[];
  savedFilters: SavedArticleFilterSet[];
  metadata?: ArticleMetadata;
  onAddFilter: () => void;
  onUpdateFilter: (
    index: number,
    update: Partial<ArticleProgressiveFilter>,
  ) => void;
  onRemoveFilter: (index: number) => void;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  onSaveFilter: (name: string) => void;
  onLoadSavedFilter: (name: string) => void;
  onDeleteSavedFilter: (name: string) => void;
}

const TEXT_OPERATORS: ArticleFilterOperator[] = ["=", "!=", "contains"];
const DATE_OPERATORS: ArticleFilterOperator[] = [">=", "<=", "between"];

function getOperatorsForField(field: string): ArticleFilterOperator[] {
  const def = ARTICLE_FILTER_FIELDS.find((f) => f.value === field);
  if (!def) return TEXT_OPERATORS;
  if (def.type === "date") return DATE_OPERATORS;
  return TEXT_OPERATORS;
}

function getOptionsForField(
  field: string,
  metadata?: ArticleMetadata,
): string[] {
  switch (field) {
    case "source":
      return metadata?.sources ?? [];
    case "source_type":
      return metadata?.sourceTypes ?? [];
    case "processing_status":
      return metadata?.processingStatuses ?? [];
    default:
      return [];
  }
}

export function ArticleFilterDialog({
  open,
  onClose,
  filters,
  savedFilters,
  metadata,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onResetFilters,
  onApplyFilters,
  onSaveFilter,
  onLoadSavedFilter,
  onDeleteSavedFilter,
}: ArticleFilterDialogProps) {
  const [filterTab, setFilterTab] = useState<"filters" | "saved">("filters");
  const [filterName, setFilterName] = useState("");

  const handleApply = () => {
    onApplyFilters();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterListOutlinedIcon
            sx={{ fontSize: 20, color: "primary.main" }}
          />
          <span>Article Filters</span>
        </Box>
        {filters.length > 0 && (
          <Chip
            label={`${filters.length} active`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 22, fontSize: "0.7rem" }}
          />
        )}
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Tabs
          value={filterTab}
          onChange={(_, value) =>
            setFilterTab(value as "filters" | "saved")
          }
          variant="fullWidth"
        >
          <Tab value="filters" label="Apply filters" />
          <Tab value="saved" label="Saved" />
        </Tabs>

        {filterTab === "filters" && (
          <Box sx={{ maxHeight: 400, overflowY: "auto", p: 2 }}>
            {filters.length === 0 && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 3,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ mb: 1 }}
                >
                  No filters applied. Add filters to narrow results.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onAddFilter}
                >
                  Add Filter
                </Button>
              </Box>
            )}
            <Stack spacing={1}>
              {filters.map((filter, index) => {
                const operators = getOperatorsForField(filter.field);
                const fieldDef = ARTICLE_FILTER_FIELDS.find(
                  (f) => f.value === filter.field,
                );
                const isDate = fieldDef?.type === "date";
                const isBetween = filter.operator === "between";
                const options = getOptionsForField(filter.field, metadata);

                return (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {index > 0 && (
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={0.5}
                        sx={{ mb: 0.5 }}
                      >
                        <Select
                          size="small"
                          value={filter.combinator ?? "AND"}
                          onChange={(e) =>
                            onUpdateFilter(index, {
                              combinator: e.target
                                .value as ArticleFilterCombinator,
                            })
                          }
                          sx={{ minWidth: 70, fontSize: "0.75rem" }}
                        >
                          <MenuItem value="AND">AND</MenuItem>
                          <MenuItem value="OR">OR</MenuItem>
                        </Select>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                        >
                          with previous
                        </Typography>
                      </Box>
                    )}
                    <Stack
                      direction="row"
                      spacing={0.5}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <FormControl size="small" sx={{ flex: 2, minWidth: 120 }}>
                        <InputLabel>Field</InputLabel>
                        <Select
                          label="Field"
                          value={filter.field}
                          onChange={(e) => {
                            const newField = e.target.value;
                            const newOperators =
                              getOperatorsForField(newField);
                            onUpdateFilter(index, {
                              field: newField,
                              operator: newOperators[0],
                              value: "",
                              value2: "",
                            });
                          }}
                          MenuProps={{
                            PaperProps: { style: { maxHeight: 300 } },
                          }}
                        >
                          {ARTICLE_FILTER_FIELDS.map((def) => (
                            <MenuItem key={def.value} value={def.value}>
                              {def.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Select
                        size="small"
                        value={filter.operator}
                        onChange={(e) =>
                          onUpdateFilter(index, {
                            operator: e.target.value as ArticleFilterOperator,
                            value: "",
                            value2: "",
                          })
                        }
                        sx={{ width: 90, flexShrink: 0 }}
                      >
                        {operators.map((op) => (
                          <MenuItem key={op} value={op}>
                            {op}
                          </MenuItem>
                        ))}
                      </Select>

                      {isDate ? (
                        isBetween ? (
                          <Box sx={{ display: "flex", gap: 1, flex: 1 }}>
                            <DatePicker
                              label="From"
                              value={
                                filter.value
                                  ? dayjs(filter.value)
                                  : null
                              }
                              onChange={(value) =>
                                onUpdateFilter(index, {
                                  value: value?.format("YYYY-MM-DD") ?? "",
                                })
                              }
                              slotProps={{ textField: { size: "small" } }}
                            />
                            <DatePicker
                              label="To"
                              value={
                                filter.value2
                                  ? dayjs(filter.value2)
                                  : null
                              }
                              onChange={(value) =>
                                onUpdateFilter(index, {
                                  value2: value?.format("YYYY-MM-DD") ?? "",
                                })
                              }
                              slotProps={{ textField: { size: "small" } }}
                            />
                          </Box>
                        ) : (
                          <DatePicker
                            label="Date"
                            value={
                              filter.value ? dayjs(filter.value) : null
                            }
                            onChange={(value) =>
                              onUpdateFilter(index, {
                                value: value?.format("YYYY-MM-DD") ?? "",
                              })
                            }
                            slotProps={{ textField: { size: "small" } }}
                            sx={{ flex: 1 }}
                          />
                        )
                      ) : options.length > 0 ? (
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={options}
                          value={filter.value}
                          onChange={(_, newValue) =>
                            onUpdateFilter(index, {
                              value: newValue ?? "",
                            })
                          }
                          onInputChange={(_, newInputValue) =>
                            onUpdateFilter(index, { value: newInputValue })
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Value"
                            />
                          )}
                          sx={{ flex: 1 }}
                        />
                      ) : (
                        <TextField
                          size="small"
                          value={filter.value}
                          onChange={(e) =>
                            onUpdateFilter(index, { value: e.target.value })
                          }
                          placeholder="Value"
                          sx={{ flex: 1 }}
                        />
                      )}

                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onRemoveFilter(index)}
                        sx={{ flexShrink: 0 }}
                      >
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
            <Box
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                mb: 2,
              }}
            >
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
                          {saved.filters.length} filter
                          {saved.filters.length !== 1 ? "s" : ""}
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
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteSavedFilter(saved.name)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ textAlign: "center", py: 2 }}
              >
                No saved filters yet.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      {filterTab === "filters" && (
        <Box
          sx={{
            p: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={onAddFilter}
          >
            Add Filter
          </Button>
          <Box flex={1} />
          <Button
            size="small"
            variant="outlined"
            onClick={onResetFilters}
            disabled={filters.length === 0}
          >
            Reset
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApply}
            disabled={filters.length === 0}
          >
            Apply
          </Button>
        </Box>
      )}
    </Dialog>
  );
}
