import { useMemo } from 'react';
import { mapSuddenStopEventFromDetails } from '../model/eventTypeMappers';
import type { SuddenStopEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapSuddenStopEventFromDetails — asserting on the real output is what covers the
// mapper under the "test only hooks" policy.
export function useSuddenStopEvent(eventDetails: EventDetailsBase): SuddenStopEvent {
  return useMemo(() => mapSuddenStopEventFromDetails(eventDetails), [eventDetails]);
}
