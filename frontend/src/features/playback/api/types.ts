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

// ── Raw event-type schemas ───────────────────────────────────────────────────
// Backend mirror for each event type's `information` block and any extra
// top-level payload it attaches. One flat file, one section per event type.
// (Flattened from api/eventTypes/<type>/ to satisfy the flat-layer CI rule.)

// ── geofence_intrusion ───────────────────────────────────────────────────────

// Polygon fetched by backend from a separate collection and attached to the response
export interface GeofencePolygonCoordinatesRaw {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface GeofencePolygonRaw {
  geofence_id?: string;
  asset_name?: string;
  polygon: GeofencePolygonCoordinatesRaw;
}

// Per events_schema_v3 — geofence_intrusion.information has exactly 3 fields
// Index signature required so this satisfies `Record<string, unknown>` from EventDetailsBaseRaw.
export interface GeofenceIntrusionInformationRaw {
  [key: string]: unknown;
  geofence_id?: string;
  geofence_name?: string;
  Has_exited_polygon?: boolean; // capital H — exact data team field name
}

export interface GeofenceIntrusionEventDetailsRaw extends EventDetailsBaseRaw {
  information: GeofenceIntrusionInformationRaw;
}
