import { useMemo } from 'react';
import { mapProlongedLowSpeedEventFromDetails } from '../model/eventTypeMappers';
import type { ProlongedLowSpeedEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapProlongedLowSpeedEventFromDetails — asserting on the real output is what
// covers the mapper under the "test only hooks" policy.
export function useProlongedLowSpeedEvent(eventDetails: EventDetailsBase): ProlongedLowSpeedEvent {
  return useMemo(() => mapProlongedLowSpeedEventFromDetails(eventDetails), [eventDetails]);
}
