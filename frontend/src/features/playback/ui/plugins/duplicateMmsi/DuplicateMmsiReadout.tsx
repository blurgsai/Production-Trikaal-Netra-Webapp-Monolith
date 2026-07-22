import { Box } from '@mui/material';
import type { DuplicateMmsiEvent } from '../../../model/eventTypeTypes';

interface Props {
  event: DuplicateMmsiEvent;
}

function formatDistance(meters: number): string {
  if (meters >= 10_000) return `${(meters / 1000).toFixed(0)} km`;
  if (meters >= 1_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

// One-line spoofing verdict for the controls bar. duplicate_mmsi is an identity event,
// not a temporal one, so there's no graph — this summarises the impossibility: the same
// MMSI reported from two positions farther apart than the vessel could physically travel.
export function DuplicateMmsiReadout({ event }: Props) {
  const pct = Math.round(event.probabilityOfSpoofing * 100);
  return (
    <Box
      sx={{
        mt: 1, px: 2, py: 0.5,
        backgroundColor: 'rgba(255, 23, 68, 0.2)',
        borderLeft: '3px solid #ff1744',
        fontSize: '0.75rem', color: '#fff',
      }}
    >
      ⚠ Duplicate MMSI {event.spoofedMmsi} — same identity {formatDistance(event.distanceDiscrepancyM)} apart
      {event.requiredSpeedKnots > 0 && (
        <> · needs {event.requiredSpeedKnots} kn</>
      )}
      {event.maxSpeedKnots > 0 && (
        <> (vessel max {event.maxSpeedKnots} kn)</>
      )}
      {pct > 0 && <> · {pct}% spoofing</>}
    </Box>
  );
}
