export interface TrajectoryPointRaw {
  lat: number
  lon: number
  timestamp: number
  speed?: number
  heading?: number
}

export interface TrajectoryApiResponse {
  trajectory: TrajectoryPointRaw[]
  mmsi?: number
  count: number
}

export interface VesselRaw {
  vessel_id: number
  ship_name: string
}

export interface VesselsByMmsiApiResponse {
  vessels: VesselRaw[]
}

export interface EventLocationRaw {
  type: string
  coordinates: [number, number]
}

export interface EventRaw {
  id?: string
  event_id?: string
  type?: string
  severity?: string
  status?: string
  timestamp?: string
  location?: EventLocationRaw
}

export interface EventsApiResponse {
  events: EventRaw[]
}

export interface MockPlaybackData {
  event_details: {
    id?: string
    type: string
    location: { type: string; coordinates: [number, number] }
    timestamp: string
    start_time: string
    end_time: string
    duration: { value: number; unit: string }
    vessels_involved: (string | number)[]
    severity: string
    model: string
    status: string
    s2_cell_id: string
    temporality: string
    event_source: string
    information: Record<string, unknown>
  }
  trajectories: Record<string, Record<string, {
    latitude: number
    longitude: number
    speed_mps: number
    heading: number
    course: number
  }>>
  time_window: { start: number; end: number }
  geofence_polygon?: {
    geofence_id: string
    asset_name: string
    polygon: { type: string; coordinates: number[][][] }
  }
}
