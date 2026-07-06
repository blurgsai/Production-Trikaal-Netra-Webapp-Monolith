import type { ReactElement } from 'react';
import type {
  EventDetailsBase,
  EventOverlayProps,
  EventMarkerProps,
  EventTimelineProps,
  TimeWindow,
  TrajectoryOverrideFn,
  TrajectoryOverrideRule,
} from '../model/types';

// ── Plugin interface ─────────────────────────────────────────────────────────
// A plugin is a plain object with optional component slots for one event type.
// All slots are optional — register only what the event actually needs.

export type OverlayAdapter = (props: EventOverlayProps) => ReactElement | null;
export type MarkerAdapter = (props: EventMarkerProps) => ReactElement | null;
export type TimelineAdapter = (props: EventTimelineProps) => ReactElement | null;

export interface EventPlugin {
  eventType: string;
  overlay?: OverlayAdapter;
  marker?: MarkerAdapter;
  timeline?: TimelineAdapter;
  trajectoryFn?: TrajectoryOverrideFn;
}

// ── Registry ──────────────────────────────────────────────────────────────────
// Explicit, one line per event type. To add a new event type: write its plugin
// in plugins/<eventType>/index.tsx, import it here, add one line below.

import GeofenceIntrusionPlugin from './plugins/geofenceIntrusion';
import ProlongedLowSpeedPlugin from './plugins/prolongedLowSpeed';
import ProlongedStationaryPlugin from './plugins/prolongedStationary';
import HighSpeedPlugin from './plugins/highSpeed';

export const EVENT_TYPE_REGISTRY: Record<string, EventPlugin> = {
  geofence_intrusion: GeofenceIntrusionPlugin,
  prolonged_low_speed: ProlongedLowSpeedPlugin,
  prolonged_stationary: ProlongedStationaryPlugin,
  high_speed: HighSpeedPlugin,
};

// ── Accessors ─────────────────────────────────────────────────────────────────
// PlaybackPanel only ever calls these — it never imports an event type directly.

export function getMapOverlay(eventType: string, props: EventOverlayProps): ReactElement | null {
  const overlay = EVENT_TYPE_REGISTRY[eventType]?.overlay;
  return overlay ? overlay(props) : null;
}

export function getMarkerEnhancement(
  eventType: string,
  vesselId: string,
  props: EventMarkerProps,
): ReactElement | null {
  const marker = EVENT_TYPE_REGISTRY[eventType]?.marker;
  if (!marker) return null;
  // Framework-level guard: only render a badge on a vessel that actually belongs
  // to this event. Plugin authors never need to implement this check themselves.
  if (!props.eventDetails.vessels.includes(vesselId)) return null;
  return marker(props);
}

export function getTimelineEnhancement(eventType: string, props: EventTimelineProps): ReactElement | null {
  const timeline = EVENT_TYPE_REGISTRY[eventType]?.timeline;
  return timeline ? timeline(props) : null;
}

export function getTrajectoryOverrides(
  eventType: string,
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
): Record<string, TrajectoryOverrideRule[]> | null {
  const trajectoryFn = EVENT_TYPE_REGISTRY[eventType]?.trajectoryFn;
  return trajectoryFn ? trajectoryFn(eventDetails, timeWindow) : null;
}
