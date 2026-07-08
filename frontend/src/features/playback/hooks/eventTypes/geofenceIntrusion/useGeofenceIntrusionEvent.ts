import { useMemo } from 'react';
import { mapGeofenceEventFromDetails } from '../../../model/eventTypes/geofenceIntrusion/geofenceIntrusionMappers';
import type { GeofenceEvent } from '../../../model/eventTypes/geofenceIntrusion/geofenceIntrusionTypes';
import type { EventDetailsBase } from '../../../model/types';

export function useGeofenceIntrusionEvent(
  eventDetails: EventDetailsBase,
  extras: Record<string, unknown>,
): GeofenceEvent {
  return useMemo(
    () => mapGeofenceEventFromDetails(eventDetails, extras),
    [eventDetails, extras],
  );
}
