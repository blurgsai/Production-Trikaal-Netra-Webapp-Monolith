import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Tooltip,
  Alert,
  Stack,
  Select,
  MenuItem,
  IconButton,
  Divider,
} from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useCallback } from "react";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FilterListIcon from "@mui/icons-material/FilterList";

import type {
  PlaybackRange,
  TimeGranularity,
  PlaybackFilter,
  FilterField,
  FilterOperator,
  FilterCombinator,
} from "../model/types";
import {
  FILTER_FIELD_OPTIONS,
  FILTER_OPERATOR_OPTIONS,
} from "../model/types";

interface PlaybackDialogProps {
  open: boolean;
  onClose: () => void;
  playbackRange: PlaybackRange;
  setPlaybackRange: Dispatch<SetStateAction<PlaybackRange>>;
  granularity: TimeGranularity;
  onGranularityChange: (g: TimeGranularity) => void;
  onApply: () => void;
  polygon?: GeoJSON.Feature | GeoJSON.Geometry | null;
  filters: PlaybackFilter[];
  onFiltersChange: Dispatch<SetStateAction<PlaybackFilter[]>>;
  isPlaying?: boolean;
}

const GRANULARITIES: { value: TimeGranularity; label: string; hint: string }[] = [
  { value: "minute", label: "Minute", hint: "1 frame per minute" },
  { value: "hour", label: "Hour", hint: "1 frame per hour" },
  { value: "day", label: "Day", hint: "1 frame per day" },
  { value: "week", label: "Week", hint: "1 frame per week" },
];

export default function PlaybackDialog({
  open,
  onClose,
  playbackRange,
  setPlaybackRange,
  granularity,
  onGranularityChange,
  onApply,
  polygon,
  filters,
  onFiltersChange,
  isPlaying = false,
}: PlaybackDialogProps) {
  const validation = useMemo(() => {
    if (!playbackRange.start || !playbackRange.end) {
      return { valid: false, message: "Select both start and end times" };
    }
    const start = new Date(playbackRange.start).getTime();
    const end = new Date(playbackRange.end).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return { valid: false, message: "Invalid date format" };
    }
    if (end <= start) {
      return { valid: false, message: "End time must be after start time" };
    }
    const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (end - start > maxRange) {
      return { valid: false, message: "Maximum range is 30 days" };
    }
    return { valid: true, message: "" };
  }, [playbackRange]);

  const estimatedFrames = useMemo(() => {
    if (!validation.valid) return null;
    const start = new Date(playbackRange.start).getTime();
    const end = new Date(playbackRange.end).getTime();
    const seconds = (end - start) / 1000;
    const multipliers: Record<TimeGranularity, number> = {
      minute: 60,
      hour: 3600,
      day: 86400,
      week: 604800,
    };
    return Math.ceil(seconds / multipliers[granularity]);
  }, [playbackRange, granularity, validation.valid]);

  const polygonSummary = useMemo(() => {
    if (!polygon) return null;
    const geometry =
      polygon.type === "Feature" ? polygon.geometry : polygon;
    if (!geometry || geometry.type !== "Polygon") return null;

    const ring = geometry.coordinates[0] || [];
    const vertexCount = ring.length - 1; // last point repeats first
    if (vertexCount <= 0) return null;

    const lats = ring.map((p) => p[1]);
    const lngs = ring.map((p) => p[0]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const format = (n: number) => n.toFixed(2);
    return {
      vertexCount,
      bounds: `${format(minLat)}, ${format(minLng)} → ${format(maxLat)}, ${format(maxLng)}`,
      widthKm: Math.round((maxLng - minLng) * 111.32 * Math.cos(((minLat + maxLat) / 2 * Math.PI) / 180)),
      heightKm: Math.round((maxLat - minLat) * 111.32),
    };
  }, [polygon]);

  const handleAddFilter = useCallback(() => {
    onFiltersChange((prev) => [
      ...prev,
      {
        field: "vesselId" as FilterField,
        operator: "eq" as FilterOperator,
        value: "",
        combinator: prev.length > 0 ? ("AND" as FilterCombinator) : undefined,
      },
    ]);
  }, [onFiltersChange]);

  const handleRemoveFilter = useCallback(
    (index: number) => {
      onFiltersChange((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (next.length > 0) next[0].combinator = undefined;
        return next;
      });
    },
    [onFiltersChange],
  );

  const handleUpdateFilter = useCallback(
    (index: number, patch: Partial<PlaybackFilter>) => {
      onFiltersChange((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
      );
    },
    [onFiltersChange],
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" alignItems="center" gap={1.5}>
          Playback Configuration
          <Tooltip title="Choose how far back to replay and how often frames should update" arrow>
            <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
          </Tooltip>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {polygonSummary && (
            <Alert
              severity="info"
              icon={false}
              sx={{
                py: 1,
                px: 1.5,
                bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
                color: "info.light",
                border: 1,
                borderColor: (theme) => alpha(theme.palette.info.main, 0.25),
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" fontWeight={700}>
                Selected area
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {polygonSummary.vertexCount} points · {polygonSummary.widthKm} × {polygonSummary.heightKm} km · {polygonSummary.bounds}
              </Typography>
            </Alert>
          )}

          <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
              <TuneIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2" fontWeight={600}>
                Granularity
              </Typography>
            </Stack>
            <ToggleButtonGroup
              value={granularity}
              exclusive
              onChange={(_, value) => {
                if (value) onGranularityChange(value);
              }}
              size="small"
              sx={{ display: "flex", flexWrap: "wrap" }}
            >
              {GRANULARITIES.map((g) => (
                <Tooltip key={g.value} title={g.hint} arrow>
                  <ToggleButton value={g.value} sx={{ flex: 1, minWidth: 80 }}>
                    {g.label}
                  </ToggleButton>
                </Tooltip>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.75, display: "block" }}>
              One frame is generated per selected granularity.
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
              <CalendarTodayIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2" fontWeight={600}>
                Date range
              </Typography>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Start"
                type="datetime-local"
                value={playbackRange.start}
                onChange={(e) =>
                  setPlaybackRange((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={!validation.valid && !!playbackRange.start && !!playbackRange.end}
                sx={{
                  "& input::-webkit-calendar-picker-indicator": {
                    filter: "invert(1)",
                    opacity: 0.6,
                    cursor: "pointer",
                  },
                }}
              />
              <TextField
                label="End"
                type="datetime-local"
                value={playbackRange.end}
                onChange={(e) =>
                  setPlaybackRange((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={!validation.valid && !!playbackRange.start && !!playbackRange.end}
                sx={{
                  "& input::-webkit-calendar-picker-indicator": {
                    filter: "invert(1)",
                    opacity: 0.6,
                    cursor: "pointer",
                  },
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 0.5 }} />

          <Box>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.25 }}>
              <FilterListIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2" fontWeight={600}>
                Filters
              </Typography>
              <Tooltip title="Add a filter condition to narrow down vessel data" arrow>
                <InfoOutlinedIcon fontSize="small" sx={{ color: "text.secondary", cursor: "help" }} />
              </Tooltip>
            </Stack>

            {filters.length === 0 && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                No filters applied. All vessels in the selected area will be shown.
              </Typography>
            )}

            {isPlaying && filters.length > 0 && (
              <Alert severity="info" sx={{ py: 0.5, borderRadius: 2, mb: 1 }}>
                Filters are locked during playback. Stop playback to modify.
              </Alert>
            )}

            <Stack direction="column" gap={1.5}>
              {filters.map((filter, index) => {
                const fieldOption = FILTER_FIELD_OPTIONS.find(
                  (o) => o.field === filter.field,
                );
                const isNumeric = fieldOption?.isNumeric ?? true;
                return (
                  <Box key={index}>
                    {index > 0 && (
                      <Select
                        size="small"
                        value={filter.combinator ?? "AND"}
                        disabled={isPlaying}
                        onChange={(e) =>
                          handleUpdateFilter(index, {
                            combinator: e.target.value as FilterCombinator,
                          })
                        }
                        sx={{
                          mb: 1,
                          minWidth: 90,
                          height: 28,
                          "& .MuiSelect-select": { py: 0.25, fontSize: "0.8rem" },
                        }}
                      >
                        <MenuItem value="AND">AND</MenuItem>
                        <MenuItem value="OR">OR</MenuItem>
                      </Select>
                    )}
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Select
                        size="small"
                        value={filter.field}
                        disabled={isPlaying}
                        onChange={(e) =>
                          handleUpdateFilter(index, {
                            field: e.target.value as FilterField,
                          })
                        }
                        sx={{ minWidth: 150, flex: "0 0 auto" }}
                      >
                        {FILTER_FIELD_OPTIONS.map((opt) => (
                          <MenuItem key={opt.field} value={opt.field}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>

                      <Select
                        size="small"
                        value={filter.operator}
                        disabled={isPlaying}
                        onChange={(e) =>
                          handleUpdateFilter(index, {
                            operator: e.target.value as FilterOperator,
                          })
                        }
                        sx={{ minWidth: 70, flex: "0 0 auto" }}
                      >
                        {FILTER_OPERATOR_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>

                      <TextField
                        size="small"
                        value={filter.value}
                        disabled={isPlaying}
                        onChange={(e) =>
                          handleUpdateFilter(index, { value: e.target.value })
                        }
                        placeholder={isNumeric ? "Number" : "Text"}
                        type={isNumeric ? "number" : "text"}
                        sx={{ flex: 1 }}
                      />

                      <IconButton
                        size="small"
                        disabled={isPlaying}
                        onClick={() => handleRemoveFilter(index)}
                        sx={{ color: "text.secondary" }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Stack>

            <Button
              size="small"
              startIcon={<AddIcon />}
              disabled={isPlaying}
              onClick={handleAddFilter}
              sx={{ mt: 1.5, textTransform: "none" }}
            >
              Add filter
            </Button>
          </Box>

          {!validation.valid && (
            <Alert severity="warning" sx={{ py: 0.75, borderRadius: 2 }}>
              {validation.message}
            </Alert>
          )}

          {validation.valid && estimatedFrames !== null && (
            <Box
              sx={{
                py: 1,
                px: 1.5,
                borderRadius: 2,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                border: 1,
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Estimated playback: <strong>{estimatedFrames} frames</strong> at {granularity} granularity.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={onClose} color="inherit">
          Start over
        </Button>

        <Button
          variant="contained"
          disabled={!validation.valid}
          onClick={onApply}
          startIcon={<PlayArrowRoundedIcon />}
          sx={{ px: 3 }}
        >
          Play
        </Button>
      </DialogActions>
    </Dialog>
  );
}
