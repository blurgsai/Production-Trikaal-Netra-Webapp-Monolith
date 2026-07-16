import { VesselConnectionOverlay } from '../../shared/VesselConnectionOverlay';
import { InterVesselDistanceGraph } from '../../shared/InterVesselDistanceGraph';
import { useParallelMovementEvent } from '../../../hooks/useParallelMovementEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// Second of the multi-vessel proximity family. Reuses the shared connection overlay
// and distance graph. Non-inverted (vessels stay within the distance threshold).
// Trajectory highlight is the shared proximity override.
const LABEL = 'Parallel';

function ParallelMovementOverlaySlot({ eventDetails, currentPositions }: EventOverlayProps) {
  const event = useParallelMovementEvent(eventDetails);
  return (
    <VesselConnectionOverlay
      vesselIds={event.vesselIds}
      currentPositions={currentPositions}
      distanceThresholdM={event.distanceThresholdM}
      label={LABEL}
    />
  );
}

function ParallelMovementTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useParallelMovementEvent(eventDetails);
  return (
    <InterVesselDistanceGraph
      vesselIds={event.vesselIds}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      rangeStartMs={timeWindow.queryStartMs}
      rangeEndMs={timeWindow.queryEndMs}
      thresholdM={event.distanceThresholdM}
    />
  );
}

const ParallelMovementPlugin: EventPlugin = {
  eventType: 'parallel_movement',
  overlay: ParallelMovementOverlaySlot,
  timeline: ParallelMovementTimelineSlot,
};

export default ParallelMovementPlugin;
