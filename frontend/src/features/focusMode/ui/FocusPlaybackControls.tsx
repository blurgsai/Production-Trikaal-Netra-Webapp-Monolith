import { useState, useEffect, useMemo } from "react";
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Button,
  Paper,
  Stack,
  Popover,
  Divider,
} from "@mui/material";
import { PlayArrow, Pause, Settings } from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import type { TrajectoryPoint, FocusEvent } from "../model/types";
import { buildEventMarks } from "../model/playbackUtils";

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 4, 8];

const focusVisibleSx = {
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: 2,
  },
} as const;

interface Props {
  trajectory: TrajectoryPoint[];
  events: FocusEvent[];
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlayPause(): void;
  onSeek(index: number): void;
  onSpeedChange(speed: number): void;
  startTime: number | null;
  endTime: number | null;
  onApplyTimeRange(start: number, end: number): void;
}

export const FocusPlaybackControls = ({
  trajectory,
  events,
  currentIndex,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onSeek,
  onSpeedChange,
  startTime,
  endTime,
  onApplyTimeRange,
}: Props) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [seekIndex, setSeekIndex] = useState<number | null>(null);
  const [draftStart, setDraftStart] = useState(startTime);
  const [draftEnd, setDraftEnd] = useState(endTime);

  useEffect(() => {
    setDraftStart(startTime);
  }, [startTime]);
  useEffect(() => {
    setDraftEnd(endTime);
  }, [endTime]);

  const isDirty = draftStart !== startTime || draftEnd !== endTime;
  const displayIndex = seekIndex ?? currentIndex;
  const total = trajectory.length;
  const settingsOpen = Boolean(anchorEl);

  const endDayjs = draftEnd ? dayjs(draftEnd * 1000) : null;
  const startDayjs = draftStart ? dayjs(draftStart * 1000) : null;

  const durationSecs = startTime && endTime ? endTime - startTime : 0;
  const hours = Math.floor(durationSecs / 3600);
  const mins = Math.floor((durationSecs % 3600) / 60);
  const secs = Math.floor(durationSecs % 60);
  const durationLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`;

  const eventMarks = useMemo(
    () => buildEventMarks(trajectory, events),
    [trajectory, events],
  );

  const formatIndexTime = (index: number) => {
    const point = trajectory[index];
    return point
      ? dayjs(point.timestamp * 1000).format("YYYY-MM-DD HH:mm:ss")
      : "No position";
  };

  useEffect(() => {
    if (total === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (isTyping) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          onPlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSeek(Math.max(0, currentIndex - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          onSeek(Math.min(total - 1, currentIndex + 1));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total, currentIndex, onPlayPause, onSeek]);

  return (
    <Paper
      elevation={6}
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        p: 1.5,
        borderRadius: 0,
        zIndex: 1200,
        bgcolor: (theme) => theme.palette.background.paper,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: 3,
          bgcolor: (theme) => theme.palette.background.paper,
          opacity: 0.92,
          zIndex: -1,
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <IconButton
          onClick={onPlayPause}
          color="primary"
          size="large"
          disabled={total === 0}
          aria-label={isPlaying ? "Pause playback" : "Play playback"}
          aria-pressed={isPlaying}
          sx={focusVisibleSx}
        >
          {isPlaying ? (
            <Pause fontSize="large" />
          ) : (
            <PlayArrow fontSize="large" />
          )}
        </IconButton>

        <Slider
          size="small"
          min={0}
          max={Math.max(0, total - 1)}
          value={displayIndex}
          disabled={total === 0}
          marks={eventMarks}
          getAriaLabel={() => "Playback timeline"}
          getAriaValueText={formatIndexTime}
          onChange={(_, v) => setSeekIndex(v as number)}
          onChangeCommitted={(_, v) => {
            onSeek(v as number);
            setSeekIndex(null);
          }}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => {
            const point = trajectory[v];
            return point
              ? dayjs(point.timestamp * 1000).format("YYYY-MM-DD HH:mm:ss")
              : "—";
          }}
          sx={{
            flex: 1,
            "& .MuiSlider-thumb": {
              ...focusVisibleSx,
            },
            "& .MuiSlider-mark": {
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "warning.main",
              opacity: 1,
              top: "50%",
              transform: "translate(-50%, -50%)",
            },
            "& .MuiSlider-markActive": {
              bgcolor: "warning.dark",
            },
          }}
        />

        <Button
          size="small"
          variant="outlined"
          startIcon={<Settings />}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Playback speed"
          aria-haspopup="menu"
          aria-expanded={settingsOpen}
          sx={focusVisibleSx}
        >
          {playbackSpeed}x
        </Button>

        <Popover
          open={settingsOpen}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Box sx={{ p: 1.25, width: 260, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Time range
            </Typography>
            <DateTimePicker
              label="Start"
              value={startDayjs}
              onChange={(v) => v?.isValid() && setDraftStart(v.unix())}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
            <DateTimePicker
              label="End"
              value={endDayjs}
              onChange={(v) => v?.isValid() && setDraftEnd(v.unix())}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="caption" color="primary" fontWeight="bold">
                {durationLabel}
              </Typography>
              <Box sx={{ flex: 1 }} />
              {isDirty && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setDraftStart(startTime);
                      setDraftEnd(endTime);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      onApplyTimeRange(draftStart!, draftEnd!);
                      setAnchorEl(null);
                    }}
                  >
                    Apply
                  </Button>
                </>
              )}
            </Stack>

            <Divider />

            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Speed
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {SPEED_OPTIONS.map((s) => (
                <Button
                  key={s}
                  size="small"
                  variant={s === playbackSpeed ? "contained" : "outlined"}
                  aria-pressed={s === playbackSpeed}
                  onClick={() => {
                    onSpeedChange(s);
                    setAnchorEl(null);
                  }}
                  sx={{ minWidth: 40, px: 1, py: 0.25, fontSize: 12, ...focusVisibleSx }}
                >
                  {s}x
                </Button>
              ))}
            </Stack>
          </Box>
        </Popover>
      </Stack>
    </Paper>
  );
};
