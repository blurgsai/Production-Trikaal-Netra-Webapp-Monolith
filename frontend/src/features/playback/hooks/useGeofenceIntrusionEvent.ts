import { useMemo } from 'react';
import { mapGeofenceEventFromDetails } from '../model/eventTypeMappers';
import type { GeofenceEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapGeofenceEventFromDetails — asserting on the real output is what covers the
// mapper under the "test only hooks" policy.
// (Flattened from hooks/eventTypes/<type>/use<Type>Event.ts.)
export function useGeofenceIntrusionEvent(
  eventDetails: EventDetailsBase,
  extras: Record<string, unknown>,
): GeofenceEvent {
  return useMemo(
    () => mapGeofenceEventFromDetails(eventDetails, extras),
    [eventDetails, extras],
  );
}
