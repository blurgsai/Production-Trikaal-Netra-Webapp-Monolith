import { parseEventDate } from './playbackUtils';
import type {
  GeofenceEvent,
  GeofenceInformation,
  GeofencePolygon,
} from './eventTypeTypes';
import type { EventDetailsBase, TimeWindow, TrajectoryOverrideRule } from './types';

// ── Event-type mappers + trajectory-override functions ───────────────────────
// One flat file, one section per event type. Operates on already-mapped domain
// data (EventDetailsBase / extras), so it imports ONLY from model/ — never api/.
// That keeps it clear of the "only model/mappers.ts may import api types" rule
// even though it isn't named mappers.ts.
// (Flattened from model/eventTypes/<type>/<type>Mappers.ts.)

// ── geofence_intrusion ───────────────────────────────────────────────────────

function parseGeoJsonToPositions(
  raw: GeofencePolygon | undefined,
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
  const info    = base.information as GeofenceInformation;
  const polygon = extras['geofence_polygon'] as GeofencePolygon | undefined;

  return {
    geofenceName:     info.geofence_name      ?? 'Restricted Area',
    geofenceId:       info.geofence_id        ?? null,
    hasExitedPolygon: info.Has_exited_polygon ?? false,
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
  const info  = eventDetails.information as GeofenceInformation;
  const color = (info.Has_exited_polygon ?? false) ? '#ff8c00' : '#ff4444';

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
