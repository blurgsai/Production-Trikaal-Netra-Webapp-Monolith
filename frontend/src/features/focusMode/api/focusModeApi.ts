import type {
  TrajectoryApiResponse,
  VesselsByMmsiApiResponse,
  EventsApiResponse,
  MockPlaybackData,
  TrajectoryPointRaw,
} from './types'

const MOCK_FILES = [
  'prolonged_stationary.json',
  'prolonged_low_speed.json',
  'geofence_intrusion.json',
] as const

const VESSEL_NAMES: Record<string, string> = {
  '366168522': 'MV Arabian Sea',
  '123456789': 'MV Pacific Star',
  '987654321': 'MV Indian Ocean',
}

export const pingFocusMode = async (): Promise<true> => {
  await new Promise((r) => setTimeout(r, 100))
  return true
}

const fetchMockData = async (mmsi: string): Promise<MockPlaybackData> => {
  for (const file of MOCK_FILES) {
    const res = await fetch(`/mock/playback/${file}`)
    const data: MockPlaybackData = await res.json()
    const vessels = data.event_details.vessels_involved.map(String)
    if (vessels.includes(mmsi)) return data
  }
  const res = await fetch(`/mock/playback/${MOCK_FILES[0]}`)
  return res.json()
}

export const getVesselTrajectory = async (
  vesselId: string,
  startTime?: number,
  endTime?: number,
): Promise<TrajectoryApiResponse> => {
  const data = await fetchMockData(vesselId)
  const trajectories = data.trajectories
  const sortedTimestamps = Object.keys(trajectories).sort((a, b) => Number(a) - Number(b))

  const points: TrajectoryPointRaw[] = []
  for (const ts of sortedTimestamps) {
    const vesselData = trajectories[ts][vesselId]
    if (!vesselData) continue
    const timestampSec = Math.floor(Number(ts) / 1000)
    if (startTime && timestampSec < startTime) continue
    if (endTime && timestampSec > endTime) continue
    points.push({
      lat: vesselData.latitude,
      lon: vesselData.longitude,
      timestamp: timestampSec,
      speed: vesselData.speed_mps,
      heading: vesselData.heading,
    })
  }

  return {
    trajectory: points,
    mmsi: Number(vesselId),
    count: points.length,
  }
}

export const getVesselsByMmsi = async (
  mmsi: number,
): Promise<VesselsByMmsiApiResponse> => {
  await new Promise((r) => setTimeout(r, 200))
  const name = VESSEL_NAMES[String(mmsi)] ?? `Vessel ${mmsi}`
  return {
    vessels: [
      { vessel_id: mmsi, ship_name: name },
    ],
  }
}

export const getVesselEvents = async (
  vesselId: string,
): Promise<EventsApiResponse> => {
  const data = await fetchMockData(vesselId)
  const event = data.event_details
  return {
    events: [
      {
        event_id: event.id ?? `event_${event.type}`,
        type: event.type,
        severity: event.severity,
        status: event.status,
        timestamp: event.timestamp,
        location: event.location,
      },
    ],
  }
}
