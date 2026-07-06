import { GeofenceIntrusionOverlay } from './GeofenceIntrusionOverlay';
import {
  mapGeofenceEventFromDetails,
  getGeofenceTrajectoryOverrides,
} from '../../../model/eventTypes/geofenceIntrusion/geofenceIntrusionMappers';
import type { EventPlugin } from '../../pluginRegistry';

const GeofenceIntrusionPlugin: EventPlugin = {
  eventType: 'geofence_intrusion',

  overlay: ({ eventDetails, extras, currentTimestampMs, timeWindow }) => (
    <GeofenceIntrusionOverlay
      event={mapGeofenceEventFromDetails(eventDetails, extras)}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  ),

  trajectoryFn: getGeofenceTrajectoryOverrides,
};

export default GeofenceIntrusionPlugin;
