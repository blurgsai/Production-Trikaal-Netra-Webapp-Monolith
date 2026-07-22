import { useEffect, useRef, useMemo } from 'react'
import {
  MapContainer, TileLayer, Polyline,
  CircleMarker, Tooltip, Marker, Popup, useMap,
} from 'react-leaflet'
import { useTheme, styled } from '@mui/material/styles'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import skyblueArrow from '@/assets/skyblue-arrow.svg'
import type { TrajectoryPoint, FocusEvent } from '../model/types'

const VESSEL_ICON = L.divIcon({
  className: 'vessel-icon',
  html: `<img src="${skyblueArrow}" style="width:28px;height:28px;display:block;" />`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const PopupButton = styled('button')(({ theme }) => ({
  marginTop: theme.spacing(1),
  cursor: 'pointer',
  color: theme.palette.primary.main,
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: theme.typography.body2.fontSize,
  fontFamily: theme.typography.fontFamily,
  textAlign: 'left',
  '&:hover': {
    textDecoration: 'underline',
  },
}))

interface MarkerWithIconElement extends L.Marker {
  _icon?: HTMLElement
}

const getMarkerIcon = (markerRef: React.RefObject<L.Marker | null>) =>
  (markerRef.current as MarkerWithIconElement | null)?._icon

function MarkerTransitionGuard({
  markerRef,
  playbackSpeed,
}: {
  markerRef: React.RefObject<L.Marker | null>
  playbackSpeed: number
}) {
  const map = useMap()

  useEffect(() => {
    const getIcon = () => getMarkerIcon(markerRef)
    const seconds = Math.max(0.15, 1 / playbackSpeed)

    const disable = () => {
      const icon = getIcon()
      if (icon) icon.style.transition = 'none'
    }
    const enable = () => {
      const icon = getIcon()
      if (icon) icon.style.transition = `transform ${seconds}s linear`
    }

    map.on('movestart zoomstart', disable)
    map.on('moveend zoomend', enable)
    return () => {
      map.off('movestart zoomstart', disable)
      map.off('moveend zoomend', enable)
    }
  }, [map, markerRef, playbackSpeed])

  return null
}

function FitBounds({
  fullTrajectory,
  fitKey,
}: {
  fullTrajectory: TrajectoryPoint[]
  fitKey: unknown
}) {
  const map = useMap()

  useEffect(() => {
    if (!fullTrajectory.length) return
    const bounds = L.latLngBounds(fullTrajectory.map((p) => [p.lat, p.lon]))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
  }, [fitKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

function EventMarker({
  event,
  onNavigateToEvent,
}: {
  event: FocusEvent
  onNavigateToEvent?: (eventId: string) => void
}) {
  const theme = useTheme()
  const severityColors: Record<string, string> = useMemo(
    () => ({
      high: theme.palette.error.main,
      medium: theme.palette.warning.main,
      low: theme.palette.info.main,
    }),
    [theme],
  )

  if (!event.location) return null

  const { lat, lon } = event.location
  const color = severityColors[event.severity ?? ''] ?? theme.palette.warning.main

  return (
    <CircleMarker
      center={[lat, lon]}
      radius={8}
      fillColor={color}
      color={theme.palette.background.paper}
      weight={2}
      fillOpacity={0.9}
    >
      <Popup>
        <strong>{event.type}</strong><br />
        ID: {event.id || '—'}<br />
        Severity: {event.severity ?? '—'}<br />
        Status: {event.status ?? '—'}<br />
        {event.timestamp && <>{event.timestamp.toLocaleString()}<br /></>}
        <PopupButton onClick={() => onNavigateToEvent?.(event.id)}>
          View Event Details →
        </PopupButton>
      </Popup>
    </CircleMarker>
  )
}

interface Props {
  trajectory: TrajectoryPoint[]
  fullTrajectory: TrajectoryPoint[]
  currentPoint: TrajectoryPoint | null
  playbackSpeed: number
  events: FocusEvent[]
  fitKey: unknown
  onNavigateToEvent?: (eventId: string) => void
}

export const FocusModeMap = ({
  trajectory, fullTrajectory, currentPoint, playbackSpeed, events, fitKey, onNavigateToEvent,
}: Props) => {
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    const icon = getMarkerIcon(markerRef)
    if (!icon) return
    const seconds = Math.max(0.15, 1 / playbackSpeed)
    icon.style.transition = `transform ${seconds}s linear`
  })

  useEffect(() => {
    const icon = getMarkerIcon(markerRef)
    if (!icon || !currentPoint) return
    const degrees = ((currentPoint.heading ?? 0) + 360) % 360
    const img = icon.querySelector('img')
    if (img) img.style.transform = `rotate(${degrees}deg)`
  }, [currentPoint])

  const path = trajectory.map((p) => [p.lat, p.lon] as [number, number])

  return (
    <MapContainer
      center={[20, 78]}
      zoom={4}
      style={{ height: '100%', width: '100%', borderRadius: 8 }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      <FitBounds fullTrajectory={fullTrajectory} fitKey={fitKey} />
      <MarkerTransitionGuard markerRef={markerRef} playbackSpeed={playbackSpeed} />

      {path.length > 1 && (
        <Polyline positions={path} color="royalblue" weight={2} opacity={0.7} />
      )}

      {fullTrajectory.map((p, i) => (
        <CircleMarker
          key={`${i}-${p.timestamp}-${p.lat}-${p.lon}`}
          center={[p.lat, p.lon]}
          radius={3}
          fillColor="red"
          color="white"
          weight={1}
          fillOpacity={0.85}
        >
          <Tooltip>{new Date(p.timestamp * 1000).toLocaleString()}</Tooltip>
        </CircleMarker>
      ))}

      {events.map((event) => (
        <EventMarker key={event.id} event={event} onNavigateToEvent={onNavigateToEvent} />
      ))}

      {currentPoint && (
        <Marker
          ref={markerRef}
          position={[currentPoint.lat, currentPoint.lon]}
          icon={VESSEL_ICON}
        >
          <Tooltip sticky direction="top" offset={[0, -16]}>
            <strong>{new Date(currentPoint.timestamp * 1000).toLocaleString()}</strong><br />
            Speed: {currentPoint.speed?.toFixed(1)} kn &nbsp;|&nbsp; Hdg: {currentPoint.heading?.toFixed(0)}°
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  )
}
