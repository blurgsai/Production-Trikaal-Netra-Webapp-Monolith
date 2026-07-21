import { useEffect, useState, useCallback } from "react";
import {
  Box,
  IconButton,
  Slider,
  Typography,
  MenuItem,
  Button,
  Tooltip,
  type TooltipProps,
  LinearProgress,
  Stack,
  Popover,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  PlayArrow,
  Pause,
  Close,
  ArrowDropDown,
  KeyboardOutlined,
  LayersOutlined,
} from "@mui/icons-material";

interface AnimationControlsProps {
  visible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  startTime: string;
  isBuffering?: boolean;
  sessionColor?: string;
  isLayersActive?: boolean;
  isKeyboardActive?: boolean;
  stacked?: boolean;

  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onClose: () => void;
  onSliderDragStart?: () => void;
  onLayersToggle?: (e: React.MouseEvent) => void;
  onActivate?: () => void;
  tooltipDismissToken?: number;
}

export function PlaybackTooltip({
  dismissToken,
  ...props
}: TooltipProps & { dismissToken?: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dismissToken) setOpen(false);
  }, [dismissToken]);

  return (
    <Tooltip
      {...props}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      slotProps={{
        ...props.slotProps,
        popper: {
          sx: { zIndex: 1200 },
          ...props.slotProps?.popper,
        },
      }}
    />
  );
}

export default function AnimationControls({
  visible,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  isBuffering = false,
  sessionColor,
  isLayersActive = false,
  isKeyboardActive = true,
  stacked = false,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onClose,
  onSliderDragStart,
  onLayersToggle,
  onActivate,
  startTime,
  tooltipDismissToken,
}: AnimationControlsProps) {
  const theme = useTheme();
  const accentColor = sessionColor ?? theme.palette.primary.main;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [seekValue, setSeekValue] = useState<number | null>(null);
  const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
  const SEEK_STEP = Math.max(duration / 50, 1);

  const formatCompactTime = useCallback(
    (seconds: number) => {
      if (!startTime) return "--";
      const startDate = new Date(startTime);
      const localDate = new Date(startDate.getTime() + seconds * 1000);
      const datePart = `${String(localDate.getMonth() + 1).padStart(2, "0")}/${String(localDate.getDate()).padStart(2, "0")}`;
      const timePart = `${String(localDate.getHours()).padStart(2, "0")}:${String(localDate.getMinutes()).padStart(2, "0")}`;

      if (duration < 3600) {
        return `${datePart} ${timePart}:${String(localDate.getSeconds()).padStart(2, "0")}`;
      }
      return `${datePart} ${timePart}`;
    },
    [duration, startTime],
  );

  useEffect(() => {
    if (!isKeyboardActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement;
      if (isTyping) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          onPlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSeek(Math.max(0, currentTime - SEEK_STEP));
          break;
        case "ArrowRight":
          e.preventDefault();
          onSeek(Math.min(duration, currentTime + SEEK_STEP));
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isKeyboardActive,
    onPlayPause,
    onSeek,
    onClose,
    currentTime,
    duration,
    SEEK_STEP,
  ]);

  if (!visible) return null;

  const displayTime = seekValue ?? currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <Box
      onMouseDown={(e) => {
        e.stopPropagation();
        onActivate?.();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      sx={{
        position: stacked ? "relative" : "absolute",
        bottom: stacked ? undefined : 0,
        left: stacked ? undefined : 0,
        right: stacked ? undefined : 0,
        zIndex: stacked ? undefined : 1100,
        width: "100%",
        height: stacked ? "100%" : undefined,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          bgcolor: alpha(theme.palette.background.default, 0.85),
          backdropFilter: "blur(8px)",
          color: theme.palette.text.primary,
          borderRadius: 0,
          px: 2,
          py: 1.25,
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          boxShadow: theme.shadows[8],
          borderLeft: sessionColor ? `3px solid ${sessionColor}` : undefined,
        }}
      >
        <PlaybackTooltip dismissToken={tooltipDismissToken} title={isPlaying ? "Pause (Space)" : "Play (Space)"} arrow>
          <IconButton
            onClick={onPlayPause}
            sx={{
              color: accentColor,
              bgcolor: alpha(accentColor, 0.12),
              "&:hover": { bgcolor: alpha(accentColor, 0.2) },
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
        </PlaybackTooltip>

        <Stack spacing={0.25} sx={{ minWidth: 70 }}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: "text.primary" }}
          >
            {formatCompactTime(displayTime)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.65rem" }}
          >
            {progress.toFixed(0)}%
          </Typography>
        </Stack>

        <PlaybackTooltip dismissToken={tooltipDismissToken} title="Seek (Arrow Left/Right)" arrow>
          <Slider
            min={0}
            max={duration || 1}
            value={displayTime}
            onMouseDown={() => onSliderDragStart?.()}
            onChange={(_, value) => setSeekValue(value as number)}
            onChangeCommitted={(_, value) => {
              onSeek(value as number);
              setSeekValue(null);
            }}
            sx={{
              flex: 1,
              minWidth: 120,
              color: accentColor,
              "& .MuiSlider-thumb": { bgcolor: accentColor },
              "& .MuiSlider-track": { bgcolor: accentColor },
            }}
          />
        </PlaybackTooltip>

        <Stack spacing={0.25} sx={{ minWidth: 70, textAlign: "right" }}>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: "text.primary" }}
          >
            {formatCompactTime(duration)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.65rem" }}
          >
            total
          </Typography>
        </Stack>

        <PlaybackTooltip dismissToken={tooltipDismissToken} title="Playback speed" arrow>
          <Button
            size="small"
            endIcon={<ArrowDropDown />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              color: "text.primary",
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              borderRadius: 1.5,
              minWidth: 72,
              px: 1.5,
            }}
          >
            {playbackSpeed}x
          </Button>
        </PlaybackTooltip>

        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
          hideBackdrop
          disableEnforceFocus
          disableAutoFocus
          slotProps={{
            paper: { sx: { minWidth: 90, zIndex: 10000, mt: -0.5 } },
          }}
        >
          <Box sx={{ py: 0.5 }}>
            {PLAYBACK_SPEEDS.map((speed) => (
              <MenuItem
                key={speed}
                selected={speed === playbackSpeed}
                onClick={() => {
                  onSpeedChange(speed);
                  setAnchorEl(null);
                }}
                sx={{ justifyContent: "center", minHeight: 36 }}
              >
                {speed}x
              </MenuItem>
            ))}
          </Box>
        </Popover>

        {onLayersToggle && (
          <PlaybackTooltip dismissToken={tooltipDismissToken} title="Toggle vessel labels" arrow>
            <IconButton
              size="small"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onLayersToggle}
              sx={{
                color: isLayersActive ? accentColor : "text.secondary",
                bgcolor: isLayersActive
                  ? alpha(accentColor, 0.12)
                  : "transparent",
                "&:hover": { bgcolor: alpha(accentColor, 0.1) },
              }}
            >
              <LayersOutlined fontSize="small" />
            </IconButton>
          </PlaybackTooltip>
        )}

        <PlaybackTooltip dismissToken={tooltipDismissToken} title="Exit playback (Esc)" arrow>
          <IconButton
            onClick={onClose}
            sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
          >
            <Close />
          </IconButton>
        </PlaybackTooltip>

        <PlaybackTooltip
          dismissToken={tooltipDismissToken}
          title={
            <Stack spacing={0.5} sx={{ p: 0.5 }}>
              <Typography variant="caption">
                <strong>Space</strong> — Play / Pause
              </Typography>
              <Typography variant="caption">
                <strong>← →</strong> — Seek
              </Typography>
              <Typography variant="caption">
                <strong>Esc</strong> — Exit playback
              </Typography>
            </Stack>
          }
          arrow
          placement="top"
        >
          <IconButton size="small" sx={{ color: "text.secondary", ml: -0.5 }}>
            <KeyboardOutlined fontSize="small" />
          </IconButton>
        </PlaybackTooltip>
      </Box>

      {isBuffering && (
        <LinearProgress
          sx={{
            position: "absolute",
            bottom: -4,
            left: 12,
            right: 12,
            height: 2,
            borderRadius: 1,
            bgcolor: alpha(accentColor, 0.15),
            "& .MuiLinearProgress-bar": { bgcolor: accentColor },
          }}
        />
      )}
    </Box>
  );
}
