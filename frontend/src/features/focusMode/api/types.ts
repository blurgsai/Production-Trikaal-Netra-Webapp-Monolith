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

// Raw shape of GET /api/mongo-events/list (owned locally -- focusMode can't
// import eventTable's equivalent type across the feature boundary).
export interface MongoEventListItemRaw {
  id: string
  type: string | null
  severity: string | null
  status: string | null
  timestamp: string | null
  location: EventLocationRaw | null
}

export interface MongoEventListApiResponse {
  events: MongoEventListItemRaw[]
  total: number
  limit: number
  offset: number
}
