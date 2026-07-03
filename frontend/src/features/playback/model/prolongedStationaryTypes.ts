import type { ProlongedLowSpeedEvent } from './prolongedLowSpeedTypes';

export interface ProlongedStationaryEvent extends ProlongedLowSpeedEvent {
  thresholdDuration: number;
}
