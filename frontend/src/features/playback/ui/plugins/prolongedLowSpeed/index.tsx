import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import { useProlongedLowSpeedEvent } from '../../../hooks/useProlongedLowSpeedEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

function ProlongedLowSpeedMarkerSlot({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }: EventMarkerProps) {
  const event = useProlongedLowSpeedEvent(eventDetails);
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

function ProlongedLowSpeedTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useProlongedLowSpeedEvent(eventDetails);
  return (
    <SpeedTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const ProlongedLowSpeedPlugin: EventPlugin = {
  eventType: 'prolonged_low_speed',
  marker: ProlongedLowSpeedMarkerSlot,
  timeline: ProlongedLowSpeedTimelineSlot,
};

export default ProlongedLowSpeedPlugin;
