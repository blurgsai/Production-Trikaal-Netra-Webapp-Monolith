import { useMemo } from 'react';
import type { EventDetailsBase, PlaybackData } from '../model/types';

export interface ResolvedEventTypesResult {
  resolvedTypes: string[];
  resolvedDetails: Record<string, EventDetailsBase>;
}

// Resolves which event type(s) a loaded event belongs to, and the EventDetailsBase
// block each one should render from. Atomic events resolve to a single type;
// compound events fan out to their constituentTypes.
export function useResolvedEventTypes(
  data: PlaybackData | null | undefined,
  eventType: string,
  isCompound: boolean,
): ResolvedEventTypesResult {
  return useMemo(() => {
    if (!data) return { resolvedTypes: [], resolvedDetails: {} };

    const resolvedTypes = !isCompound
      ? [eventType]
      : data.eventDetails.constituentTypes ?? [eventType];

    // For compound events the API nests each constituent's details under its type key;
    // for atomic events the whole eventDetails block belongs to the single type.
    // Compound event contract is not yet finalised — the nested cast will be revisited.
    const resolvedDetails: Record<string, EventDetailsBase> = !isCompound
      ? { [eventType]: data.eventDetails }
      : Object.fromEntries(
          resolvedTypes.map(t => [
            t,
            (data.eventDetails as unknown as Record<string, EventDetailsBase>)[t] ?? data.eventDetails,
          ]),
        );

    return { resolvedTypes, resolvedDetails };
  }, [data, eventType, isCompound]);
}
