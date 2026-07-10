import { GeofenceIntrusionOverlay } from './GeofenceIntrusionOverlay';
import { useGeofenceIntrusionEvent } from '../../../hooks/useGeofenceIntrusionEvent';
import type { EventPlugin } from '../../pluginRegistry';
import type { EventOverlayProps } from '../../../model/types';

// Named component (not an inline arrow on a lowercase object key) so
// eslint-plugin-react-hooks recognises it as a component, and pluginRegistry's
// JSX invocation gives it its own isolated hook dispatcher.
function GeofenceIntrusionOverlaySlot({ eventDetails, extras, currentTimestampMs, timeWindow }: EventOverlayProps) {
  const event = useGeofenceIntrusionEvent(eventDetails, extras);
  return (
    <GeofenceIntrusionOverlay
      event={event}
      currentTimestampMs={currentTimestampMs}
      timeWindow={timeWindow}
    />
  );
}

const GeofenceIntrusionPlugin: EventPlugin = {
  eventType: 'geofence_intrusion',
  overlay: GeofenceIntrusionOverlaySlot,
};

export default GeofenceIntrusionPlugin;
