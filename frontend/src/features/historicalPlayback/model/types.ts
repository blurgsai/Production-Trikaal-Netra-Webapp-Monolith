export interface PlaybackRange {
  start: string;
  end: string;
}

export interface PlaybackPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  heading: number;
}

export type TimeGranularity = "minute" | "hour" | "day" | "week";

export const GRANULARITY_SECONDS: Record<TimeGranularity, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

export const GRANULARITY_BUFFER_SIZE: Record<TimeGranularity, number> = {
  minute: 10,
  hour: 8,
  day: 5,
  week: 3,
};

export interface PlaybackChunk {
  chunkOffset: number;
  chunkStart: string;
  chunkEnd: string;
  timestamps: string[];
  vessels: Record<string, PlaybackPoint[]>;
}

export interface CurrentPosition {
  lat: number;
  lng: number;
  heading: number;
}

export interface PlaybackVessel {
  vesselId: string;
  currentPos: CurrentPosition;
  index: number;
}

export interface VesselPoint {
  lat: number;
  lng: number;
  ts: number;
  heading: number;
}

export interface AnimationVessel {
  vesselId: string;
  points: VesselPoint[];
  index: number;
  color: string;
  currentPos: { lat: number; lng: number; heading: number };
  fromPos: { lat: number; lng: number; heading: number };
  toPos: { lat: number; lng: number; heading: number };
  tweenProgress: number;
  isAnimating: boolean;
}

// ── Progressive filter domain types (user-friendly names, not DB columns) ──

export type FilterField =
  | "vesselId"
  | "mmsi"
  | "speed"
  | "heading"
  | "course"
  | "navigationStatus"
  | "latitude"
  | "longitude"
  | "kinematicsSpeed"
  | "shipName"
  | "destination"
  | "callsign";

export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like";

export type FilterCombinator = "AND" | "OR";

export interface PlaybackFilter {
  field: FilterField;
  operator: FilterOperator;
  value: string;
  combinator?: FilterCombinator;
}

export interface FilterFieldOption {
  field: FilterField;
  label: string;
  isNumeric: boolean;
}

export const FILTER_FIELD_OPTIONS: FilterFieldOption[] = [
  { field: "vesselId", label: "Vessel ID", isNumeric: true },
  { field: "mmsi", label: "MMSI", isNumeric: true },
  { field: "speed", label: "Speed (knots)", isNumeric: true },
  { field: "heading", label: "Heading", isNumeric: true },
  { field: "course", label: "Course Over Ground", isNumeric: true },
  { field: "navigationStatus", label: "Navigation Status", isNumeric: true },
  { field: "latitude", label: "Latitude", isNumeric: true },
  { field: "longitude", label: "Longitude", isNumeric: true },
  { field: "kinematicsSpeed", label: "Kinematics Speed (m/s)", isNumeric: true },
  { field: "shipName", label: "Ship Name", isNumeric: false },
  { field: "destination", label: "Destination", isNumeric: false },
  { field: "callsign", label: "Callsign", isNumeric: false },
];

export const FILTER_OPERATOR_OPTIONS: {
  value: FilterOperator;
  label: string;
}[] = [
  { value: "eq", label: "=" },
  { value: "ne", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "like", label: "LIKE" },
];
