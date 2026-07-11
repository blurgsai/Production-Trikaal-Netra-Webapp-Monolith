export interface PlaybackAttribute {
  key: string;
  path: string;
}

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

export interface PlaybackQuery {
  baseTime: string;
  chunkOffset: number;
  granularity: TimeGranularity;
  geometry: GeoJSON.Geometry;
  filters: Record<string, unknown>;
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
