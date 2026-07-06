import type { EventDetailsBaseRaw } from '../../types';

export interface HighSpeedInformationRaw {
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

export interface HighSpeedEventDetailsRaw extends EventDetailsBaseRaw {
  information: HighSpeedInformationRaw;
}
