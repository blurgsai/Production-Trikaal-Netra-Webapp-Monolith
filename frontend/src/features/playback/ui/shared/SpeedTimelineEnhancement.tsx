import { useMemo } from 'react';
import { Box } from '@mui/material';
import { SpeedGraph, type SpeedPoint } from './SpeedGraph';
import type { TimelineFrame, TimeWindow } from '../../model/types';

// Structural — any event-specific domain type with a threshold + event window
// can drive this timeline enhancement.
interface ThresholdSpeedEvent {
  thresholdMps: number;
  eventStartMs: number | null;
  eventEndMs: number | null;
}

export interface Props {
  event: ThresholdSpeedEvent;
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
  // When true, the alert zone is above the threshold (high_speed) instead of below it
  // (the default, used by prolonged_low_speed / prolonged_stationary).
  inverted?: boolean;
}

function formatDuration(startMs: number | null, endMs: number | null): string {
  if (startMs == null || endMs == null) return 'N/A';
  const totalMinutes = Math.floor((endMs - startMs) / 60_000);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function SpeedTimelineEnhancement({
  event,
  timeline,
  currentTimestampMs,
  timeWindow,
  inverted = false,
}: Props) {
  // Convert timeline frames → per-vessel SpeedPoint arrays for SpeedGraph.
  // Computed before the empty-timeline early return so hook order stays stable across renders.
  const speedDataByVessel = useMemo(() => {
    const result: Record<string, SpeedPoint[]> = {};
    for (const frame of timeline) {
      for (const [vesselId, pos] of Object.entries(frame.vessels)) {
        if (!result[vesselId]) result[vesselId] = [];
        result[vesselId].push({ timestampMs: frame.timestampMs, speed: pos.speedMps ?? 0 });
      }
    }
    return result;
  }, [timeline]);

  if (!timeline.length) return null;

  const threshold    = event.thresholdMps > 0 ? event.thresholdMps : null;
  const hasThreshold = threshold !== null;

  const duration       = formatDuration(event.eventStartMs, event.eventEndMs);
  const thresholdLabel = hasThreshold ? `${threshold} m/s` : 'N/A';

  return (
    <Box>
      {/* Event duration + threshold info bar */}
      <Box
        sx={{
          mt: 1,
          px: 2,
          py: 0.5,
          backgroundColor: 'rgba(255, 68, 68, 0.2)',
          borderLeft: '3px solid #ff4444',
          fontSize: '0.75rem',
          color: '#fff',
        }}
      >
        Event Duration: {duration}
        {' • '}
        Threshold: {thresholdLabel}
      </Box>

      {/* Speed-over-time SVG chart */}
      <SpeedGraph
        speedDataByVessel={speedDataByVessel}
        currentTimestampMs={currentTimestampMs}
        threshold={threshold}
        rangeStartMs={timeWindow.queryStartMs}
        rangeEndMs={timeWindow.queryEndMs}
        inverted={inverted}
      />
    </Box>
  );
}
