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

// ── kinematics family (sudden_stop / anomalous_acceleration / anomalous_jerk) ──
// All three carry a signed kinematic reading plus a bidirectional threshold band.
// Values already in SI (m/s² / m/s³) — no unit conversion in the mapper.

export interface SuddenStopInformationRaw {
  [key: string]: unknown;
  deceleration_mps2?: number;
  threshold_positive_acceleration_mps2?: number;
  threshold_negative_acceleration_mps2?: number;
  acceleration_direction?: string;
  threshold_type?: string;
  speed_before_mps?: number;
  speed_after_mps?: number;
  speed_drop_mps?: number;
}

export interface SuddenStopEventDetailsRaw extends EventDetailsBaseRaw {
  information: SuddenStopInformationRaw;
}

export interface AnomalousAccelerationInformationRaw {
  [key: string]: unknown;
  threshold_positive_acceleration_mps2?: number;
  threshold_negative_acceleration_mps2?: number;
  acceleration_direction?: string;
  threshold_type?: string;
  observed_acceleration_mps2?: number;
  speed_before_mps?: number;
  speed_after_mps?: number;
  speed_change_mps?: number;
}

export interface AnomalousAccelerationEventDetailsRaw extends EventDetailsBaseRaw {
  information: AnomalousAccelerationInformationRaw;
}

// Richest of the family — includes jerk distribution stats.
export interface AnomalousJerkInformationRaw {
  [key: string]: unknown;
  threshold_positive_jerk_mps3?: number;
  threshold_negative_jerk_mps3?: number;
  std_deviation_jerk?: number;
  mean_jerk_mps3?: number;
  q1_jerk?: number;
  q3_jerk?: number;
  trigger_jerk_mps3?: number;
  jerk_direction?: string;
  threshold_type?: string;
  calculation_method?: string;
  observed_jerk_mps3?: number;
  acceleration_before_mps2?: number;
  acceleration_after_mps2?: number;
  jerk_peak_mps3?: number;
}

export interface AnomalousJerkEventDetailsRaw extends EventDetailsBaseRaw {
  information: AnomalousJerkInformationRaw;
}

// ── speed family (high_speed / prolonged_low_speed / prolonged_stationary / uneconomical_transit) ──
// high_speed, prolonged_low_speed and prolonged_stationary share the same 8 speed-statistic
// fields (m/s); prolonged_stationary adds threshold_duration. uneconomical_transit reports in
// knots/hours and is converted to m/s in its mapper.

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

export interface UneconomicalTransitInformationRaw {
  [key: string]: unknown;
  average_sog_knots?: number;
  current_sog_knots?: number;
  voyage_duration_hours?: number;
  speed_threshold_knots?: number;
  duration_threshold_hours?: number;
}

export interface UneconomicalTransitEventDetailsRaw extends EventDetailsBaseRaw {
  information: UneconomicalTransitInformationRaw;
}

// ── proximity / multi-vessel family (vessel_rendezvous / parallel_movement / duplicate_mmsi / coordinated_dark_activity) ──
// All involve ≥2 vessels and a distance threshold. Speeds vary by unit per type
// (knots for rendezvous/duplicate_mmsi, m/s for parallel_movement) — converted in
// each mapper. Distances are metres throughout.

export interface VesselRendezvousThresholdsRaw {
  distance_threshold_m?: number;
  duration_threshold_seconds?: number;
}

export interface VesselRendezvousInformationRaw {
  [key: string]: unknown;
  min_distance_m?: number;
  max_distance_m?: number;
  median_distance_m?: number;
  avg_speed_v1_knots?: number;
  avg_speed_v2_knots?: number;
  thresholds?: VesselRendezvousThresholdsRaw;
}

export interface VesselRendezvousEventDetailsRaw extends EventDetailsBaseRaw {
  information: VesselRendezvousInformationRaw;
}

export interface ParallelMovementThresholdsRaw {
  distance_threshold_m?: number;
  duration_threshold_seconds?: number;
}

export interface ParallelMovementInformationRaw {
  [key: string]: unknown;
  distance_m?: number;
  heading_difference_degrees?: number;
  speed_difference_mps?: number;
  parallelity_score?: number;
  sustained_duration_seconds?: number;
  thresholds?: ParallelMovementThresholdsRaw;
}

export interface ParallelMovementEventDetailsRaw extends EventDetailsBaseRaw {
  information: ParallelMovementInformationRaw;
}

// `spoofed_mmsi` mirrors the MMSI being cloned. Speeds in knots.
export interface DuplicateMmsiInformationRaw {
  [key: string]: unknown;
  spoofed_mmsi?: number | string;
  distance_discrepancy_m?: number;
  speed_required_to_match?: number;
  vessel_max_speed?: number;
  probability_of_spoofing?: number;
}

export interface DuplicateMmsiEventDetailsRaw extends EventDetailsBaseRaw {
  information: DuplicateMmsiInformationRaw;
}

// An N-vessel cluster (2–4) that goes AIS-dark together. `vessel_id` here is an
// internal vessel_id (same namespace as vessels_involved / trajectory keys), NOT an MMSI.
export interface CoordinatedDarkActivityThresholdsRaw {
  distance_threshold_m?: number;
  coordination_threshold_window_seconds?: number;
}

export interface CoordinatedDarkVesselUpdateRateRaw {
  vessel_id?: number | string;
  rate_per_hour?: number;
  last_update_seconds?: number;
}

export interface CoordinatedDarkActivityInformationRaw {
  [key: string]: unknown;
  thresholds?: CoordinatedDarkActivityThresholdsRaw;
  cluster_size?: number;
  coordination_score?: number;
  co_dark_window_seconds?: number;
  area_average_update_rate_per_hour?: number;
  vessel_update_rates?: CoordinatedDarkVesselUpdateRateRaw[];
  cluster_average_update_rate?: number;
}

export interface CoordinatedDarkActivityEventDetailsRaw extends EventDetailsBaseRaw {
  information: CoordinatedDarkActivityInformationRaw;
}
