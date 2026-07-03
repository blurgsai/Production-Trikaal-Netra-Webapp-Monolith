export interface TrajectoryPoint {
  lat: number
  lon: number
  timestamp: number
  speed: number | null
  heading: number | null
}

export interface TrajectoryData {
  points: TrajectoryPoint[]
  mmsi: number | null
  count: number
}

export interface Vessel {
  id: string
  name: string
}

export interface FocusEvent {
  id: string
  type: string
  severity: 'high' | 'medium' | 'low' | null
  status: string | null
  timestamp: Date | null
  location: { lat: number; lon: number } | null
}
