import type { EventDetailsBaseRaw } from '../../types';

export interface ProlongedStationaryInformationRaw {
  [key: string]: unknown;
  min_speed_mps?: number;
  max_speed_mps?: number;
  mean_speed_mps?: number;
  std_deviation_speed_mps?: number;
  q1_speed_mps?: number;
  q3_speed_mps?: number;
  threshold_mps?: number;
  threshold_duration?: number;
  trigger_speed_mps?: number;
}

export interface ProlongedStationaryEventDetailsRaw extends EventDetailsBaseRaw {
  information: ProlongedStationaryInformationRaw;
}
