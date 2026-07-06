import { useState, type ReactNode } from 'react';
import {
  Paper, Slider, IconButton, Typography, Stack, Collapse, Box,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatPlaybackTimestamp, PLAYBACK_STEP_MS } from '../model/playbackUtils';
import type { TimeWindow } from '../model/types';

interface PlaybackControlsProps {
  currentTimestampMs: number;
  isPlaying: boolean;
  timeWindow: TimeWindow;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  children?: ReactNode;
}

export function PlaybackControls({
  currentTimestampMs,
  isPlaying,
  timeWindow,
  onPlay,
  onPause,
  onSeek,
  children,
}: PlaybackControlsProps) {
  const [expanded, setExpanded] = useState(true);

  const { queryStartMs, queryEndMs, eventStartMs, eventEndMs } = timeWindow;
  const range = queryEndMs - queryStartMs;

  // Event window stripe as a CSS gradient on the slider rail
  const eventStart = Math.max(0, Math.min(100, ((eventStartMs - queryStartMs) / range) * 100));
  const eventEnd   = eventEndMs
    ? Math.max(0, Math.min(100, ((eventEndMs - queryStartMs) / range) * 100))
    : 100;

  const railSx = {
    '& .MuiSlider-rail': {
      background: `linear-gradient(
        to right,
        rgba(255,255,255,0.2) 0%,
        rgba(255,255,255,0.2) ${eventStart}%,
        rgba(255,68,68,0.5)   ${eventStart}%,
        rgba(255,68,68,0.5)   ${eventEnd}%,
        rgba(255,255,255,0.2) ${eventEnd}%,
        rgba(255,255,255,0.2) 100%
      )`,
      opacity: 1,
    },
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
        p: 1,
        backgroundColor: 'rgba(18,18,18,0.9)',
        backdropFilter: 'blur(4px)',
        color: 'white',
      }}
    >
      {/* Compact header row */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton
          size="small"
          onClick={isPlaying ? onPause : onPlay}
          sx={{ color: 'white' }}
        >
          {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>

        <Typography variant="caption" sx={{ flex: 1, fontFamily: 'monospace' }}>
          {formatPlaybackTimestamp(currentTimestampMs)}
        </Typography>

        <IconButton
          size="small"
          onClick={() => setExpanded(e => !e)}
          sx={{ color: 'white' }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ px: 1, pb: 0.5 }}>
          <Slider
            min={queryStartMs}
            max={queryEndMs}
            step={PLAYBACK_STEP_MS}
            value={currentTimestampMs}
            onChange={(_, val) => onSeek(val as number)}
            size="small"
            sx={{ color: '#42a5f5', ...railSx }}
          />
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}
