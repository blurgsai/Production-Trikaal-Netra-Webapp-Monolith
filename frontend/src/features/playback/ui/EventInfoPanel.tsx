import { useState, type ReactNode } from 'react';
import {
  Paper, Typography, Chip, IconButton, Collapse, Stack, Divider, Box,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  high:     'error',
  medium:   'warning',
  low:      'info',
  resolved: 'success',
};

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

  const sevColor = severity ? (SEVERITY_COLOR[severity.toLowerCase()] ?? 'default') : 'default';

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
        backgroundColor: 'rgba(18,18,18,0.9)',
        backdropFilter: 'blur(4px)',
        color: 'white',
        p: 1,
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ fontFamily: 'monospace', opacity: 0.6, fontSize: '0.65rem' }}>
          {eventId}
        </Typography>
        <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ color: 'white' }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>

      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 0.5 }}>
        {eventType.replace(/_/g, ' ')}
      </Typography>

      <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={0.5}>
        {isCompound && <Chip label="Compound" size="small" color="secondary" />}
        {severity && <Chip label={severity} size="small" color={sevColor} />}
        {status && <Chip label={status} size="small" variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }} />}
      </Stack>

      <Collapse in={expanded}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.75 }} />

        <InfoRow label="Vessels" value={String(vesselCount)} />
        <InfoRow label="Start" value={formatPlaybackTimestamp(timeWindow.eventStartMs)} />
        {timeWindow.eventEndMs && (
          <InfoRow label="End" value={formatPlaybackTimestamp(timeWindow.eventEndMs)} />
        )}

        {information && Object.keys(information).length > 0 && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 0.75 }} />
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
          mb: 0.25,
          pl: depth,
          '&:hover': { opacity: 0.85 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
          {open ? <ExpandLessIcon sx={{ fontSize: 15 }} /> : <ExpandMoreIcon sx={{ fontSize: 15 }} />}
          <Typography variant="caption" sx={{ opacity: 0.6, textTransform: 'capitalize' }}>
            {label}
          </Typography>
        </Box>
        {badge && (
          <Typography variant="caption" sx={{ opacity: 0.5, ml: 1 }}>
            {badge}
          </Typography>
        )}
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ ml: depth + 0.75, pl: 0.75, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

function InfoRow({ label, value, depth = 0 }: { label: string; value: string; depth?: number }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25, pl: depth }}>
      <Typography variant="caption" sx={{ opacity: 0.6, textTransform: 'capitalize', mr: 1 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
