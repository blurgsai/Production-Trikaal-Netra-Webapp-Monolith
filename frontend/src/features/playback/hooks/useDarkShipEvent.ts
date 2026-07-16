import { useMemo } from 'react';
import { mapDarkShipEventFromDetails } from '../model/eventTypeMappers';
import type { DarkShipEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapDarkShipEventFromDetails — asserting on the real output is what covers the
// mapper under the "test only hooks" policy.
export function useDarkShipEvent(eventDetails: EventDetailsBase): DarkShipEvent {
  return useMemo(() => mapDarkShipEventFromDetails(eventDetails), [eventDetails]);
}
