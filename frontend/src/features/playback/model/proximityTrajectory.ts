import { parseEventDate } from './playbackUtils';
import type { EventDetailsBase, TimeWindow, TrajectoryOverrideRule } from './types';

// Shared across the multi-vessel proximity family (vessel_rendezvous,
// parallel_movement, coordinated_dark_activity, duplicate_mmsi). Highlights EVERY
// involved vessel's track during the event window, severity-coloured. Registered
// under each type's key in trajectoryOverrideRegistry.ts.
//
// Some of these events are instantaneous or shorter than the AIS sample gap
// (duplicate_mmsi), so — like the kinematics family — we enforce a minimum visible
// span centred on the event, otherwise the highlighted segment would collapse to
// nothing on the track.
// (Flattened from model/shared/proximityTrajectory.ts to satisfy the flat-layer CI rule.)
const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff1744',
  high: '#ff4444',
  medium: '#ff8c00',
  low: '#42a5f5',
  resolved: '#4caf50',
};

const MIN_SPAN_MS = 600_000; // 10 min

export function getProximityTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  if (!eventDetails.vessels.length) return null;

  const color = SEVERITY_COLOR[eventDetails.severity] ?? '#ff4444';

  let start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  let end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? start;

  if (end - start < MIN_SPAN_MS) {
    const mid = (start + end) / 2;
    start = mid - MIN_SPAN_MS / 2;
    end   = mid + MIN_SPAN_MS / 2;
  }

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color, weight: 4, opacity: 0.9 } }],
    ]),
  );
}
