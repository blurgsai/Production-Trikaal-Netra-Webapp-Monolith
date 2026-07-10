import type { EventDetailsBaseRaw } from './types';

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
