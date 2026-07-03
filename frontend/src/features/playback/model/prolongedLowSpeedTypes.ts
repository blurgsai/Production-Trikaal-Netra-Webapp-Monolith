export interface ProlongedLowSpeedEvent {
  minSpeedMps: number;
  maxSpeedMps: number;
  meanSpeedMps: number;
  stdDeviationMps: number;
  q1SpeedMps: number;
  q3SpeedMps: number;
  thresholdMps: number;
  triggerSpeedMps: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}
