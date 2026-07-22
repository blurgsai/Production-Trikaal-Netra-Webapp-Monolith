import { useState, type ReactNode } from 'react';
import {
  Paper, Slider, IconButton, Typography, Stack, Collapse, Box,
  Button, Menu, MenuItem, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { defenseColors } from '@/shared/theme/colors';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { formatPlaybackTimestamp, PLAYBACK_STEP_MS } from '../model/playbackUtils';
import type { TimeWindow } from '../model/types';

// Maritime playback speeds. 1× advances PLAYBACK_STEP_MS of event time per tick;
// higher multiples fast-forward long time windows.
const SPEED_OPTIONS = [1, 2, 4, 8] as const;

interface PlaybackControlsProps {
  currentTimestampMs: number;
  isPlaying: boolean;
  timeWindow: TimeWindow;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onSpeedChange: (speed: number) => void;
  hasData?: boolean;
  children?: ReactNode;
}

export function PlaybackControls({
  currentTimestampMs,
  isPlaying,
  timeWindow,
  speed,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  hasData = true,
  children,
}: PlaybackControlsProps) {
  const [expanded, setExpanded] = useState(true);
  const [speedAnchor, setSpeedAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();

  const { queryStartMs, queryEndMs, eventStartMs, eventEndMs } = timeWindow;
  const range = queryEndMs - queryStartMs || 1;

  // Event window rendered as a distinct rounded highlight bar overlaid on the slider
  // (::before, behind the thumb) rather than baked into the rail — the rail stays a
  // clean neutral track and the event span reads as its own 4px accent stripe.
  const eventLeftPct  = Math.max(0, Math.min(100, ((eventStartMs - queryStartMs) / range) * 100));
  const eventRightPct = eventEndMs
    ? Math.max(eventLeftPct + 0.5, Math.min(100, ((eventEndMs - queryStartMs) / range) * 100))
    : 100;

  const railColor   = alpha(theme.palette.text.primary, 0.16);
  const stripeColor = alpha(theme.palette.primary.main, 0.55);
  const eventStripe = `linear-gradient(to right,
    ${railColor} 0%,
    ${railColor} ${eventLeftPct}%,
    ${stripeColor} ${eventLeftPct}%,
    ${stripeColor} ${eventRightPct}%,
    ${railColor} ${eventRightPct}%,
    ${railColor} 100%)`;

  const sliderSx = {
    color: 'primary.main',
    // Hide the default rail — the ::before highlight bar below is the visible track.
    '& .MuiSlider-rail': { opacity: 0 },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      transform: 'translateY(-50%)',
      height: 4,
      borderRadius: 2,
      background: eventStripe,
      zIndex: 0,
      pointerEvents: 'none',
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
        overflow: 'hidden',
        bgcolor: 'background.surfaceAlt',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: defenseColors.shadow,
        color: 'text.primary',
      }}
    >
      {/* Compact header row — tightens when collapsed */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 1.5, py: expanded ? 1.25 : 0.5 }}
      >
        <IconButton
          size="small"
          color="primary"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {expanded && (
            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'text.secondary', letterSpacing: 0.5, lineHeight: 1.2 }}
            >
              CURRENT TIMESTAMP
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }} noWrap>
            {formatPlaybackTimestamp(currentTimestampMs)}
          </Typography>
        </Box>

        {/* Playback speed — single button opens a menu of multipliers */}
        <Tooltip title="Playback speed">
          <Button
            size="small"
            variant="outlined"
            onClick={e => setSpeedAnchor(e.currentTarget)}
            endIcon={<ArrowDropDownIcon />}
            aria-label="Playback speed"
            sx={{
              minWidth: 0,
              px: 1,
              py: 0.25,
              fontWeight: 700,
              color: 'text.primary',
              borderColor: 'divider',
              '& .MuiButton-endIcon': { ml: 0.25 },
            }}
          >
            {speed}×
          </Button>
        </Tooltip>
        <Menu
          anchorEl={speedAnchor}
          open={Boolean(speedAnchor)}
          onClose={() => setSpeedAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {SPEED_OPTIONS.map(s => (
            <MenuItem
              key={s}
              selected={s === speed}
              onClick={() => { onSpeedChange(s); setSpeedAnchor(null); }}
              sx={{ fontSize: '0.8rem', py: 0.5, minHeight: 'auto' }}
            >
              {s}×{s === 1 ? ' · Normal' : ''}
            </MenuItem>
          ))}
        </Menu>

        <IconButton
          size="small"
          onClick={() => setExpanded(e => !e)}
          sx={{ color: 'text.secondary' }}
        >
          {expanded ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 1.5 }}>
          {!hasData && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              No trajectory data for this time window — the slider spans the full event range.
            </Typography>
          )}

          <Box sx={{ position: 'relative' }}>
            <Slider
              min={queryStartMs}
              max={queryEndMs}
              step={PLAYBACK_STEP_MS}
              value={currentTimestampMs}
              onChange={(_, val) => onSeek(val as number)}
              size="small"
              sx={sliderSx}
            />

            {/* Query-window bounds */}
            <Stack direction="row" justifyContent="space-between" sx={{ px: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {formatPlaybackTimestamp(queryStartMs)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatPlaybackTimestamp(queryEndMs)}
              </Typography>
            </Stack>
          </Box>

          {/* Plugin timeline enhancements (speed / distance graphs) — bounded + scrollable
              so stacked graphs never grow the bar off the map. */}
          {children && (
            <Box
              sx={{
                mt: 1,
                pt: 1,
                maxHeight: 180,
                overflowY: 'auto',
                overflowX: 'hidden',
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              {children}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
