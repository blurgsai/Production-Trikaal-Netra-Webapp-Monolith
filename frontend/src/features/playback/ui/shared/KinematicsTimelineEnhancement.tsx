import { useMemo } from 'react';
import { Box } from '@mui/material';
import { SpeedGraph, type SpeedPoint } from './SpeedGraph';
import type { TimelineFrame, TimeWindow } from '../../model/types';

// Structural — any event-specific domain type exposing a signed reading and its
// bidirectional threshold band drives the readout. `unit`/`label` come from the plugin.
export interface KinematicReading {
  value: number;
  thresholdPositive: number;
  thresholdNegative: number;
}

export interface Props {
  event: KinematicReading;
  unit: string;   // 'm/s²' | 'm/s³'
  label: string;  // 'Sudden Stop' | 'Accel' | 'Jerk'
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));

// The kinematics family reuses the shared speed-over-time chart for temporal context
// (real, animated motion). The accel/jerk value itself is invisible in the speed curve —
// it's a derivative — so it's captioned in a one-line readout above the graph.
export function KinematicsTimelineEnhancement({
  event, unit, label, timeline, currentTimestampMs, timeWindow,
}: Props) {
  // Speed series per vessel, in the shape SpeedGraph consumes. Built before the
  // empty-timeline early return so hook order stays stable across renders.
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

  const { value, thresholdPositive: pos, thresholdNegative: neg } = event;
  const isAlert = value > pos || value < neg;
  const limit = value > pos ? pos : neg;

  return (
    <Box>
      {/* One-line kinematic readout — the value the detector fired on */}
      <Box
        sx={{
          mt: 1, px: 2, py: 0.5,
          backgroundColor: isAlert ? 'rgba(255, 68, 68, 0.2)' : 'rgba(76, 175, 80, 0.15)',
          borderLeft: `3px solid ${isAlert ? '#ff4444' : '#4caf50'}`,
          fontSize: '0.75rem', color: '#fff',
        }}
      >
        {isAlert ? '⚠ ' : '✓ '}{label} {signed(value)} {unit}
        {isAlert && <> · limit {signed(limit)} {unit}</>}
      </Box>

      {/* Reused speed-over-time chart — thresholdless (the accel/jerk threshold is on a
          different quantity than speed, so no speed threshold line is drawn) */}
      <SpeedGraph
        speedDataByVessel={speedDataByVessel}
        currentTimestampMs={currentTimestampMs}
        threshold={null}
        rangeStartMs={timeWindow.queryStartMs}
        rangeEndMs={timeWindow.queryEndMs}
      />
    </Box>
  );
}
