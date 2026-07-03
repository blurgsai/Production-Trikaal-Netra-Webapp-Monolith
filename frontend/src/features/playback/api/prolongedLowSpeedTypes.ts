import type { EventDetailsBaseRaw } from './types';

// Per events_schema — prolonged_low_speed.information has 8 speed statistics fields.
// Index signature required so this satisfies `Record<string, unknown>` from EventDetailsBaseRaw.
export interface ProlongedLowSpeedInformationRaw {
  [key: string]: unknown;
  min_speed_mps?: number;
  max_speed_mps?: number;
  mean_speed_mps?: number;
  std_deviation_speed_mps?: number;
  q1_speed_mps?: number;
  q3_speed_mps?: number;
  threshold_mps?: number;
  trigger_speed_mps?: number;
}

export interface ProlongedLowSpeedEventDetailsRaw extends EventDetailsBaseRaw {
  information: ProlongedLowSpeedInformationRaw;
}
