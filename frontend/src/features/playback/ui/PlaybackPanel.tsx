import { Fragment, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Typography,
} from '@mui/material';
import { usePlayback } from '../hooks/usePlayback';
import { useResolvedEventTypes } from '../hooks/useResolvedEventTypes';
import { useTrajectoryOverrides } from '../hooks/useTrajectoryOverrides';
import { PlaybackMap }        from './PlaybackMap';
import { VesselMarkers }      from './VesselMarkers';
import { VesselTrajectories } from './VesselTrajectories';
import { PlaybackControls }   from './PlaybackControls';
import { EventInfoPanel }     from './EventInfoPanel';
import {
  getMapOverlay,
  getMarkerEnhancement,
  getTimelineEnhancement,
} from './PluginRegistry';

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
    refetch,
    currentTimestampMs,
    currentPositions,
    isPlaying,
    speed,
    play,
    pause,
    seek,
    setSpeed,
  } = usePlayback({ eventId, eventType, isCompound });

  // Compound resolution: each constituent type is dispatched to the plugin registry separately
  const { resolvedTypes, resolvedDetails } = useResolvedEventTypes(data, eventType, isCompound);

  // Merge trajectory overrides from all constituent event types
  const trajectoryOverrides = useTrajectoryOverrides(data, resolvedTypes, resolvedDetails);

  // First vessel position at event load, for initial map centering only.
  // Deliberately keyed off `data` (not `currentPositions`/`currentTimestampMs`) so
  // scrubbing the slider never re-centers or re-zooms a map the user has already panned.
  const mapCenter = useMemo((): [number, number] => {
    const first = data ? Object.values(data.timeline[0]?.vessels ?? {})[0] : undefined;
    return first ? [first.lat, first.lon] : [25.0, 67.0];
  }, [data]);

  if (isLoading) {
    return (
      <Box
        role="status"
        aria-live="polite"
        aria-busy="true"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        gap={2}
        p={3}
      >
        <Box sx={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Skeleton variant="rounded" height={28} />
          <Skeleton variant="rounded" height={28} />
          <Skeleton variant="rounded" height={28} />
        </Box>
        <CircularProgress aria-label="Loading playback" />
        <Typography variant="body2" color="text.secondary">
          Loading playback…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        gap={2}
        p={2}
      >
        <Alert severity="error" sx={{ maxWidth: 420 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>
          Retry
        </Button>
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
          const details = resolvedDetails[t];
          if (!details) return null;
          return (
            <Fragment key={t}>
              {getMapOverlay(t, {
                eventDetails: details,
                extras: data.extras,
                currentTimestampMs,
                currentPositions,
                timeWindow: data.timeWindow,
              })}
            </Fragment>
          );
        })}

        {/* Event-type marker enhancements — rendered inside map for Leaflet context */}
        {Object.entries(currentPositions).map(([vesselId, pos]) =>
          resolvedTypes.map(t => {
            const details = resolvedDetails[t];
            if (!details) return null;
            return (
              <Fragment key={`${t}-${vesselId}`}>
                {getMarkerEnhancement(t, vesselId, {
                  vesselId,
                  position: pos,
                  currentTimestampMs,
                  eventDetails: details,
                  timeWindow: data.timeWindow,
                })}
              </Fragment>
            );
          }),
        )}
      </PlaybackMap>

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
        speed={speed}
        hasData={data.timeline.length > 0}
        onPlay={play}
        onPause={pause}
        onSeek={seek}
        onSpeedChange={setSpeed}
      >
        {/* Event-type timeline enhancements */}
        {resolvedTypes.map(t => {
          const details = resolvedDetails[t];
          if (!details) return null;
          return (
            <Fragment key={t}>
              {getTimelineEnhancement(t, {
                timeline: data.timeline,
                currentTimestampMs,
                eventDetails: details,
                timeWindow: data.timeWindow,
              })}
            </Fragment>
          );
        })}
      </PlaybackControls>
    </Box>
  );
}
