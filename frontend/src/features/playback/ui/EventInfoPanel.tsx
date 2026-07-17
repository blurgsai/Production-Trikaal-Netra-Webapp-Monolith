import { useState, type ReactNode } from 'react';
import {
  Paper, Typography, Chip, IconButton, Collapse, Stack, Divider, Box,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SeverityChip } from '@/shared/ui/SeverityChip';
import { defenseColors } from '@/shared/theme/colors';
import { formatPlaybackTimestamp } from '../model/playbackUtils';
import type { TimeWindow } from '../model/types';

interface EventInfoPanelProps {
  eventId: string;
  eventType: string;
  isCompound: boolean;
  severity?: string;
  status?: string;
  vesselCount: number;
  timeWindow: TimeWindow;
  information?: Record<string, unknown>;
}

export function EventInfoPanel({
  eventId,
  eventType,
  isCompound,
  severity,
  status,
  vesselCount,
  timeWindow,
  information,
}: EventInfoPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        minWidth: 240,
        maxWidth: 320,
        // Event types with many (or nested/array) information fields can produce a long
        // row list — cap the panel to its container (the map area, not the viewport) and
        // let it scroll instead of overrunning the map. top:16 + bottom gap keeps it clear
        // of the playback controls bar that floats at the bottom.
        maxHeight: 'calc(100% - 32px)',
        overflowY: 'auto',
        // App surface language (matches eventTable / menus / dialogs): solid surface,
        // 1px divider border, elevation shadow token — no ad-hoc glassmorphism.
        bgcolor: 'background.surfaceAlt',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: defenseColors.shadow,
        color: 'text.primary',
        p: 1.5,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.7rem' }}
        >
          {eventId}
        </Typography>
        <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ color: 'text.secondary' }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>

      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 0.75 }}>
        {eventType.replace(/_/g, ' ')}
      </Typography>

      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={0.5}>
        {isCompound && (
          <Chip label="Compound" size="small" color="secondary" sx={{ borderRadius: 1, fontWeight: 600 }} />
        )}
        {severity && <SeverityChip severity={severity} />}
        {status && (
          <Chip
            label={status}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 1, textTransform: 'capitalize', color: 'text.secondary', borderColor: 'divider' }}
          />
        )}
      </Stack>

      <Collapse in={expanded}>
        <Divider sx={{ my: 1 }} />

        <InfoRow label="Vessels" value={String(vesselCount)} />
        <InfoRow label="Start" value={formatPlaybackTimestamp(timeWindow.eventStartMs)} />
        {timeWindow.eventEndMs && (
          <InfoRow label="End" value={formatPlaybackTimestamp(timeWindow.eventEndMs)} />
        )}

        {information && Object.keys(information).length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            {Object.entries(information).map(([k, v]) => (
              <InfoNode key={k} label={k.replace(/_/g, ' ')} value={v} depth={0} />
            ))}
          </>
        )}
      </Collapse>
    </Paper>
  );
}

// The raw `information` block can nest plain objects (e.g. dark_after_departure's
// `thresholds`) and arrays of objects (e.g. coordinated_dark_activity's
// `vessel_update_rates`). Rather than flatten everything inline — which can explode a
// single event into dozens of rows and overrun the panel — each nested object or
// array-of-objects renders as its own collapsible node (default collapsed), so the
// panel stays compact and the user expands only what they want to inspect.
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function InfoNode({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <InfoRow label={label} value="—" depth={depth} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <InfoRow label={label} value="—" depth={depth} />;
    // Arrays of primitives read best joined inline (e.g. a list of ids). Arrays that
    // contain objects become a collapsible node, one indexed child per element.
    const allPrimitive = value.every(el => el === null || typeof el !== 'object');
    if (allPrimitive) {
      return <InfoRow label={label} value={value.map(el => String(el ?? '—')).join(', ')} depth={depth} />;
    }
    return (
      <ExpandableNode label={label} badge={String(value.length)} depth={depth}>
        {value.map((el, i) => (
          <InfoNode key={i} label={`#${i + 1}`} value={el} depth={depth + 1} />
        ))}
      </ExpandableNode>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <InfoRow label={label} value="—" depth={depth} />;
    return (
      <ExpandableNode label={label} depth={depth}>
        {entries.map(([k, v]) => (
          <InfoNode key={k} label={k.replace(/_/g, ' ')} value={v} depth={depth + 1} />
        ))}
      </ExpandableNode>
    );
  }

  return <InfoRow label={label} value={String(value)} depth={depth} />;
}

// A collapsible label row for a nested object / array-of-objects. Collapsed by
// default; the children (rendered indented, with a left rule) mount on expand.
function ExpandableNode({
  label,
  badge,
  depth,
  children,
}: {
  label: string;
  badge?: string;
  depth: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          mb: 0.5,
          pl: depth,
          color: 'text.secondary',
          transition: 'color 0.15s ease',
          '&:hover': { color: 'text.primary' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
          <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
            {label}
          </Typography>
        </Box>
        {badge && (
          <Typography variant="caption" sx={{ color: 'text.disabled', ml: 1 }}>
            {badge}
          </Typography>
        )}
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ ml: depth + 0.75, pl: 0.75, borderLeft: '1px solid', borderColor: 'divider' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

function InfoRow({ label, value, depth = 0 }: { label: string; value: string; depth?: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, mb: 0.5, pl: depth }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize', flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.primary', textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
