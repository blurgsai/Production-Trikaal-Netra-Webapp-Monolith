import { useMemo } from 'react';
import { mapSignalLostEventFromDetails } from '../model/eventTypeMappers';
import type { SignalLostEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapSignalLostEventFromDetails — asserting on the real output is what covers
// the mapper under the "test only hooks" policy.
export function useSignalLostEvent(eventDetails: EventDetailsBase): SignalLostEvent {
  return useMemo(() => mapSignalLostEventFromDetails(eventDetails), [eventDetails]);
}
