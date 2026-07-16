// ── Event-type domain types ──────────────────────────────────────────────────
// YOUR types, YOUR naming — one flat file, one section per event type.
// (Flattened from model/eventTypes/<type>/ to satisfy the flat-layer CI rule.)
//
// Domain types use camelCase exclusively. Raw API field names (snake_case) are
// accessed via Record<string, unknown> bracket notation in the mapper — never
// typed as interfaces in the model layer.

import type { EventLocation } from './types';

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

export interface GeofencePolygonCoordinates {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

// ── dark_ship ────────────────────────────────────────────────────────────────

export interface DarkShipEvent {
  vesselIds: string[];
  location: EventLocation | null;
  updateRatePerHour: number;
  areaAverageRatePerHour: number;
  timeSinceLastUpdateSec: number;
  severity: string;
  eventStartMs: number | null;
  eventEndMs: number | null;
}
