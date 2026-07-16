import { useMemo } from 'react';
import { mapAnomalousJerkEventFromDetails } from '../model/eventTypeMappers';
import type { AnomalousJerkEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapAnomalousJerkEventFromDetails — asserting on the real output is what covers
// the mapper under the "test only hooks" policy.
export function useAnomalousJerkEvent(eventDetails: EventDetailsBase): AnomalousJerkEvent {
  return useMemo(() => mapAnomalousJerkEventFromDetails(eventDetails), [eventDetails]);
}
