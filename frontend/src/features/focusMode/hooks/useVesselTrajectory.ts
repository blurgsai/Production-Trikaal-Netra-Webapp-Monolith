import { useQuery } from '@tanstack/react-query'
import { getVesselTrajectory } from '../api/focusModeApi'
import { mapTrajectoryData } from '../model/mappers'
import type { TrajectoryData } from '../model/types'

export const useVesselTrajectory = (
  vesselId: string | null,
  startTime: number | null,
  endTime: number | null
) =>
  useQuery({
    queryKey: ['focus-trajectory', vesselId, startTime, endTime],
    queryFn: () =>
      getVesselTrajectory(vesselId!, startTime ?? undefined, endTime ?? undefined),
    enabled: vesselId !== null,
    staleTime: 5 * 60 * 1000,
    select: (data): TrajectoryData => mapTrajectoryData(data),
  })
