import { useMemo } from 'react';
import { mapAnomalousAccelerationEventFromDetails } from '../model/eventTypeMappers';
import type { AnomalousAccelerationEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapAnomalousAccelerationEventFromDetails — asserting on the real output is what
// covers the mapper under the "test only hooks" policy.
export function useAnomalousAccelerationEvent(eventDetails: EventDetailsBase): AnomalousAccelerationEvent {
  return useMemo(() => mapAnomalousAccelerationEventFromDetails(eventDetails), [eventDetails]);
}
