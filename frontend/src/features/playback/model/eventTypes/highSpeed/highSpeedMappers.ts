import { parseEventDate } from '../../playbackUtils';
import type { HighSpeedInformationRaw } from '../../../api/eventTypes/highSpeed/highSpeedTypes';
import type { HighSpeedEvent } from './highSpeedTypes';
import type { EventDetailsBase, TimeWindow, TrajectoryOverrideRule } from '../../types';

export function mapHighSpeedEventFromDetails(base: EventDetailsBase): HighSpeedEvent {
  const info = base.information as HighSpeedInformationRaw;
  return {
    minSpeedMps: info.min_speed_mps ?? 0,
    maxSpeedMps: info.max_speed_mps ?? 0,
    meanSpeedMps: info.mean_speed_mps ?? 0,
    stdDeviationMps: info.std_deviation_speed_mps ?? 0,
    q1SpeedMps: info.q1_speed_mps ?? 0,
    q3SpeedMps: info.q3_speed_mps ?? 0,
    thresholdMps: info.threshold_mps ?? 0,
    triggerSpeedMps: info.trigger_speed_mps ?? 0,
    vesselIds: base.vessels,
    eventStartMs: parseEventDate(base.startTime),
    eventEndMs: parseEventDate(base.endTime),
  };
}

// Highlights the bounded event window in red on the trajectory — the timeline
// doesn't expose per-point speed to this function, so the whole start→end
// span is marked rather than only the segments that exceeded the threshold.
export function getHighSpeedTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color: '#ff4444', weight: 4, opacity: 0.9 } }],
    ]),
  );
}
