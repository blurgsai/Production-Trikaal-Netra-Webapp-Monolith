import { parseEventDate } from './playbackUtils';
import type {
  GeofenceEvent,
  GeofencePolygonCoordinates,
  DarkShipEvent,
  SignalLostEvent,
  DarkAfterDepartureEvent,
  PortIntrusionEvent,
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
