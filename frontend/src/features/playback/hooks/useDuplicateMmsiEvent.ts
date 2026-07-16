import { useMemo } from 'react';
import { mapDuplicateMmsiEventFromDetails } from '../model/eventTypeMappers';
import type { DuplicateMmsiEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapDuplicateMmsiEventFromDetails — asserting on the real output (incl. the derived
// maxPlausibleDistanceM) is what covers the mapper under the "test only hooks" policy.
export function useDuplicateMmsiEvent(eventDetails: EventDetailsBase): DuplicateMmsiEvent {
  return useMemo(() => mapDuplicateMmsiEventFromDetails(eventDetails), [eventDetails]);
}
