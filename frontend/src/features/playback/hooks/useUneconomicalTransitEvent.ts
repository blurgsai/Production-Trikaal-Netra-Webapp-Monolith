import { useMemo } from 'react';
import { mapUneconomicalTransitEventFromDetails } from '../model/eventTypeMappers';
import type { UneconomicalTransitEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapUneconomicalTransitEventFromDetails — asserting on the real output is what
// covers the mapper (incl. knots→m/s conversion) under the "test only hooks" policy.
export function useUneconomicalTransitEvent(eventDetails: EventDetailsBase): UneconomicalTransitEvent {
  return useMemo(() => mapUneconomicalTransitEventFromDetails(eventDetails), [eventDetails]);
}
