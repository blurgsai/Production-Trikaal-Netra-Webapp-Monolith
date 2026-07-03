import { parseEventDate } from './playbackUtils';
import type { ProlongedStationaryInformationRaw } from '../api/prolongedStationaryTypes';
import type { ProlongedStationaryEvent } from './prolongedStationaryTypes';
import type { EventDetailsBase } from './types';

export function mapProlongedStationaryEventFromDetails(
  base: EventDetailsBase,
): ProlongedStationaryEvent {
  const info = base.information as ProlongedStationaryInformationRaw;
  return {
    minSpeedMps:       info.min_speed_mps           ?? 0,
    maxSpeedMps:       info.max_speed_mps           ?? 0,
    meanSpeedMps:      info.mean_speed_mps          ?? 0,
    stdDeviationMps:   info.std_deviation_speed_mps ?? 0,
    q1SpeedMps:        info.q1_speed_mps            ?? 0,
    q3SpeedMps:        info.q3_speed_mps            ?? 0,
    thresholdMps:      info.threshold_mps           ?? 0,
    thresholdDuration: info.threshold_duration      ?? 0,
    triggerSpeedMps:   info.trigger_speed_mps       ?? 0,
    vesselIds:         base.vessels,
    eventStartMs:      parseEventDate(base.startTime),
    eventEndMs:        parseEventDate(base.endTime),
  };
}
