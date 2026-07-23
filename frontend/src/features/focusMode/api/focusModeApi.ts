import axiosInstance from '@/shared/api/client'
import type {
  TrajectoryApiResponse,
  VesselsByMmsiApiResponse,
  EventsApiResponse,
  MongoEventListApiResponse,
} from './types'

export const pingFocusMode = async (): Promise<true> => {
  await new Promise((r) => setTimeout(r, 100))
  return true
}

export const getVesselTrajectory = async (
  vesselId: string,
  startTime?: number,
  endTime?: number,
): Promise<TrajectoryApiResponse> => {
  const params: Record<string, number> = {}
  if (startTime !== undefined) params.start_time = startTime
  if (endTime !== undefined) params.end_time = endTime

  const res = await axiosInstance.get(`/api/focus-mode/vessel/${vesselId}/trajectory`, { params })
  return res.data
}

export const getVesselsByMmsi = async (
  mmsi: number,
): Promise<VesselsByMmsiApiResponse> => {
  const res = await axiosInstance.get(`/api/focus-mode/vessel/by-mmsi/${mmsi}`)
  return res.data
}

export const getVesselEvents = async (
  vesselId: string,
  startTime?: number,
  endTime?: number,
): Promise<EventsApiResponse> => {
  const filters: Array<{ field: string; operator: string; value: string }> = [
    { field: 'vessels_involved', operator: 'eq', value: vesselId },
  ]
  if (startTime !== undefined) {
    filters.push({ field: 'timestamp', operator: 'gte', value: new Date(startTime * 1000).toISOString() })
  }
  if (endTime !== undefined) {
    filters.push({ field: 'timestamp', operator: 'lte', value: new Date(endTime * 1000).toISOString() })
  }

  const res = await axiosInstance.get<MongoEventListApiResponse>('/api/mongo-events/list', {
    params: { limit: 1000, offset: 0, filters: JSON.stringify(filters) },
  })

  return {
    events: res.data.events.map((e) => ({
      id: e.id,
      type: e.type ?? undefined,
      severity: e.severity ?? undefined,
      status: e.status ?? undefined,
      timestamp: e.timestamp ?? undefined,
      location: e.location ?? undefined,
    })),
  }
}
