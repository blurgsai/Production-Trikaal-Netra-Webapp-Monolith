// ── Vessel trajectory ──────────────────────────────────────────────────────────

export interface VesselPositionRaw {
  latitude: number;
  longitude: number;
  speed_mps?: number;
  course?: number;
  heading?: number;
}

export interface TimeWindowRaw {
  query_start: number;
  query_end: number | null;
  event_start: number | null;
  event_end: number | null;
  buffer_hours?: number;
}

// ── Event details base schema ──────────────────────────────────────────────────
// All 39 event types share this exact structure. Only `information` varies per type.

export interface EventLocationRaw {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] — GeoJSON order
}

export interface EventDurationRaw {
  value: number;
  unit: 'seconds';
}

export interface EventDetailsBaseRaw {
  type: string;
  location: EventLocationRaw | null;
  timestamp: string;
  start_time: string | null;
  end_time: string | null;
  duration: EventDurationRaw | null;
  vessels_involved: (string | number)[];
  severity: string;
  model: string;
  status: string;
  s2_cell_id: string | null;
  temporality: 'bounded' | 'unbounded' | null;
  event_source: string | null;
  constituent_types?: string[]; // compound events only
  information: Record<string, unknown>; // typed per event in each event's api types file
}

// ── Playback API response ──────────────────────────────────────────────────────

export interface PlaybackApiResponse {
  event_details: EventDetailsBaseRaw;
  trajectories: Record<string, Record<string, VesselPositionRaw>>;
  time_window: TimeWindowRaw;
  [key: string]: unknown; // event-specific extra fields attached by the backend (e.g. geofence_polygon)
}
