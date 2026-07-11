import {
  Autocomplete,
  Checkbox,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

import type { ThreatFilters, ThreatMetadata } from "../model/types";

import { defenseColors } from "@/shared/theme";

const MULTI_SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundColor: defenseColors.background.surface,
      border: `1px solid ${defenseColors.border.strong}`,
      maxHeight: 280,
    },
  },
};

const THREAT_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

interface ThreatFiltersProps {
  filters: ThreatFilters;
  metadata?: ThreatMetadata;

  keywordInput: string;

  onKeywordChange: (value: string) => void;

  onThreatLevelsChange: (value: string[]) => void;

  onEventTypesChange: (value: string[]) => void;

  onSourcesChange: (value: string[]) => void;

  onSortChange: (value: string) => void;

  onResetFilters?: () => void;
}

const checkboxIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export function ThreatFilters({
  filters,
  metadata,
  keywordInput,
  onKeywordChange,
  onThreatLevelsChange,
  onEventTypesChange,
  onSourcesChange,
  onSortChange,
  onResetFilters,
}: ThreatFiltersProps) {
  const hasActiveFilters =
    filters.threatLevels.length > 0 ||
    filters.eventTypes.length > 0 ||
    filters.sources.length > 0 ||
    keywordInput.trim().length > 0;
  return (
    <Paper
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        gap: 1.5,
        p: 1.5,
        borderRadius: 3,
        border: `1px solid ${defenseColors.border.default}`,
        background: `linear-gradient(180deg, ${defenseColors.background.surfaceAlt}, ${defenseColors.background.surface})`,
      }}
    >
      <Stack
        spacing={0.5}
        sx={{
          flex: "1 1 280px",
          minWidth: 200,
        }}
      >
        <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
          Search
        </Typography>
        <TextField
          value={keywordInput}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="Event type, threat level, reasoning…"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: defenseColors.text.muted }} />
              </InputAdornment>
            ),
            sx: {
              color: defenseColors.text.primary,
              backgroundColor: defenseColors.border.soft,
            },
          }}
        />
      </Stack>

      <Stack
        spacing={0.5}
        sx={{
          flex: "0 1 auto",
          minWidth: 280,
        }}
      >
        <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
          Threat Level
        </Typography>
        <ToggleButtonGroup
          value={filters.threatLevels}
          onChange={(_, value) => onThreatLevelsChange(value)}
          size="small"
          sx={{ flexWrap: "nowrap" }}
        >
          {(metadata?.threatLevels ?? [...THREAT_LEVELS]).map((level) => (
            <ToggleButton
              key={level}
              value={level}
              sx={{
                minWidth: 0,
                px: 1.25,
                py: 0.5,
                color: defenseColors.text.muted,
                borderColor: defenseColors.border.default,
                whiteSpace: "nowrap",
                "&.Mui-selected": {
                  color: defenseColors.text.primary,
                  backgroundColor: defenseColors.primary.soft,
                },
              }}
            >
              {level}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack
        spacing={0.5}
        sx={{
          flex: "1 1 170px",
          minWidth: 150,
        }}
      >
        <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
          Event Types
        </Typography>
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          options={metadata?.eventTypes ?? []}
          value={filters.eventTypes}
          onChange={(_, value) => onEventTypesChange(value)}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox
                icon={checkboxIcon}
                checkedIcon={checkedIcon}
                style={{ marginRight: 8 }}
                checked={selected}
              />
              {option}
            </li>
          )}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option}
                label={option}
                size="small"
                sx={{
                  color: defenseColors.text.primary,
                  backgroundColor: defenseColors.primary.soft,
                }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select event types"
              InputLabelProps={{ shrink: false }}
            />
          )}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: defenseColors.text.primary,
              backgroundColor: defenseColors.border.soft,
            },
          }}
        />
      </Stack>

      <Stack
        spacing={0.5}
        sx={{
          flex: "1 1 170px",
          minWidth: 150,
        }}
      >
        <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
          Sources
        </Typography>
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          options={metadata?.sources ?? []}
          value={filters.sources}
          onChange={(_, value) => onSourcesChange(value)}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox
                icon={checkboxIcon}
                checkedIcon={checkedIcon}
                style={{ marginRight: 8 }}
                checked={selected}
              />
              {option}
            </li>
          )}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option}
                label={option}
                size="small"
                sx={{
                  color: defenseColors.text.primary,
                  backgroundColor: defenseColors.primary.soft,
                }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Select sources"
              InputLabelProps={{ shrink: false }}
            />
          )}
          sx={{
            "& .MuiOutlinedInput-root": {
              color: defenseColors.text.primary,
              backgroundColor: defenseColors.border.soft,
            },
          }}
        />
      </Stack>

      <Stack
        spacing={0.5}
        sx={{
          flex: "0 1 150px",
          minWidth: 140,
        }}
      >
        <Typography variant="caption" sx={{ color: defenseColors.text.muted }}>
          Sort
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={filters.sort}
            onChange={(e) => onSortChange(e.target.value)}
            input={<OutlinedInput notched={false} />}
            MenuProps={MULTI_SELECT_MENU_PROPS}
            sx={{ color: defenseColors.text.primary }}
          >
            {(metadata?.sortOptions ?? []).map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {onResetFilters && (
        <Stack
          spacing={0.5}
          sx={{
            flex: "0 0 auto",
            justifyContent: "flex-end",
            minWidth: 80,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "transparent",
              userSelect: "none",
            }}
          >
            Reset
          </Typography>
          <Typography
            variant="caption"
            onClick={onResetFilters}
            sx={{
              color: hasActiveFilters
                ? defenseColors.primary.main
                : defenseColors.text.muted,
              cursor: hasActiveFilters ? "pointer" : "default",
              textDecoration: hasActiveFilters ? "underline" : "none",
              pointerEvents: hasActiveFilters ? "auto" : "none",
              py: 0.5,
            }}
          >
            Reset filters
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
