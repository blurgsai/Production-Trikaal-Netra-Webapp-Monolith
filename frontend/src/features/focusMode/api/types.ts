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
