// ── Base playback domain types ─────────────────────────────────────────────────

export interface VesselPosition {
  lat: number;
  lon: number;
  speedMps?: number;
  course?: number;
  heading?: number;
}

export interface TimelineFrame {
  timestampMs: number;
  vessels: Record<string, VesselPosition>;
}

export interface TimeWindow {
  queryStartMs: number;
  queryEndMs: number;
  eventStartMs: number;
  eventEndMs: number | null;
}

// ── Event details base domain type ─────────────────────────────────────────────
// Mapped from EventDetailsBaseRaw. All event types share these fields.
// `information` is typed per event in each event-type's model file.

export interface EventLocation {
  lat: number;
  lon: number;
}

export interface EventDuration {
  valueSeconds: number;
}

export interface EventDetailsBase {
  type: string;
  location: EventLocation | null;
  timestamp: string;
  startTime: string | null;
  endTime: string | null;
  duration: EventDuration | null;
  vessels: string[];
  severity: string;
  model: string;
  status: string;
  s2CellId: string | null;
  temporality: 'bounded' | 'unbounded' | null;
  eventSource: string | null;
  constituentTypes?: string[]; // compound events only
  information: Record<string, unknown>; // typed per event in each event-type's model file
}

export interface PlaybackData {
  eventDetails: EventDetailsBase;
  extras: Record<string, unknown>; // event-specific top-level response fields (e.g. geofence_polygon)
  timeline: TimelineFrame[];
  timeWindow: TimeWindow;
}

// ── Trajectory styling ─────────────────────────────────────────────────────────

export interface TrajectorySegmentStyle {
  color: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
}

export interface TrajectoryOverrideRule {
  start: number;
  end: number;
  style: TrajectorySegmentStyle;
}

// ── Event-slot prop contracts ──────────────────────────────────────────────────
// PlaybackPanel passes these to each event-type's UI components.

export interface EventOverlayProps {
  eventDetails: EventDetailsBase;
  extras: Record<string, unknown>; // event-specific top-level response fields
  currentTimestampMs: number;
  timeWindow: TimeWindow;
}

export interface EventMarkerProps {
  vesselId: string;
  position: VesselPosition;
  currentTimestampMs: number;
  eventDetails: EventDetailsBase;
  timeWindow: TimeWindow;
}

export interface EventTimelineProps {
  timeline: TimelineFrame[];
  currentTimestampMs: number;
  eventDetails: EventDetailsBase;
  timeWindow: TimeWindow;
}

export type TrajectoryOverrideFn = (
  eventDetails: EventDetailsBase,
  timeWindow: TimeWindow,
) => Record<string, TrajectoryOverrideRule[]> | null;
