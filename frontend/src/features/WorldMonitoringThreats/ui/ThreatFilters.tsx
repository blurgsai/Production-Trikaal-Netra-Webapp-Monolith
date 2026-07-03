import {
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Box,
} from "@mui/material";

import type { ThreatFilters, ThreatMetadata } from "../model/types";

import { worldMonitorPalette } from "@/shared/utils/worldMonitoringUtils";

const MULTI_SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundColor: worldMonitorPalette.panel,
      border: `1px solid ${worldMonitorPalette.borderStrong}`,
      maxHeight: 280,
    },
  },
};

interface ThreatFiltersProps {
  filters: ThreatFilters;
  metadata?: ThreatMetadata;

  keywordInput: string;

  onKeywordChange: (value: string) => void;

  onThreatLevelsChange: (value: string[]) => void;

  onEventTypesChange: (value: string[]) => void;

  onSourcesChange: (value: string[]) => void;

  onSortChange: (value: string) => void;
}

export function ThreatFilters({
  filters,
  metadata,
  keywordInput,
  onKeywordChange,
  onThreatLevelsChange,
  onEventTypesChange,
  onSourcesChange,
  onSortChange,
}: ThreatFiltersProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "2.4fr 1fr 1fr 1fr 1fr",
        },
        gap: 1.5,
        p: 1.5,
        borderRadius: 3,
        border: `1px solid ${worldMonitorPalette.border}`,
        background:
          "linear-gradient(180deg, rgba(18,35,59,0.95), rgba(9,22,37,0.98))",
      }}
    >
      <TextField
        value={keywordInput}
        onChange={(e) => onKeywordChange(e.target.value)}
        placeholder="Search event type, threat level, reasoning…"
        fullWidth
        size="small"
        InputProps={{
          sx: {
            color: worldMonitorPalette.text,
            backgroundColor: "rgba(255,255,255,0.03)",
          },
        }}
      />

      <FormControl size="small">
        <InputLabel sx={{ color: worldMonitorPalette.textMuted }}>
          Threat Level
        </InputLabel>

        <Select
          multiple
          value={filters.threatLevels}
          onChange={(e) => onThreatLevelsChange(e.target.value as string[])}
          input={<OutlinedInput label="Threat Level" />}
          MenuProps={MULTI_SELECT_MENU_PROPS}
          sx={{ color: worldMonitorPalette.text }}
        >
          {(metadata?.threatLevels ?? []).map((level) => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel sx={{ color: worldMonitorPalette.textMuted }}>
          Event Type
        </InputLabel>

        <Select
          multiple
          value={filters.eventTypes}
          onChange={(e) => onEventTypesChange(e.target.value as string[])}
          input={<OutlinedInput label="Event Type" />}
          MenuProps={MULTI_SELECT_MENU_PROPS}
          sx={{ color: worldMonitorPalette.text }}
        >
          {(metadata?.eventTypes ?? []).map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel sx={{ color: worldMonitorPalette.textMuted }}>
          Source
        </InputLabel>

        <Select
          multiple
          value={filters.sources}
          onChange={(e) => onSourcesChange(e.target.value as string[])}
          input={<OutlinedInput label="Source" />}
          MenuProps={MULTI_SELECT_MENU_PROPS}
          sx={{ color: worldMonitorPalette.text }}
        >
          {(metadata?.sources ?? []).map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel sx={{ color: worldMonitorPalette.textMuted }}>
          Sort
        </InputLabel>

        <Select
          value={filters.sort}
          onChange={(e) => onSortChange(e.target.value)}
          input={<OutlinedInput label="Sort" />}
          MenuProps={MULTI_SELECT_MENU_PROPS}
          sx={{ color: worldMonitorPalette.text }}
        >
          {(metadata?.sortOptions ?? []).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
