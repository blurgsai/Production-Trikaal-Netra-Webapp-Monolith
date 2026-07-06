import { SpeedBadge } from '../../shared/SpeedBadge';
import { SpeedTimelineEnhancement } from '../../shared/SpeedTimelineEnhancement';
import {
  mapHighSpeedEventFromDetails,
  getHighSpeedTrajectoryOverrides,
} from '../../../model/eventTypes/highSpeed/highSpeedMappers';
import type { EventPlugin } from '../../pluginRegistry';

const HighSpeedPlugin: EventPlugin = {
  eventType: 'high_speed',

  // Reuses the shared speed components directly — `inverted` flips the alert
  // direction to "above threshold" instead of forking a new component.
  marker: ({ vesselId, position, currentTimestampMs, eventDetails, timeWindow }) => (
    <SpeedBadge
      event={mapHighSpeedEventFromDetails(eventDetails)}
      vesselId={vesselId}
      position={position}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
      inverted
    />
  ),

  timeline: ({ timeline, currentTimestampMs, eventDetails, timeWindow }) => (
    <SpeedTimelineEnhancement
      event={mapHighSpeedEventFromDetails(eventDetails)}
      timeline={timeline}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
      inverted
    />
  ),

  trajectoryFn: getHighSpeedTrajectoryOverrides,
};

export default HighSpeedPlugin;
