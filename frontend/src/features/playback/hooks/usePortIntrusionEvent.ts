import { useMemo } from 'react';
import { mapPortIntrusionEventFromDetails } from '../model/eventTypeMappers';
import type { PortIntrusionEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapPortIntrusionEventFromDetails — asserting on the real output is what covers
// the mapper under the "test only hooks" policy.
// extras is optional: only the overlay slot receives extras (the polygon); the
// marker/timeline slots call without it and still get every non-geometry field.
// (Flattened from hooks/eventTypes/<type>/use<Type>Event.ts.)
export function usePortIntrusionEvent(
  eventDetails: EventDetailsBase,
  extras?: Record<string, unknown>,
): PortIntrusionEvent {
  return useMemo(
    () => mapPortIntrusionEventFromDetails(eventDetails, extras),
    [eventDetails, extras],
  );
}
