import { useMemo } from 'react';
import { mapDarkAfterDepartureEventFromDetails } from '../model/eventTypeMappers';
import type { DarkAfterDepartureEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapDarkAfterDepartureEventFromDetails — asserting on the real output is what
// covers the mapper under the "test only hooks" policy.
// `extras` carries the backend's `port_polygon`; only the overlay slot has it,
// so it defaults to {} for the marker/timeline slots (which don't draw the port).
export function useDarkAfterDepartureEvent(
  eventDetails: EventDetailsBase,
  extras: Record<string, unknown> = {},
): DarkAfterDepartureEvent {
  return useMemo(
    () => mapDarkAfterDepartureEventFromDetails(eventDetails, extras),
    [eventDetails, extras],
  );
}
