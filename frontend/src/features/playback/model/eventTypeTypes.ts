// ── Event-type domain types ──────────────────────────────────────────────────
// YOUR types, YOUR naming — one flat file, one section per event type.
// (Flattened from model/eventTypes/<type>/ to satisfy the flat-layer CI rule.)
//
// The *Information / *Polygon descriptors below type the loosely-typed
// `information` / `extras` bags on the already-mapped domain data. They live in
// model/ (not api/) on purpose: the event mappers cast to THESE, so
// model/eventTypeMappers.ts never imports from api/ and stays inside the
// "only mappers.ts touches api types" rule.

// ── geofence_intrusion ───────────────────────────────────────────────────────

export interface GeofenceEvent {
  geofenceName: string;
  geofenceId: string | null;
  hasExitedPolygon: boolean;
  intrusionStartMs: number | null;
  intrusionEndMs: number | null;
  vesselIds: string[];
  // [lat, lon] pairs — ready for react-leaflet; outer array = rings (first = outer, rest = holes)
  polygonPositions: [number, number][][] | null;
}

// Domain descriptor for geofence_intrusion.information (index signature so a
// `Record<string, unknown>` information bag casts cleanly onto it).
export interface GeofenceInformation {
  [key: string]: unknown;
  geofence_id?: string;
  geofence_name?: string;
  Has_exited_polygon?: boolean;
}

export interface GeofencePolygonCoordinates {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

// Domain descriptor for the geofence_polygon extras payload.
export interface GeofencePolygon {
  geofence_id?: string;
  asset_name?: string;
  polygon: GeofencePolygonCoordinates;
}
