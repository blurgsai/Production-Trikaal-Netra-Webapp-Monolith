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

// ── dark_ship ────────────────────────────────────────────────────────────────

// Per data-team schema — dark_ship.information has exactly 3 fields
export interface DarkShipInformationRaw {
  [key: string]: unknown;
  vessel_update_rate_per_hour?: number;
  area_average_update_rate_per_hour?: number;
  time_since_last_update_seconds?: number;
}

export interface DarkShipEventDetailsRaw extends EventDetailsBaseRaw {
  information: DarkShipInformationRaw;
}

// ── signal_lost ──────────────────────────────────────────────────────────────

// Per data-team schema — signal_lost.information. `last_known_position`
// duplicates the top-level `location`, so the mapper doesn't need to read it.
export interface SignalLostInformationRaw {
  [key: string]: unknown;
  detector?: string;
  threshold_value?: number;
  signal_lost_duration_seconds?: number;
  last_known_position?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface SignalLostEventDetailsRaw extends EventDetailsBaseRaw {
  information: SignalLostInformationRaw;
}

// ── dark_after_departure ──────────────────────────────────────────────────────

export interface DarkAfterDepartureThresholdsRaw {
  departure_to_dark_threshold_seconds?: number;
}

// Per data-team schema — dark_after_departure.information
export interface DarkAfterDepartureInformationRaw {
  [key: string]: unknown;
  thresholds?: DarkAfterDepartureThresholdsRaw;
  port_id?: string;
  port_departure_time?: string | null;
  dark_start_time?: string | null;
  time_since_departure_seconds?: number;
  vessel_update_rate_per_hour?: number;
  area_average_update_rate_per_hour?: number;
  time_since_last_update_seconds?: number;
}

export interface DarkAfterDepartureEventDetailsRaw extends EventDetailsBaseRaw {
  information: DarkAfterDepartureInformationRaw;
}

// ── port_intrusion ─────────────────────────────────────────────────────────

// Polygon fetched by backend (keyed off information.port_id) from a separate
// collection and attached as the top-level `port_polygon` extra — same
// mechanism as geofence_intrusion's geofence_polygon. Reuses the shared
// GeofencePolygonCoordinatesRaw geometry above rather than a separate file.
export interface PortPolygonRaw {
  port_id?: string;
  port_name?: string;
  polygon: GeofencePolygonCoordinatesRaw;
}

// Per data-team schema — port_intrusion.information has exactly 4 fields
export interface PortIntrusionInformationRaw {
  [key: string]: unknown;
  port_id?: string;
  restriction_type?: string;
  intrusion_duration_seconds?: number;
  violation_count?: number;
}

export interface PortIntrusionEventDetailsRaw extends EventDetailsBaseRaw {
  information: PortIntrusionInformationRaw;
}
