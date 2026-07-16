import { parseEventDate } from './playbackUtils';
import type { GeofenceEvent, GeofencePolygonCoordinates, DarkShipEvent } from './eventTypeTypes';
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
