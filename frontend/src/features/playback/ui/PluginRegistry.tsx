import type { ReactElement } from 'react';
import type {
  EventOverlayProps,
  EventMarkerProps,
  EventTimelineProps,
} from '../model/types';

// ── Plugin interface ─────────────────────────────────────────────────────────
// A plugin is a plain object with optional component slots for one event type.
// All slots are optional — register only what the event actually needs.
// trajectoryFn is NOT part of this interface: it returns plain data (never
// JSX), so it's dispatched separately via model/trajectoryOverrideRegistry.ts,
// which hooks/ (unlike this file) is allowed to import from.

export type OverlayAdapter = (props: EventOverlayProps) => ReactElement | null;
export type MarkerAdapter = (props: EventMarkerProps) => ReactElement | null;
export type TimelineAdapter = (props: EventTimelineProps) => ReactElement | null;

export interface EventPlugin {
  eventType: string;
  overlay?: OverlayAdapter;
  marker?: MarkerAdapter;
  timeline?: TimelineAdapter;
}

// ── Registry ──────────────────────────────────────────────────────────────────
// Explicit, one line per event type. To add a new event type: write its plugin
// in plugins/<eventType>/index.tsx, import it here, add one line below.

import GeofenceIntrusionPlugin from './plugins/geofenceIntrusion';
import DarkShipPlugin from './plugins/darkShip';

export const EVENT_TYPE_REGISTRY: Record<string, EventPlugin> = {
  geofence_intrusion: GeofenceIntrusionPlugin,
  dark_ship: DarkShipPlugin,
};

// ── Accessors ─────────────────────────────────────────────────────────────────
// PlaybackPanel only ever calls these — it never imports an event type directly.
//
// IMPORTANT: each slot is invoked via JSX (<Slot {...props} />), never as a
// plain function call (slot(props)). A plugin's slot may call hooks internally
// (e.g. useGeofenceIntrusionEvent) — JSX invocation gives it its own
// component/Fiber identity so React's hook dispatcher stays isolated from
// PlaybackPanel's own hooks, regardless of how many/which event types are
// active this render.

export function getMapOverlay(eventType: string, props: EventOverlayProps): ReactElement | null {
  const Overlay = EVENT_TYPE_REGISTRY[eventType]?.overlay;
  return Overlay ? <Overlay {...props} /> : null;
}

export function getMarkerEnhancement(
  eventType: string,
  vesselId: string,
  props: EventMarkerProps,
): ReactElement | null {
  const Marker = EVENT_TYPE_REGISTRY[eventType]?.marker;
  if (!Marker) return null;
  // Framework-level guard: only render a badge on a vessel that actually belongs
  // to this event. Plugin authors never need to implement this check themselves.
  if (!props.eventDetails.vessels.includes(vesselId)) return null;
  return <Marker {...props} />;
}

export function getTimelineEnhancement(eventType: string, props: EventTimelineProps): ReactElement | null {
  const Timeline = EVENT_TYPE_REGISTRY[eventType]?.timeline;
  return Timeline ? <Timeline {...props} /> : null;
}
