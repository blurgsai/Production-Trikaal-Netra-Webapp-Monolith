import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import { useUneconomicalTransitEvent } from '../../../hooks/useUneconomicalTransitEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

// Below-threshold speed event — reuses the shared speed components in their default
// (non-inverted) direction, exactly like prolonged_low_speed. The schema's knot values
// are converted to m/s in the mapper so the badge/graph read consistent units.
function UneconomicalTransitMarkerSlot({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }: EventMarkerProps) {
  const event = useUneconomicalTransitEvent(eventDetails);
  return (
    <SpeedBadge
      event={event}
      vesselId={vesselId}
      position={position}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

function UneconomicalTransitTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useUneconomicalTransitEvent(eventDetails);
  return (
    <SpeedTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const UneconomicalTransitPlugin: EventPlugin = {
  eventType: 'uneconomical_transit',
  marker: UneconomicalTransitMarkerSlot,
  timeline: UneconomicalTransitTimelineSlot,
};

export default UneconomicalTransitPlugin;
