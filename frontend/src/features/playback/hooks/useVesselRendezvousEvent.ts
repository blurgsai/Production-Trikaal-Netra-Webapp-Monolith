import { useMemo } from 'react';
import { mapVesselRendezvousEventFromDetails } from '../model/eventTypeMappers';
import type { VesselRendezvousEvent } from '../model/eventTypeTypes';
import type { EventDetailsBase } from '../model/types';

// Thin per-event hook: a test surface over the mapper. Its test must NOT mock
// mapVesselRendezvousEventFromDetails — asserting on the real output is what covers
// the mapper (incl. knots→m/s) under the "test only hooks" policy.
export function useVesselRendezvousEvent(eventDetails: EventDetailsBase): VesselRendezvousEvent {
  return useMemo(() => mapVesselRendezvousEventFromDetails(eventDetails), [eventDetails]);
}
