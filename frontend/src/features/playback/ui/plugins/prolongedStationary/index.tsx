import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import { useProlongedStationaryEvent } from '../../../hooks/useProlongedStationaryEvent';
import type { EventPlugin } from '../../PluginRegistry';
import type { EventMarkerProps, EventTimelineProps } from '../../../model/types';

function ProlongedStationaryMarkerSlot({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }: EventMarkerProps) {
  const event = useProlongedStationaryEvent(eventDetails);
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

function ProlongedStationaryTimelineSlot({ timeline, currentTimestampMs, eventDetails, timeWindow }: EventTimelineProps) {
  const event = useProlongedStationaryEvent(eventDetails);
  return (
    <SpeedTimelineEnhancement
      event={event}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const ProlongedStationaryPlugin: EventPlugin = {
  eventType: 'prolonged_stationary',
  marker: ProlongedStationaryMarkerSlot,
  timeline: ProlongedStationaryTimelineSlot,
};

export default ProlongedStationaryPlugin;
