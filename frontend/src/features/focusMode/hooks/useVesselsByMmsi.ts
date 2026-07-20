import { useQuery } from '@tanstack/react-query'
import { getVesselsByMmsi } from '../api/focusModeApi'
import { mapVessel } from '../model/mappers'
import type { Vessel } from '../model/types'

export const useVesselsByMmsi = (mmsi: number | null) =>
  useQuery({
    queryKey: ['focus-vessels-by-mmsi', mmsi],
    queryFn: () => getVesselsByMmsi(mmsi!),
    enabled: mmsi !== null,
    select: (data): Vessel[] => data.vessels.map(mapVessel),
  })
