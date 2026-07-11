export interface PlaybackAttributeApi {
  key: string;
  path: string;
}

export interface PlaybackAttributesResponse {
  attributes: PlaybackAttributeApi[];
}

export interface PlaybackQueryPayload {
  base_time: string;
  chunk_offset: number;
  granularity: string;
  geometry: GeoJSON.Geometry;
  filters: Record<string, unknown>;
}

export interface PlaybackPointApi {
  ts: string;
  lat: number;
  lon: number;
  heading: number;
}

export interface PlaybackChunkResponse {
  chunk_offset: number;
  chunk_start: string;
  chunk_end: string;
  timestamps: string[];
  vessels: Record<string, PlaybackPointApi[]>;
}
