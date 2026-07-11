import { parseEventDate } from './playbackUtils';
import type { GeofenceEvent, GeofencePolygonCoordinates } from './eventTypeTypes';
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
