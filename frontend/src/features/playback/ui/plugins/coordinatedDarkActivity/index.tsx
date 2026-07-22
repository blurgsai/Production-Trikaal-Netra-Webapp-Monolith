import { VesselClusterOverlay } from '../../shared/VesselClusterOverlay';
import { CoordinatedDarkActivityTimelineEnhancement } from './CoordinatedDarkActivityTimelineEnhancement';
import { useCoordinatedDarkActivityEvent } from '../../../hooks/useCoordinatedDarkActivityEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// Fourth of the multi-vessel proximity family. Bespoke extension on top of the trio:
//   overlay  → the shared VesselClusterOverlay (hull + centroid, not the pairwise
//              connection line — the story is a GROUP, not a pair distance);
//   timeline → reuses the dark-ship-family AisPingDensityGraph (the story is
//              co-going-dark, not distance-vs-threshold), so NO InterVesselDistanceGraph.
// Trajectory highlight is the shared proximity override. No marker slot.
const LABEL = 'Co-dark cluster';

function CoordinatedDarkActivityOverlaySlot({ eventDetails, currentPositions }: EventOverlayProps) {
  const event = useCoordinatedDarkActivityEvent(eventDetails);
  return (
    <VesselClusterOverlay
      vesselIds={event.vesselIds}
      currentPositions={currentPositions}
      spreadThresholdM={event.distanceThresholdM}
      label={LABEL}
    />
  );
}

function CoordinatedDarkActivityTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useCoordinatedDarkActivityEvent(eventDetails);
  return (
    <CoordinatedDarkActivityTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const CoordinatedDarkActivityPlugin: EventPlugin = {
  eventType: 'coordinated_dark_activity',
  overlay: CoordinatedDarkActivityOverlaySlot,
  timeline: CoordinatedDarkActivityTimelineSlot,
};

export default CoordinatedDarkActivityPlugin;
