import type { TimelineFrame, VesselPosition } from './types';

export const PLAYBACK_STEP_MS = 30_000;   // 30 s of maritime time per UI tick
export const TICK_INTERVAL_MS = 1_200;    // 1.2 s of real time per tick

// Trajectory speeds and shared speed components work in m/s; some event schemas
// report speed in knots. Convert in the mapper so units stay consistent downstream.
export const KNOTS_TO_MPS = 0.514444;
export function knotsToMps(knots: number): number {
  return knots * KNOTS_TO_MPS;
}

export function parseEventDate(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    let s = val;
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
    const ms = Date.parse(s);
    return isNaN(ms) ? null : ms;
  }
  return null;
}

export function formatPlaybackTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' UTC';
}

// Binary search: find the last-known position for every vessel at or before
// the given timestamp. O(log n) search + O(cutoff) accumulation.
export function resolvePositionsAtTime(
  timeline: TimelineFrame[],
  timestampMs: number,
): Record<string, VesselPosition> {
  if (!timeline.length) return {};

  let lo = 0, hi = timeline.length - 1, cutoff = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].timestampMs <= timestampMs) {
      cutoff = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (cutoff === -1) return {};

  const positions: Record<string, VesselPosition> = {};
  for (let i = 0; i <= cutoff; i++) {
    for (const [vesselId, pos] of Object.entries(timeline[i].vessels)) {
      positions[vesselId] = pos;
    }
  }
  return positions;
}
