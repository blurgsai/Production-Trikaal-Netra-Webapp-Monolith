import { Box } from '@mui/material';
import type { PortIntrusionEvent } from '../../../model/eventTypeTypes';

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function formatLabel(value: string | null): string {
  if (!value) return 'Restricted Zone';
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export interface Props {
  event: PortIntrusionEvent;
}

// No per-tick series to graph here (intrusion_duration_seconds and
// violation_count are single summary values, not a rate) — a compact info
// bar is the right amount of visualisation, same as SpeedTimelineEnhancement's
// duration/threshold bar.
export function PortIntrusionTimelineEnhancement({ event }: Props) {
  const repeat = event.violationCount > 1;

  return (
    <Box
      sx={{
        mt: 1, px: 2, py: 0.5,
        backgroundColor: 'rgba(255, 68, 68, 0.2)',
        borderLeft: '3px solid #ff4444',
        fontSize: '0.75rem',
        color: '#fff',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 700 }}>{event.portName ?? formatLabel(event.restrictionType)}</span>
      {event.portName && <span>{formatLabel(event.restrictionType)}</span>}
      <span>Port: {event.portId ?? 'Unknown'}</span>
      <span>Duration: {formatDuration(event.intrusionDurationSec)}</span>
      <span style={repeat ? { color: '#ff1744', fontWeight: 700 } : undefined}>
        Violation #{event.violationCount}{repeat ? ' — Repeat offender' : ''}
      </span>
    </Box>
  );
}
