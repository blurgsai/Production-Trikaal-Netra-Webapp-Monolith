import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import { useHighSpeedEvent } from '../../../hooks/useHighSpeedEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

// Reuses the shared speed components directly — `inverted` flips the alert
// direction to "above threshold" instead of forking a new component.
function HighSpeedMarkerSlot({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }: EventMarkerProps) {
  const event = useHighSpeedEvent(eventDetails);
  return (
    <SpeedBadge
      event={event}
      vesselId={vesselId}
      position={position}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
      inverted
    />
  );
}

function HighSpeedTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useHighSpeedEvent(eventDetails);
  return (
    <SpeedTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
      inverted
    />
  );
}

const HighSpeedPlugin: EventPlugin = {
  eventType: 'high_speed',
  marker: HighSpeedMarkerSlot,
  timeline: HighSpeedTimelineSlot,
};

export default HighSpeedPlugin;
