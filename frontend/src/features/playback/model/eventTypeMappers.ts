import { parseEventDate, knotsToMps } from './playbackUtils';
import type {
  GeofenceEvent,
  GeofencePolygonCoordinates,
  DarkShipEvent,
  SignalLostEvent,
  DarkAfterDepartureEvent,
  PortIntrusionEvent,
  SuddenStopEvent,
  AnomalousAccelerationEvent,
  AnomalousJerkEvent,
  HighSpeedEvent,
  ProlongedLowSpeedEvent,
  ProlongedStationaryEvent,
  UneconomicalTransitEvent,
  VesselRendezvousEvent,
  ParallelMovementEvent,
  DuplicateMmsiEvent,
  CoordinatedDarkActivityEvent,
} from './eventTypeTypes';
import type { EventDetailsBase, TimeWindow, TrajectoryOverrideRule } from './types';

// ── Event-type mappers + trajectory-override functions ───────────────────────
// One flat file, one section per event type. Operates on already-mapped domain
// data (EventDetailsBase / extras), so it imports ONLY from model/ — never api/.
// That keeps it clear of the "only model/mappers.ts may import api types" rule
// even though it isn't named mappers.ts.
// (Flattened from model/eventTypes/<type>/<type>Mappers.ts.)

// ── geofence_intrusion ───────────────────────────────────────────────────────

type GeofencePolygonExtras = {
  polygon?: GeofencePolygonCoordinates;
};

function parseGeoJsonToPositions(
  raw: GeofencePolygonExtras | undefined,
): [number, number][][] | null {
  if (!raw?.polygon?.coordinates) return null;

  const { type, coordinates } = raw.polygon;

  if (type === 'Polygon') {
    return (coordinates as number[][][]).map(ring =>
      ring.map(([lon, lat]) => [lat, lon] as [number, number]),
    );
  }

  if (type === 'MultiPolygon') {
    return (coordinates as number[][][][]).flatMap(poly =>
      poly.map(ring => ring.map(([lon, lat]) => [lat, lon] as [number, number])),
    );
  }

  return null;
}

export function mapGeofenceEventFromDetails(
  base: EventDetailsBase,
  extras: Record<string, unknown>,
): GeofenceEvent {
  const info    = base.information as Record<string, unknown>;
  const polygon = extras['geofence_polygon'] as GeofencePolygonExtras | undefined;

  return {
    geofenceName:     (info['geofence_name'] as string | undefined)      ?? 'Restricted Area',
    geofenceId:       (info['geofence_id'] as string | undefined)        ?? null,
    hasExitedPolygon: (info['Has_exited_polygon'] as boolean | undefined) ?? false,
    intrusionStartMs: parseEventDate(base.startTime),
    intrusionEndMs:   parseEventDate(base.endTime),
    vesselIds:        base.vessels,
    polygonPositions: parseGeoJsonToPositions(polygon),
  };
}

export function getGeofenceTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const info  = eventDetails.information as Record<string, unknown>;
  const color = (info['Has_exited_polygon'] as boolean | undefined ?? false) ? '#ff8c00' : '#ff4444';

  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color, weight: 3, opacity: 0.9 } }],
    ]),
  );
}

// ── dark_ship ────────────────────────────────────────────────────────────────

// Raw field names (snake_case) are read via bracket notation off the already-mapped
// domain `information` block — so this file imports only from model/, never api/.
export function mapDarkShipEventFromDetails(base: EventDetailsBase): DarkShipEvent {
  const info = base.information as Record<string, unknown>;
  return {
    vesselIds:              base.vessels,
    location:               base.location,
    updateRatePerHour:      (info['vessel_update_rate_per_hour'] as number | undefined)      ?? 0,
    areaAverageRatePerHour: (info['area_average_update_rate_per_hour'] as number | undefined) ?? 0,
    timeSinceLastUpdateSec: (info['time_since_last_update_seconds'] as number | undefined)    ?? 0,
    severity:               base.severity,
    eventStartMs:           parseEventDate(base.startTime),
    eventEndMs:             parseEventDate(base.endTime),
  };
}

// Backend model already decides severity — reuse it for colour rather than
// re-deriving our own threshold on time_since_last_update_seconds.
const DARK_SHIP_SEVERITY_COLOR: Record<string, string> = {
  high:     '#ff4444',
  medium:   '#ff8c00',
  low:      '#42a5f5',
  resolved: '#4caf50',
};

export function getDarkShipTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const color = DARK_SHIP_SEVERITY_COLOR[eventDetails.severity] ?? '#ff4444';

  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color, weight: 3, opacity: 0.9 } }],
    ]),
  );
}

// ── signal_lost ──────────────────────────────────────────────────────────────

export function mapSignalLostEventFromDetails(base: EventDetailsBase): SignalLostEvent {
  const info = base.information as Record<string, unknown>;
  return {
    vesselIds:         base.vessels,
    location:          base.location,
    thresholdSec:      (info['threshold_value'] as number | undefined)               ?? 0,
    silentDurationSec: (info['signal_lost_duration_seconds'] as number | undefined)   ?? 0,
    severity:          base.severity,
    eventStartMs:      parseEventDate(base.startTime),
    eventEndMs:        parseEventDate(base.endTime),
  };
}

// Same convention as dark_ship: the backend model already decided severity,
// so colour the trajectory by that rather than inventing our own threshold.
const SIGNAL_LOST_SEVERITY_COLOR: Record<string, string> = {
  high:     '#ff4444',
  medium:   '#ff8c00',
  low:      '#42a5f5',
  resolved: '#4caf50',
};

export function getSignalLostTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const color = SIGNAL_LOST_SEVERITY_COLOR[eventDetails.severity] ?? '#ff4444';

  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color, weight: 3, opacity: 0.9 } }],
    ]),
  );
}

// ── port_intrusion ─────────────────────────────────────────────────────────

// Reuses the inline parseGeoJsonToPositions / GeofencePolygonExtras from the
// geofence_intrusion section above — the port zone geometry arrives on the same
// `{ polygon }` wrapper, just under a different extras key and with port_id /
// port_name instead of geofence_id / asset_name.
export function mapPortIntrusionEventFromDetails(
  base: EventDetailsBase,
  extras: Record<string, unknown> = {},
): PortIntrusionEvent {
  const info     = base.information as Record<string, unknown>;
  const portPoly = extras['port_polygon'] as (GeofencePolygonExtras & { port_id?: string; port_name?: string }) | undefined;

  return {
    vesselIds:            base.vessels,
    portId:               (info['port_id'] as string | undefined) ?? portPoly?.port_id ?? null,
    portName:             (portPoly?.port_name as string | undefined) ?? null,
    restrictionType:      (info['restriction_type'] as string | undefined)      ?? null,
    intrusionDurationSec: (info['intrusion_duration_seconds'] as number | undefined) ?? 0,
    violationCount:       (info['violation_count'] as number | undefined)        ?? 1,
    severity:             base.severity,
    polygonPositions:     parseGeoJsonToPositions(portPoly),
  };
}

// Same convention as the rest — backend model already decides severity, reuse
// it rather than re-deriving our own threshold from violation_count.
const PORT_INTRUSION_SEVERITY_COLOR: Record<string, string> = {
  high:     '#ff4444',
  medium:   '#ff8c00',
  low:      '#42a5f5',
  resolved: '#4caf50',
};

export function getPortIntrusionTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const color = PORT_INTRUSION_SEVERITY_COLOR[eventDetails.severity] ?? '#ff4444';

  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color, weight: 3, opacity: 0.9 } }],
    ]),
  );
}

// ── dark_after_departure ──────────────────────────────────────────────────────

export function mapDarkAfterDepartureEventFromDetails(
  base: EventDetailsBase,
  extras: Record<string, unknown> = {},
): DarkAfterDepartureEvent {
  const info       = base.information as Record<string, unknown>;
  const thresholds = info['thresholds'] as Record<string, unknown> | undefined;
  const portPoly   = extras['port_polygon'] as (GeofencePolygonExtras & { asset_name?: string }) | undefined;

  return {
    vesselIds:                   base.vessels,
    location:                    base.location,
    portId:                      (info['port_id'] as string | undefined) ?? null,
    portName:                    (portPoly?.asset_name as string | undefined) ?? null,
    portDepartureMs:             parseEventDate(info['port_departure_time'] as string | null | undefined),
    darkStartMs:                 parseEventDate(info['dark_start_time'] as string | null | undefined),
    timeSinceDepartureSec:       (info['time_since_departure_seconds'] as number | undefined) ?? 0,
    departureToDarkThresholdSec: (thresholds?.['departure_to_dark_threshold_seconds'] as number | undefined) ?? 0,
    updateRatePerHour:           (info['vessel_update_rate_per_hour'] as number | undefined) ?? 0,
    areaAverageRatePerHour:      (info['area_average_update_rate_per_hour'] as number | undefined) ?? 0,
    timeSinceLastUpdateSec:      (info['time_since_last_update_seconds'] as number | undefined) ?? 0,
    severity:                    base.severity,
    eventStartMs:                parseEventDate(base.startTime),
    eventEndMs:                  parseEventDate(base.endTime),
    portPolygonPositions:        parseGeoJsonToPositions(portPoly),
  };
}

// Same convention as dark_ship/signal_lost — backend model already decides
// severity, reuse it for colour rather than re-deriving our own threshold.
const DARK_AFTER_DEPARTURE_SEVERITY_COLOR: Record<string, string> = {
  high:     '#ff4444',
  medium:   '#ff8c00',
  low:      '#42a5f5',
  resolved: '#4caf50',
};

export function getDarkAfterDepartureTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const color = DARK_AFTER_DEPARTURE_SEVERITY_COLOR[eventDetails.severity] ?? '#ff4444';

  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color, weight: 3, opacity: 0.9 } }],
    ]),
  );
}

// ── kinematics family (sudden_stop / anomalous_acceleration / anomalous_jerk) ──
// Snake_case raw fields are read via Record<string,unknown> bracket access off the
// already-mapped domain `information` block — so this file imports only from model/.
// Trajectory highlighting is the SHARED getKinematicsTrajectoryOverrides (model/
// kinematicsTrajectory.ts), registered under all three type keys — not defined here.

export function mapSuddenStopEventFromDetails(base: EventDetailsBase): SuddenStopEvent {
  const info = base.information as Record<string, unknown>;
  return {
    value:             (info['deceleration_mps2'] as number | undefined)                    ?? 0,
    thresholdPositive: (info['threshold_positive_acceleration_mps2'] as number | undefined)  ?? 0,
    thresholdNegative: (info['threshold_negative_acceleration_mps2'] as number | undefined)  ?? 0,
    direction:         (info['acceleration_direction'] as string | undefined)                ?? 'unknown',
    speedBeforeMps:    (info['speed_before_mps'] as number | undefined)                      ?? 0,
    speedAfterMps:     (info['speed_after_mps'] as number | undefined)                       ?? 0,
    speedDropMps:      (info['speed_drop_mps'] as number | undefined)                        ?? 0,
    vesselIds:         base.vessels,
    eventStartMs:      parseEventDate(base.startTime),
    eventEndMs:        parseEventDate(base.endTime),
  };
}

export function mapAnomalousAccelerationEventFromDetails(base: EventDetailsBase): AnomalousAccelerationEvent {
  const info = base.information as Record<string, unknown>;
  return {
    value:             (info['observed_acceleration_mps2'] as number | undefined)            ?? 0,
    thresholdPositive: (info['threshold_positive_acceleration_mps2'] as number | undefined)  ?? 0,
    thresholdNegative: (info['threshold_negative_acceleration_mps2'] as number | undefined)  ?? 0,
    direction:         (info['acceleration_direction'] as string | undefined)                ?? 'unknown',
    speedBeforeMps:    (info['speed_before_mps'] as number | undefined)                      ?? 0,
    speedAfterMps:     (info['speed_after_mps'] as number | undefined)                       ?? 0,
    speedChangeMps:    (info['speed_change_mps'] as number | undefined)                      ?? 0,
    vesselIds:         base.vessels,
    eventStartMs:      parseEventDate(base.startTime),
    eventEndMs:        parseEventDate(base.endTime),
  };
}

export function mapAnomalousJerkEventFromDetails(base: EventDetailsBase): AnomalousJerkEvent {
  const info = base.information as Record<string, unknown>;
  return {
    value:                  (info['observed_jerk_mps3'] as number | undefined) ?? (info['jerk_peak_mps3'] as number | undefined) ?? 0,
    thresholdPositive:      (info['threshold_positive_jerk_mps3'] as number | undefined) ?? 0,
    thresholdNegative:      (info['threshold_negative_jerk_mps3'] as number | undefined) ?? 0,
    direction:              (info['jerk_direction'] as string | undefined)               ?? 'unknown',
    meanJerk:               (info['mean_jerk_mps3'] as number | undefined)               ?? 0,
    triggerJerk:            (info['trigger_jerk_mps3'] as number | undefined)            ?? 0,
    accelerationBeforeMps2: (info['acceleration_before_mps2'] as number | undefined)     ?? 0,
    accelerationAfterMps2:  (info['acceleration_after_mps2'] as number | undefined)      ?? 0,
    vesselIds:              base.vessels,
    eventStartMs:           parseEventDate(base.startTime),
    eventEndMs:             parseEventDate(base.endTime),
  };
}

// ── speed family (high_speed / prolonged_low_speed / prolonged_stationary / uneconomical_transit) ──
// Snake_case raw fields read via Record<string,unknown> bracket access (model-only import).
// Only high_speed contributes a trajectory override; the other three have none.

export function mapHighSpeedEventFromDetails(base: EventDetailsBase): HighSpeedEvent {
  const info = base.information as Record<string, unknown>;
  return {
    minSpeedMps:     (info['min_speed_mps'] as number | undefined)           ?? 0,
    maxSpeedMps:     (info['max_speed_mps'] as number | undefined)           ?? 0,
    meanSpeedMps:    (info['mean_speed_mps'] as number | undefined)          ?? 0,
    stdDeviationMps: (info['std_deviation_speed_mps'] as number | undefined) ?? 0,
    q1SpeedMps:      (info['q1_speed_mps'] as number | undefined)            ?? 0,
    q3SpeedMps:      (info['q3_speed_mps'] as number | undefined)            ?? 0,
    thresholdMps:    (info['threshold_mps'] as number | undefined)          ?? 0,
    triggerSpeedMps: (info['trigger_speed_mps'] as number | undefined)       ?? 0,
    vesselIds:       base.vessels,
    eventStartMs:    parseEventDate(base.startTime),
    eventEndMs:      parseEventDate(base.endTime),
  };
}

// Highlights the bounded event window in red on the trajectory — the timeline
// doesn't expose per-point speed to this function, so the whole start→end span
// is marked rather than only the segments that exceeded the threshold.
export function getHighSpeedTrajectoryOverrides(
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const start = parseEventDate(eventDetails.startTime) ?? timeWindow.eventStartMs;
  const end   = parseEventDate(eventDetails.endTime)   ?? timeWindow.eventEndMs ?? timeWindow.queryEndMs;

  if (!eventDetails.vessels.length) return null;

  return Object.fromEntries(
    eventDetails.vessels.map(vesselId => [
      vesselId,
      [{ start, end, style: { color: '#ff4444', weight: 4, opacity: 0.9 } }],
    ]),
  );
}

export function mapProlongedLowSpeedEventFromDetails(base: EventDetailsBase): ProlongedLowSpeedEvent {
  const info = base.information as Record<string, unknown>;
  return {
    minSpeedMps:     (info['min_speed_mps'] as number | undefined)           ?? 0,
    maxSpeedMps:     (info['max_speed_mps'] as number | undefined)           ?? 0,
    meanSpeedMps:    (info['mean_speed_mps'] as number | undefined)          ?? 0,
    stdDeviationMps: (info['std_deviation_speed_mps'] as number | undefined) ?? 0,
    q1SpeedMps:      (info['q1_speed_mps'] as number | undefined)            ?? 0,
    q3SpeedMps:      (info['q3_speed_mps'] as number | undefined)            ?? 0,
    thresholdMps:    (info['threshold_mps'] as number | undefined)          ?? 0,
    triggerSpeedMps: (info['trigger_speed_mps'] as number | undefined)       ?? 0,
    vesselIds:       base.vessels,
    eventStartMs:    parseEventDate(base.startTime),
    eventEndMs:      parseEventDate(base.endTime),
  };
}

export function mapProlongedStationaryEventFromDetails(base: EventDetailsBase): ProlongedStationaryEvent {
  const info = base.information as Record<string, unknown>;
  return {
    minSpeedMps:       (info['min_speed_mps'] as number | undefined)           ?? 0,
    maxSpeedMps:       (info['max_speed_mps'] as number | undefined)           ?? 0,
    meanSpeedMps:      (info['mean_speed_mps'] as number | undefined)          ?? 0,
    stdDeviationMps:   (info['std_deviation_speed_mps'] as number | undefined) ?? 0,
    q1SpeedMps:        (info['q1_speed_mps'] as number | undefined)            ?? 0,
    q3SpeedMps:        (info['q3_speed_mps'] as number | undefined)            ?? 0,
    thresholdMps:      (info['threshold_mps'] as number | undefined)          ?? 0,
    thresholdDuration: (info['threshold_duration'] as number | undefined)      ?? 0,
    triggerSpeedMps:   (info['trigger_speed_mps'] as number | undefined)       ?? 0,
    vesselIds:         base.vessels,
    eventStartMs:      parseEventDate(base.startTime),
    eventEndMs:        parseEventDate(base.endTime),
  };
}

// Round a converted m/s value to 2 decimals — keeps the threshold label the shared
// speed components render (e.g. "1.03 m/s") clean instead of "1.028888…".
const round2 = (n: number): number => Math.round(n * 100) / 100;

export function mapUneconomicalTransitEventFromDetails(base: EventDetailsBase): UneconomicalTransitEvent {
  const info = base.information as Record<string, unknown>;
  return {
    averageSogMps:          round2(knotsToMps((info['average_sog_knots'] as number | undefined) ?? 0)),
    currentSogMps:          round2(knotsToMps((info['current_sog_knots'] as number | undefined) ?? 0)),
    thresholdMps:           round2(knotsToMps((info['speed_threshold_knots'] as number | undefined) ?? 0)),
    voyageDurationHours:    (info['voyage_duration_hours'] as number | undefined)    ?? 0,
    durationThresholdHours: (info['duration_threshold_hours'] as number | undefined) ?? 0,
    vesselIds:              base.vessels,
    eventStartMs:           parseEventDate(base.startTime),
    eventEndMs:             parseEventDate(base.endTime),
  };
}

// ── proximity / multi-vessel family (vessel_rendezvous / parallel_movement / duplicate_mmsi / coordinated_dark_activity) ──
// Snake_case raw fields read via Record<string,unknown> bracket access (model-only import).
// Trajectory highlighting is the SHARED getProximityTrajectoryOverrides (model/
// proximityTrajectory.ts), registered under all four type keys — not defined here.

export function mapVesselRendezvousEventFromDetails(base: EventDetailsBase): VesselRendezvousEvent {
  const info       = base.information as Record<string, unknown>;
  const thresholds = info['thresholds'] as Record<string, unknown> | undefined;
  return {
    vesselIds:            base.vessels,
    location:             base.location,
    minDistanceM:         (info['min_distance_m'] as number | undefined)    ?? 0,
    maxDistanceM:         (info['max_distance_m'] as number | undefined)    ?? 0,
    medianDistanceM:      (info['median_distance_m'] as number | undefined) ?? 0,
    avgSpeedV1Mps:        knotsToMps((info['avg_speed_v1_knots'] as number | undefined) ?? 0),
    avgSpeedV2Mps:        knotsToMps((info['avg_speed_v2_knots'] as number | undefined) ?? 0),
    distanceThresholdM:   (thresholds?.['distance_threshold_m'] as number | undefined)      ?? null,
    durationThresholdSec: (thresholds?.['duration_threshold_seconds'] as number | undefined) ?? null,
    severity:             base.severity,
    eventStartMs:         parseEventDate(base.startTime),
    eventEndMs:           parseEventDate(base.endTime),
  };
}

export function mapParallelMovementEventFromDetails(base: EventDetailsBase): ParallelMovementEvent {
  const info       = base.information as Record<string, unknown>;
  const thresholds = info['thresholds'] as Record<string, unknown> | undefined;
  return {
    vesselIds:            base.vessels,
    location:             base.location,
    distanceM:            (info['distance_m'] as number | undefined)                  ?? 0,
    headingDifferenceDeg: (info['heading_difference_degrees'] as number | undefined)  ?? 0,
    speedDifferenceMps:   (info['speed_difference_mps'] as number | undefined)        ?? 0,
    parallelityScore:     (info['parallelity_score'] as number | undefined)           ?? 0,
    sustainedDurationSec: (info['sustained_duration_seconds'] as number | undefined)  ?? 0,
    distanceThresholdM:   (thresholds?.['distance_threshold_m'] as number | undefined)      ?? null,
    durationThresholdSec: (thresholds?.['duration_threshold_seconds'] as number | undefined) ?? null,
    severity:             base.severity,
    eventStartMs:         parseEventDate(base.startTime),
    eventEndMs:           parseEventDate(base.endTime),
  };
}

export function mapDuplicateMmsiEventFromDetails(base: EventDetailsBase): DuplicateMmsiEvent {
  const info          = base.information as Record<string, unknown>;
  const spoofedMmsi   = info['spoofed_mmsi'];
  const maxSpeedKnots = (info['vessel_max_speed'] as number | undefined) ?? 0;
  const durationSec   = base.duration?.valueSeconds ?? 0;
  return {
    vesselIds:             base.vessels,
    location:              base.location,
    spoofedMmsi:           spoofedMmsi != null ? String(spoofedMmsi) : '',
    distanceDiscrepancyM:  (info['distance_discrepancy_m'] as number | undefined)   ?? 0,
    requiredSpeedKnots:    (info['speed_required_to_match'] as number | undefined)  ?? 0,
    maxSpeedKnots,
    // Farthest the vessel could plausibly travel at its top speed within the event
    // window. Two conflicting positions farther apart than this make one MMSI
    // physically impossible to be a single vessel.
    maxPlausibleDistanceM: knotsToMps(maxSpeedKnots) * durationSec,
    probabilityOfSpoofing: (info['probability_of_spoofing'] as number | undefined)  ?? 0,
    severity:              base.severity,
    eventStartMs:          parseEventDate(base.startTime),
    eventEndMs:            parseEventDate(base.endTime),
  };
}

export function mapCoordinatedDarkActivityEventFromDetails(base: EventDetailsBase): CoordinatedDarkActivityEvent {
  const info       = base.information as Record<string, unknown>;
  const thresholds = info['thresholds'] as Record<string, unknown> | undefined;
  const rates      = (info['vessel_update_rates'] as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    vesselIds:                      base.vessels,
    location:                       base.location,
    clusterSize:                    (info['cluster_size'] as number | undefined) ?? base.vessels.length,
    coordinationScore:              (info['coordination_score'] as number | undefined)  ?? 0,
    coDarkWindowSec:                (info['co_dark_window_seconds'] as number | undefined) ?? 0,
    distanceThresholdM:             (thresholds?.['distance_threshold_m'] as number | undefined) ?? null,
    coordinationWindowThresholdSec: (thresholds?.['coordination_threshold_window_seconds'] as number | undefined) ?? null,
    areaAverageRatePerHour:         (info['area_average_update_rate_per_hour'] as number | undefined) ?? 0,
    clusterAverageRatePerHour:      (info['cluster_average_update_rate'] as number | undefined) ?? 0,
    perVesselRates: rates.map(r => ({
      vesselId:      String(r['vessel_id'] ?? ''),
      ratePerHour:   (r['rate_per_hour'] as number | undefined) ?? 0,
      lastUpdateSec: (r['last_update_seconds'] as number | undefined) ?? 0,
    })),
    severity:     base.severity,
    eventStartMs: parseEventDate(base.startTime),
    eventEndMs:   parseEventDate(base.endTime),
  };
}
