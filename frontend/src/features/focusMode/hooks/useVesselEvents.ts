import { useQuery } from '@tanstack/react-query'
import { getVesselEvents } from '../api/focusModeApi'
import { mapEvent } from '../model/mappers'
import type { FocusEvent } from '../model/types'

export const useVesselEvents = (
  vesselId: string | null,
  startTime: number | null,
  endTime: number | null,
) =>
  useQuery({
    queryKey: ['focus-events', vesselId, startTime, endTime],
    queryFn: () => getVesselEvents(vesselId!),
    enabled: vesselId !== null,
    staleTime: 5 * 60 * 1000,
    select: (data): FocusEvent[] => data.events.map(mapEvent),
  })
