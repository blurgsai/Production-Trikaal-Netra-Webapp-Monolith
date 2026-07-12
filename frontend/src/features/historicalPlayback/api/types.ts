export interface TrajectoryPointApi {
  ts: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
}

export type TrajectoryFilterOperatorApi =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like";

export type TrajectoryFilterCombinatorApi = "AND" | "OR";

export interface TrajectoryFilterApi {
  column: string;
  operator: TrajectoryFilterOperatorApi;
  value: string | number;
  combinator?: TrajectoryFilterCombinatorApi;
}

export interface TrajectoryRequestApi {
  vessel_ids?: string[];
  polygon?: GeoJSON.Geometry;
  start_time?: string;
  end_time?: string;
  time_seconds?: number;
  filters?: TrajectoryFilterApi[];
}

export interface TrajectoryResponseApi {
  trajectories: Record<string, TrajectoryPointApi[]>;
  timestamps: string[];
}
