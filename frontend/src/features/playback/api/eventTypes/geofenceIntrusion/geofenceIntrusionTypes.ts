import type { EventDetailsBaseRaw } from '../../types';

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
