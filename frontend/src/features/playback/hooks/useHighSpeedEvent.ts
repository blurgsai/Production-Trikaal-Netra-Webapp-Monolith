import { useMemo } from 'react';
import { mapHighSpeedEventFromDetails } from '../model/eventTypeMappers';
import type { HighSpeedEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapHighSpeedEventFromDetails — asserting on the real output is what covers the
// mapper under the "test only hooks" policy.
export function useHighSpeedEvent(eventDetails: EventDetailsBase): HighSpeedEvent {
  return useMemo(() => mapHighSpeedEventFromDetails(eventDetails), [eventDetails]);
}
