import { useMemo } from 'react';
import { mapProlongedStationaryEventFromDetails } from '../model/eventTypeMappers';
import type { ProlongedStationaryEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapProlongedStationaryEventFromDetails — asserting on the real output is what
// covers the mapper under the "test only hooks" policy.
export function useProlongedStationaryEvent(eventDetails: EventDetailsBase): ProlongedStationaryEvent {
  return useMemo(() => mapProlongedStationaryEventFromDetails(eventDetails), [eventDetails]);
}
