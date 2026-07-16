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

// ── signal_lost ──────────────────────────────────────────────────────────────

export interface SignalLostEvent {
  vesselIds: string[];
  location: EventLocation | null;
  thresholdSec: number;
  silentDurationSec: number;
  severity: string;
  eventStartMs: number | null;
  eventEndMs: number | null;
}

// ── dark_after_departure ──────────────────────────────────────────────────────

export interface DarkAfterDepartureEvent {
  vesselIds: string[];
  location: EventLocation | null;
  portId: string | null;
  portName: string | null;
  portDepartureMs: number | null;
  darkStartMs: number | null;
  timeSinceDepartureSec: number;
  departureToDarkThresholdSec: number;
  updateRatePerHour: number;
  areaAverageRatePerHour: number;
  timeSinceLastUpdateSec: number;
  severity: string;
  eventStartMs: number | null;
  eventEndMs: number | null;
  // Departure-port boundary attached by the backend as a `port_polygon` extra
  // (same mechanism as geofence_intrusion's `geofence_polygon`). null when the
  // response carries no port geometry.
  // [lat, lon] rings — ready for react-leaflet; outer array = rings.
  portPolygonPositions: [number, number][][] | null;
}

// ── port_intrusion ────────────────────────────────────────────────────────

export interface PortIntrusionEvent {
  vesselIds: string[];
  portId: string | null;
  portName: string | null;
  restrictionType: string | null;
  intrusionDurationSec: number;
  violationCount: number;
  severity: string;
  // Restricted-zone boundary attached by the backend as a `port_polygon` extra
  // (same mechanism as geofence_intrusion's `geofence_polygon`). null when the
  // response carries no zone geometry.
  // [lat, lon] rings — ready for react-leaflet; outer array = rings (first = outer, rest = holes).
  polygonPositions: [number, number][][] | null;
}

// ── kinematics family (sudden_stop / anomalous_acceleration / anomalous_jerk) ──
// `value` / `thresholdPositive` / `thresholdNegative` are the shared kinematics
// contract consumed structurally by KinematicsBadge + KinematicsTimelineEnhancement;
// the rest is per-event context.

export interface SuddenStopEvent {
  value: number;              // deceleration (signed, m/s²)
  thresholdPositive: number;
  thresholdNegative: number;
  direction: string;
  speedBeforeMps: number;
  speedAfterMps: number;
  speedDropMps: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}

export interface AnomalousAccelerationEvent {
  value: number;              // observed acceleration (signed, m/s²)
  thresholdPositive: number;
  thresholdNegative: number;
  direction: string;
  speedBeforeMps: number;
  speedAfterMps: number;
  speedChangeMps: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}

export interface AnomalousJerkEvent {
  value: number;              // observed jerk (signed, m/s³)
  thresholdPositive: number;
  thresholdNegative: number;
  direction: string;
  meanJerk: number;
  triggerJerk: number;
  accelerationBeforeMps2: number;
  accelerationAfterMps2: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}

// ── speed family (high_speed / prolonged_low_speed / prolonged_stationary / uneconomical_transit) ──
// All expose `thresholdMps` + event window — the structural contract the shared
// SpeedBadge / SpeedTimelineEnhancement consume.

export interface HighSpeedEvent {
  minSpeedMps: number;
  maxSpeedMps: number;
  meanSpeedMps: number;
  stdDeviationMps: number;
  q1SpeedMps: number;
  q3SpeedMps: number;
  thresholdMps: number;
  triggerSpeedMps: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}

export interface ProlongedLowSpeedEvent {
  minSpeedMps: number;
  maxSpeedMps: number;
  meanSpeedMps: number;
  stdDeviationMps: number;
  q1SpeedMps: number;
  q3SpeedMps: number;
  thresholdMps: number;
  triggerSpeedMps: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}

export interface ProlongedStationaryEvent extends ProlongedLowSpeedEvent {
  thresholdDuration: number;
}

export interface UneconomicalTransitEvent {
  averageSogMps: number;
  currentSogMps: number;
  thresholdMps: number;          // speed threshold, converted from knots → m/s
  voyageDurationHours: number;
  durationThresholdHours: number;
  vesselIds: string[];
  eventStartMs: number | null;
  eventEndMs: number | null;
}
