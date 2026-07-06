import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import { mapProlongedLowSpeedEventFromDetails } from '../../../model/eventTypes/prolongedLowSpeed/prolongedLowSpeedMappers';
import type { EventPlugin } from '../../pluginRegistry';

const ProlongedLowSpeedPlugin: EventPlugin = {
  eventType: 'prolonged_low_speed',

  marker: ({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }) => (
    <SpeedBadge
      event={mapProlongedLowSpeedEventFromDetails(eventDetails)}
      vesselId={vesselId}
      position={position}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  ),

  timeline: ({ timeline, currentTimestampMs, eventDetails, timeWindow }) => (
    <SpeedTimelineEnhancement
      event={mapProlongedLowSpeedEventFromDetails(eventDetails)}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  ),
};

export default ProlongedLowSpeedPlugin;
