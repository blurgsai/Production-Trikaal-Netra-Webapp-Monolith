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
  Chip,
  Tooltip,
  Alert,
  Stack,
} from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TuneIcon from "@mui/icons-material/Tune";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import type { PlaybackRange, TimeGranularity } from "../model/types";

interface PlaybackDialogProps {
  open: boolean;
  onClose: () => void;
  playbackRange: PlaybackRange;
  setPlaybackRange: Dispatch<SetStateAction<PlaybackRange>>;
  granularity: TimeGranularity;
  onGranularityChange: (g: TimeGranularity) => void;
  onApply: () => void;
  polygon?: GeoJSON.Feature | GeoJSON.Geometry | null;
}

const GRANULARITIES: { value: TimeGranularity; label: string; hint: string }[] = [
  { value: "minute", label: "Minute", hint: "1 frame per minute" },
  { value: "hour", label: "Hour", hint: "1 frame per hour" },
  { value: "day", label: "Day", hint: "1 frame per day" },
  { value: "week", label: "Week", hint: "1 frame per week" },
];

const PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "24 hours", minutes: 1440 },
  { label: "7 days", minutes: 10080 },
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
}: PlaybackDialogProps) {
  const toLocalDatetime = (date: Date) => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };

  const applyPreset = (minutes: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60000);
    setPlaybackRange({ start: toLocalDatetime(start), end: toLocalDatetime(end) });
  };

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
              <AccessTimeIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="body2" fontWeight={600}>
                Quick presets
              </Typography>
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1.25}>
              {PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  size="medium"
                  variant="outlined"
                  onClick={() => applyPreset(preset.minutes)}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Stack>
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
