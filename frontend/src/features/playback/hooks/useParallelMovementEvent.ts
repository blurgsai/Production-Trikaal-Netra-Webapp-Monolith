import { useMemo } from 'react';
import { mapParallelMovementEventFromDetails } from '../model/eventTypeMappers';
import type { ParallelMovementEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapParallelMovementEventFromDetails — asserting on the real output is what covers
// the mapper under the "test only hooks" policy.
export function useParallelMovementEvent(eventDetails: EventDetailsBase): ParallelMovementEvent {
  return useMemo(() => mapParallelMovementEventFromDetails(eventDetails), [eventDetails]);
}
