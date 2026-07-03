import { axiosInstance } from '@/shared/api'
import type {
  TrajectoryApiResponse,
  VesselsByMmsiApiResponse,
  EventsApiResponse,
} from './types'

export const pingFocusMode = async (): Promise<true> => {
  await axiosInstance.get('/focusmode/ping')
  return true
}

export const getVesselTrajectory = async (
  vesselId: string,
  startTime?: number,
  endTime?: number
): Promise<TrajectoryApiResponse> => {
  const params: Record<string, number> = {}
  if (startTime != null) params.start_time = startTime
  if (endTime != null) params.end_time = endTime
  const response = await axiosInstance.get(
    `/focusmode/vessel/${vesselId}/trajectory`,
    { params }
  )
  return response.data
}

export const getVesselsByMmsi = async (
  mmsi: number
): Promise<VesselsByMmsiApiResponse> => {
  const response = await axiosInstance.get(`/focusmode/vessel/by-mmsi/${mmsi}`)
  return response.data
}

export const getVesselEvents = async (
  vesselId: string
): Promise<EventsApiResponse> => {
  const filters = JSON.stringify([
    { field: 'vessels_involved', operator: 'eq', value: vesselId },
  ])
  const response = await axiosInstance.get(
    `/api/mongo-events/list?filters=${encodeURIComponent(filters)}`
  )
  return response.data
}
