import { useMemo, type ReactElement } from 'react';
import type { ComponentType } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { usePlayback } from '../hooks/usePlayback';
import type {
  EventDetailsBase,
  EventOverlayProps,
  EventMarkerProps,
  EventTimelineProps,
  TrajectoryOverrideFn,
  TrajectoryOverrideRule,
} from '../model/types';
import { PlaybackMap }        from './PlaybackMap';
import { VesselMarkers }      from './VesselMarkers';
import { VesselTrajectories } from './VesselTrajectories';
import { PlaybackControls }   from './PlaybackControls';
import { EventInfoPanel }     from './EventInfoPanel';

// ── Event-type overlay components ─────────────────────────────────────────────
import { GeofenceIntrusionOverlay } from './GeofenceIntrusionOverlay';

// ── Event-type mapper/trajectory imports ──────────────────────────────────────
import {
  mapGeofenceEventFromDetails,
  getGeofenceTrajectoryOverrides,
} from '../model/geofenceIntrusionMappers';

// ── Static dispatch maps ───────────────────────────────────────────────────────
// To add a new event type: import its overlay component and mappers above,
// then add one adapter entry to OVERLAY_MAP and one entry to TRAJECTORY_FN_MAP.
//
// OverlayAdapter: calls the event-specific mapper then renders the overlay,
// keeping each overlay component purely presentational (receives domain types).

type OverlayAdapter = (props: EventOverlayProps) => ReactElement | null;

const OVERLAY_MAP: Record<string, OverlayAdapter> = {
  geofence_intrusion: ({ eventDetails, extras, currentTimestampMs, timeWindow }) => (
    <GeofenceIntrusionOverlay
      event={mapGeofenceEventFromDetails(eventDetails, extras)}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  ),
};

const TRAJECTORY_FN_MAP: Record<string, TrajectoryOverrideFn> = {
  geofence_intrusion: getGeofenceTrajectoryOverrides,
};

const MARKER_MAP: Record<string, ComponentType<EventMarkerProps>> = {
  // no event types implement marker enhancements yet
};

const TIMELINE_MAP: Record<string, ComponentType<EventTimelineProps>> = {
  // no event types implement timeline enhancements yet
};

// ── Component ─────────────────────────────────────────────────────────────────

interface PlaybackPanelProps {
  eventId: string;
  eventType: string;
  isCompound: boolean;
}

export function PlaybackPanel({ eventId, eventType, isCompound }: PlaybackPanelProps) {
  const {
    data,
    isLoading,
    error,
    currentTimestampMs,
    currentPositions,
    isPlaying,
    play,
    pause,
    seek,
  } = usePlayback({ eventId, eventType, isCompound });

  // Compound resolution: each constituent type gets its own slot in the dispatch maps
  const resolvedTypes: string[] = useMemo(() => {
    if (!data) return [];
    if (!isCompound) return [eventType];
    return data.eventDetails.constituentTypes ?? [eventType];
  }, [data, eventType, isCompound]);

  // For compound events the API nests each constituent's details under its type key;
  // for atomic events the whole eventDetails block belongs to the single type.
  // Compound event contract is not yet finalised — the nested cast will be revisited.
  const resolvedDetails: Record<string, EventDetailsBase> = useMemo(() => {
    if (!data) return {};
    if (!isCompound) return { [eventType]: data.eventDetails };
    const nested = data.eventDetails as unknown as Record<string, EventDetailsBase>;
    return Object.fromEntries(
      resolvedTypes.map(t => [t, nested[t] ?? data.eventDetails]),
    );
  }, [data, eventType, isCompound, resolvedTypes]);

  // Merge trajectory overrides from all constituent event types
  const trajectoryOverrides = useMemo(() => {
    if (!data) return null;
    const merged: Record<string, TrajectoryOverrideRule[]> = {};
    for (const t of resolvedTypes) {
      const trajectoryFn = TRAJECTORY_FN_MAP[t];
      const details = resolvedDetails[t];
      if (!trajectoryFn || !details) continue;
      const result = trajectoryFn(details, data.timeWindow);
      if (!result) continue;
      for (const [vesselId, rules] of Object.entries(result)) {
        merged[vesselId] = [...(merged[vesselId] ?? []), ...rules];
      }
    }
    return Object.keys(merged).length ? merged : null;
  }, [data, resolvedTypes, resolvedDetails]);

  // First vessel position for map centering
  const mapCenter = useMemo((): [number, number] => {
    const first = Object.values(currentPositions)[0];
    return first ? [first.lat, first.lon] : [25.0, 67.0];
  }, [currentPositions]);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%" p={2}>
        <Typography color="error" align="center">{error}</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height="100%">
        <Typography color="text.secondary">Select an event to view playback</Typography>
      </Box>
    );
  }

  return (
    <Box position="relative" height="100%" width="100%">
      <PlaybackMap center={mapCenter} zoom={7}>
        <VesselMarkers positions={currentPositions} />
        <VesselTrajectories
          timeline={data.timeline}
          currentTimestampMs={currentTimestampMs}
          trajectoryOverrides={trajectoryOverrides}
        />

        {/* Event-type map overlays */}
        {resolvedTypes.map(t => {
          const Overlay = OVERLAY_MAP[t];
          const details = resolvedDetails[t];
          if (!Overlay || !details) return null;
          return (
            <Overlay
              key={t}
              eventDetails={details}
              extras={data.extras}
              currentTimestampMs={currentTimestampMs}
              timeWindow={data.timeWindow}
            />
          );
        })}
      </PlaybackMap>

      {/* Event-type marker enhancements */}
      {Object.entries(currentPositions).map(([vesselId, pos]) =>
        resolvedTypes.map(t => {
          const MarkerEnhancement = MARKER_MAP[t];
          const details = resolvedDetails[t];
          if (!MarkerEnhancement || !details || !details.vessels.includes(vesselId)) return null;
          return (
            <MarkerEnhancement
              key={`${t}-${vesselId}`}
              vesselId={vesselId}
              position={pos}
              currentTimestampMs={currentTimestampMs}
              eventDetails={details}
              timeWindow={data.timeWindow}
            />
          );
        }),
      )}

      <EventInfoPanel
        eventId={eventId}
        eventType={eventType}
        isCompound={isCompound}
        severity={data.eventDetails.severity}
        status={data.eventDetails.status}
        vesselCount={Object.keys(currentPositions).length}
        timeWindow={data.timeWindow}
        information={data.eventDetails.information}
      />

      <PlaybackControls
        currentTimestampMs={currentTimestampMs}
        isPlaying={isPlaying}
        timeWindow={data.timeWindow}
        onPlay={play}
        onPause={pause}
        onSeek={seek}
      >
        {/* Event-type timeline enhancements */}
        {resolvedTypes.map(t => {
          const TimelineEnhancement = TIMELINE_MAP[t];
          const details = resolvedDetails[t];
          if (!TimelineEnhancement || !details) return null;
          return (
            <TimelineEnhancement
              key={t}
              timeline={data.timeline}
              currentTimestampMs={currentTimestampMs}
              eventDetails={details}
              timeWindow={data.timeWindow}
            />
          );
        })}
      </PlaybackControls>
    </Box>
  );
}
