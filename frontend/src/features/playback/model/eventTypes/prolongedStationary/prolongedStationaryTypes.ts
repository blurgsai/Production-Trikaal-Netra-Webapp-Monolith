import type { ProlongedLowSpeedEvent } from '../prolongedLowSpeed/prolongedLowSpeedTypes';

export interface ProlongedStationaryEvent extends ProlongedLowSpeedEvent {
  thresholdDuration: number;
}
