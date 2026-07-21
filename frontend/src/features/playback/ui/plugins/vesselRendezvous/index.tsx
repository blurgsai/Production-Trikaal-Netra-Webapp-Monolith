import { VesselConnectionOverlay } from '../../shared/VesselConnectionOverlay';
import { InterVesselDistanceGraph } from '../../shared/InterVesselDistanceGraph';
import { useVesselRendezvousEvent } from '../../../hooks/useVesselRendezvousEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventOverlayProps, EventTimelineProps } from '../../../model/types';

// First of the multi-vessel proximity family. Reuses the shared connection overlay
// (line + live distance chip between the two vessels) and the shared distance graph.
// Non-inverted: alert fires when the vessels are CLOSER than the threshold — the
// hallmark of a ship-to-ship rendezvous. Trajectory highlight is the shared proximity
// override, registered in model/trajectoryOverrideRegistry.ts.
const LABEL = 'Rendezvous';

function VesselRendezvousOverlaySlot({ eventDetails, currentPositions }: EventOverlayProps) {
  const event = useVesselRendezvousEvent(eventDetails);
  return (
    <VesselConnectionOverlay
      vesselIds={event.vesselIds}
      currentPositions={currentPositions}
      distanceThresholdM={event.distanceThresholdM}
      label={LABEL}
    />
  );
}

function VesselRendezvousTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useVesselRendezvousEvent(eventDetails);
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

const VesselRendezvousPlugin: EventPlugin = {
  eventType: 'vessel_rendezvous',
  overlay: VesselRendezvousOverlaySlot,
  timeline: VesselRendezvousTimelineSlot,
};

export default VesselRendezvousPlugin;
