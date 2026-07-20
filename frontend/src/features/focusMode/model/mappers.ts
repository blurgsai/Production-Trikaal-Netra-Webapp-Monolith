import type { TrajectoryPointRaw, TrajectoryApiResponse, VesselRaw, EventRaw } from '../api/types'
import type { TrajectoryPoint, TrajectoryData, Vessel, FocusEvent } from './types'

export const mapTrajectoryPoint = (raw: TrajectoryPointRaw): TrajectoryPoint => ({
  lat: raw.lat,
  lon: raw.lon,
  timestamp: raw.timestamp,
  speed: raw.speed ?? null,
  heading: raw.heading ?? null,
})

export const mapTrajectoryData = (raw: TrajectoryApiResponse): TrajectoryData => ({
  points: raw.trajectory.map(mapTrajectoryPoint),
  mmsi: raw.mmsi ?? null,
  count: raw.count,
})

export const mapVessel = (raw: VesselRaw): Vessel => ({
  id: String(raw.vessel_id),
  name: raw.ship_name,
})

const VALID_SEVERITIES = new Set(['high', 'medium', 'low'])

export const mapEvent = (raw: EventRaw): FocusEvent => {
  const rawSeverity = raw.severity?.toLowerCase()
  const severity = VALID_SEVERITIES.has(rawSeverity ?? '')
    ? (rawSeverity as 'high' | 'medium' | 'low')
    : null

  const coords = raw.location?.coordinates
  const location = coords ? { lat: coords[1], lon: coords[0] } : null

  return {
    id: raw.event_id ?? raw.id ?? '',
    type: raw.type ?? 'Event',
    severity,
    status: raw.status ?? null,
    timestamp: raw.timestamp ? new Date(raw.timestamp) : null,
    location,
  }
}
