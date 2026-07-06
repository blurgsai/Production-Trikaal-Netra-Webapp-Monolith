import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import { mapProlongedStationaryEventFromDetails } from '../../../model/eventTypes/prolongedStationary/prolongedStationaryMappers';
import type { EventPlugin } from '../../pluginRegistry';

const ProlongedStationaryPlugin: EventPlugin = {
  eventType: 'prolonged_stationary',

  marker: ({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }) => (
    <SpeedBadge
      event={mapProlongedStationaryEventFromDetails(eventDetails)}
      vesselId={vesselId}
      position={position}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  ),

  timeline: ({ timeline, currentTimestampMs, eventDetails, timeWindow }) => (
    <SpeedTimelineEnhancement
      event={mapProlongedStationaryEventFromDetails(eventDetails)}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  ),
};

export default ProlongedStationaryPlugin;
