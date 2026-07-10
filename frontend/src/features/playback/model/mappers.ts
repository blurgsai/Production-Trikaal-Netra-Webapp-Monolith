import type { PlaybackApiResponse, VesselPositionRaw, EventDetailsBaseRaw } from '../api/types';
import type {
  PlaybackData,
  TimelineFrame,
  TimeWindow,
  VesselPosition,
  EventDetailsBase,
  EventLocation,
  EventDuration,
} from './types';

function mapVesselPosition(raw: VesselPositionRaw): VesselPosition {
  return {
    lat:      raw.latitude,
    lon:      raw.longitude,
    speedMps: raw.speed_mps,
    course:   raw.course,
    heading:  raw.heading,
  };
}

function mapEventLocation(raw: EventDetailsBaseRaw['location']): EventLocation | null {
  if (!raw) return null;
  const [lon, lat] = raw.coordinates; // GeoJSON order: [longitude, latitude]
  return { lat, lon };
}

function mapEventDuration(raw: EventDetailsBaseRaw['duration']): EventDuration | null {
  if (!raw) return null;
  return { valueSeconds: raw.value };
}

function mapEventDetailsBase(raw: EventDetailsBaseRaw): EventDetailsBase {
  return {
    type:             raw.type,
    location:         mapEventLocation(raw.location),
    timestamp:        raw.timestamp,
    startTime:        raw.start_time,
    endTime:          raw.end_time,
    duration:         mapEventDuration(raw.duration),
    vessels:          raw.vessels_involved.map(String),
    severity:         raw.severity,
    model:            raw.model,
    status:           raw.status,
    s2CellId:         raw.s2_cell_id,
    temporality:      raw.temporality,
    eventSource:      raw.event_source,
    constituentTypes: raw.constituent_types,
    information:      raw.information,
  };
}

export function mapPlaybackFromApi(raw: PlaybackApiResponse): PlaybackData {
  const { event_details, trajectories, time_window, ...extras } = raw;

  const timeline: TimelineFrame[] = Object.entries(trajectories)
    .map(([tsKey, vessels]) => ({
      timestampMs: Number(tsKey),
      vessels: Object.fromEntries(
        Object.entries(vessels).map(([id, pos]) => [id, mapVesselPosition(pos)]),
      ),
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs);

  const tw = time_window;
  const bufferMs = (tw.buffer_hours ?? 3) * 3_600_000;

  const queryEndMs =
    tw.query_end ??
    (tw.event_start != null
      ? tw.event_start + bufferMs
      : timeline.length > 0
        ? timeline[timeline.length - 1].timestampMs
        : tw.query_start + bufferMs);

  const timeWindow: TimeWindow = {
    queryStartMs: tw.query_start,
    queryEndMs,
    eventStartMs: tw.event_start ?? tw.query_start,
    eventEndMs:   tw.event_end ?? null,
  };

  return {
    eventDetails: mapEventDetailsBase(event_details),
    extras,
    timeline,
    timeWindow,
  };
}
