import { useState } from 'react';
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
            {flattenInformation(information).map(([k, v]) => (
              <InfoRow
                key={k}
                label={k.replace(/_/g, ' ')}
                value={v}
              />
            ))}
          </>
        )}
      </Collapse>
    </Paper>
  );
}

// The raw `information` block can nest plain objects (e.g. dark_after_departure's
// `thresholds`) — flatten them into dotted-label leaf rows so nested values render
// as real numbers/strings instead of "[object Object]". Arrays are joined inline.
function flattenInformation(
  obj: Record<string, unknown>,
  prefix = '',
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const label = prefix ? `${prefix} ${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenInformation(v as Record<string, unknown>, label));
    } else if (Array.isArray(v)) {
      rows.push([label, v.map(String).join(', ') || '—']);
    } else {
      rows.push([label, String(v ?? '—')]);
    }
  }
  return rows;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
      <Typography variant="caption" sx={{ opacity: 0.6, textTransform: 'capitalize', mr: 1 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}
