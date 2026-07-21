import { useMemo } from 'react';
import { mapCoordinatedDarkActivityEventFromDetails } from '../model/eventTypeMappers';
import type { CoordinatedDarkActivityEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapCoordinatedDarkActivityEventFromDetails — asserting on the real output is what
// covers the mapper under the "test only hooks" policy.
export function useCoordinatedDarkActivityEvent(eventDetails: EventDetailsBase): CoordinatedDarkActivityEvent {
  return useMemo(() => mapCoordinatedDarkActivityEventFromDetails(eventDetails), [eventDetails]);
}
