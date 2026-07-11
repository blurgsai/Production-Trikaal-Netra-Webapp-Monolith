import { useEffect, useState, useCallback } from "react";
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  LinearProgress,
  Stack,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  PlayArrow,
  Pause,
  Close,
  ArrowDropDown,
  KeyboardOutlined,
} from "@mui/icons-material";

interface AnimationControlsProps {
  visible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  startTime: string;
  isBuffering?: boolean;

  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onClose: () => void;
}

export default function AnimationControls({
  visible,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  isBuffering = false,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onClose,
  startTime,
}: AnimationControlsProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [seekValue, setSeekValue] = useState<number | null>(null);
  const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
  const SEEK_STEP = Math.max(duration / 50, 1);

  const formatCompactTime = useCallback((seconds: number) => {
    const totalSeconds = Math.max(0, seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    if (duration < 3600) {
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    if (duration < 86400) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return formatDateTime(seconds);
  }, [duration]);

  const formatDateTime = (seconds: number) => {
    if (!startTime) return "--";
    const startDate = new Date(startTime);
    const utcDate = new Date(startDate.getTime() + seconds * 1000);
    return `${String(utcDate.getMonth() + 1).padStart(2, "0")}/${String(utcDate.getDate()).padStart(2, "0")} ${String(utcDate.getHours()).padStart(2, "0")}:${String(utcDate.getMinutes()).padStart(2, "0")}`;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
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
  }, [onPlayPause, onSeek, onClose, currentTime, duration, SEEK_STEP]);

  if (!visible) return null;

  const displayTime = seekValue ?? currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 36,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 3000,
        width: "fit-content",
        minWidth: 520,
        maxWidth: "90%",
      }}
    >
      <Box
        sx={{
          bgcolor: alpha(theme.palette.background.default, 0.85),
          backdropFilter: "blur(8px)",
          color: theme.palette.text.primary,
          borderRadius: 2,
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          boxShadow: theme.shadows[8],
        }}
      >
        <Tooltip title={isPlaying ? "Pause (Space)" : "Play (Space)"} arrow>
          <IconButton
            onClick={onPlayPause}
            sx={{
              color: "primary.main",
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
            }}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
        </Tooltip>

        <Stack spacing={0.25} sx={{ minWidth: 70 }}>
          <Typography variant="body2" fontWeight={700} sx={{ color: "text.primary" }}>
            {formatCompactTime(displayTime)}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
            {progress.toFixed(0)}%
          </Typography>
        </Stack>

        <Tooltip title="Seek (Arrow Left/Right)" arrow>
          <Slider
            min={0}
            max={duration || 1}
            value={displayTime}
            onChange={(_, value) => setSeekValue(value as number)}
            onChangeCommitted={(_, value) => {
              onSeek(value as number);
              setSeekValue(null);
            }}
            sx={{ flex: 1, minWidth: 120 }}
          />
        </Tooltip>

        <Stack spacing={0.25} sx={{ minWidth: 70, textAlign: "right" }}>
          <Typography variant="body2" fontWeight={700} sx={{ color: "text.primary" }}>
            {formatCompactTime(duration)}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
            total
          </Typography>
        </Stack>

        <Tooltip title="Playback speed" arrow>
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
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { minWidth: 90 } }}
        >
          {PLAYBACK_SPEEDS.map((speed) => (
            <MenuItem
              key={speed}
              selected={speed === playbackSpeed}
              onClick={() => {
                onSpeedChange(speed);
                setAnchorEl(null);
              }}
              sx={{ justifyContent: "center" }}
            >
              {speed}x
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Exit playback (Esc)" arrow>
          <IconButton
            onClick={onClose}
            sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
          >
            <Close />
          </IconButton>
        </Tooltip>

        <Tooltip
          title={
            <Stack spacing={0.5} sx={{ p: 0.5 }}>
              <Typography variant="caption"><strong>Space</strong> — Play / Pause</Typography>
              <Typography variant="caption"><strong>← →</strong> — Seek</Typography>
              <Typography variant="caption"><strong>Esc</strong> — Exit playback</Typography>
            </Stack>
          }
          arrow
          placement="top"
        >
          <IconButton
            size="small"
            sx={{ color: "text.secondary", ml: -0.5 }}
          >
            <KeyboardOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
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
            bgcolor: alpha(theme.palette.primary.main, 0.15),
          }}
        />
      )}
    </Box>
  );
}
