import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Paper, Typography, useTheme } from '@mui/material'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import skyblueArrow from '@/assets/skyblue-arrow.svg'
import type { TrajectoryPoint, FocusEvent } from '../model/types'

const ROYAL_BLUE = Cesium.Color.fromCssColorString('#4169e1').withAlpha(0.7)

const TRAJECTORY_POINT_RADIUS = 3
const TRAJECTORY_POINT_OUTLINE = 1
const EVENT_POINT_RADIUS = 8
const EVENT_POINT_OUTLINE = 2

function createCircleCanvas(
  fill: string,
  stroke: string,
  radius: number,
  strokeWidth: number,
  logicalSize: number,
  fillOpacity: number,
): HTMLCanvasElement {
  const scale = 2
  const size = Math.max(2, Math.floor(logicalSize * scale))
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const cx = size / 2
  const cy = size / 2
  const r = (radius / logicalSize) * size
  const lw = (strokeWidth / logicalSize) * size

  ctx.beginPath()
  ctx.arc(cx, cy, r + lw / 2, 0, Math.PI * 2)
  ctx.strokeStyle = stroke
  ctx.lineWidth = lw
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, Math.max(0, r - lw / 2), 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.globalAlpha = fillOpacity
  ctx.fill()
  ctx.globalAlpha = 1

  return canvas
}

function densifyPoints<T extends { lat: number; lon: number }>(
  points: T[],
  segments: number,
): { lat: number; lon: number }[] {
  if (points.length === 0) return []
  const result: { lat: number; lon: number }[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    for (let s = 1; s < segments; s++) {
      const t = s / segments
      result.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
      })
    }
    result.push(b)
  }
  return result
}

function computeSurfacePositions(
  viewer: Cesium.Viewer,
  points: Array<{ lat: number; lon: number }>,
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = []
  points.forEach((p) => {
    const c = Cesium.Cartographic.fromDegrees(p.lon, p.lat)
    viewer.scene.globe.getHeight(c)
    positions.push(
      Cesium.Cartesian3.fromRadians(
        c.longitude,
        c.latitude,
        c.height ?? 0,
      ),
    )
  })
  return positions
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

export const FocusModeMap3D = ({
  trajectory,
  fullTrajectory,
  currentPoint,
  playbackSpeed,
  events,
  fitKey,
  onNavigateToEvent,
}: Props) => {
  void playbackSpeed // kept for parity with the 2D map props

  const theme = useTheme()

  const severityColorMap = useMemo(
    () => ({
      high: theme.palette.error.main,
      medium: theme.palette.warning.main,
      low: theme.palette.info.main,
    }),
    [theme],
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const pathEntityRef = useRef<Cesium.Entity | null>(null)
  const currentEntityRef = useRef<Cesium.Entity | null>(null)
  const pointEntitiesRef = useRef<Cesium.Entity[]>([])
  const pointDataRef = useRef<Record<string, TrajectoryPoint>>({})
  const eventEntitiesRef = useRef<Record<string, Cesium.Entity>>({})
  const eventDataRef = useRef<Record<string, FocusEvent>>({})
  const pointCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const eventCanvasCacheRef = useRef<Record<string, HTMLCanvasElement>>({})
  const [isReady, setIsReady] = useState(false)
  const [vesselIcon, setVesselIcon] = useState<HTMLCanvasElement | null>(null)
  const [selectedInfo, setSelectedInfo] = useState<{
    type: 'point' | 'event'
    data: TrajectoryPoint | FocusEvent
    x: number
    y: number
  } | null>(null)
  const onNavigateToEventRef = useRef(onNavigateToEvent)
  onNavigateToEventRef.current = onNavigateToEvent
  const selectedInfoRef = useRef<typeof selectedInfo>(null)
  selectedInfoRef.current = selectedInfo

  const getTrajectoryCanvas = () => {
    if (!pointCanvasRef.current) {
      pointCanvasRef.current = createCircleCanvas(
        '#ff0000',
        '#ffffff',
        TRAJECTORY_POINT_RADIUS,
        TRAJECTORY_POINT_OUTLINE,
        8,
        0.85,
      )
    }
    return pointCanvasRef.current
  }

  const getEventCanvas = (fill: string, stroke: string) => {
    if (!eventCanvasCacheRef.current[fill]) {
      eventCanvasCacheRef.current[fill] = createCircleCanvas(
        fill,
        stroke,
        EVENT_POINT_RADIUS,
        EVENT_POINT_OUTLINE,
        18,
        0.9,
      )
    }
    return eventCanvasCacheRef.current[fill]
  }

  // Initialize Cesium viewer once
  useEffect(() => {
    if (!containerRef.current) return

    let mounted = true

    const init = async () => {
      const imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        { enablePickFeatures: false },
      )
      if (!mounted) return

      const viewer = new Cesium.Viewer(containerRef.current as HTMLDivElement, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        timeline: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        baseLayer: new Cesium.ImageryLayer(imageryProvider),
        terrain: new Cesium.Terrain(Cesium.createWorldTerrainAsync()),
      })

      if (viewer.scene.skyBox) {
        viewer.scene.skyBox.show = false
      }
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0b0d17')
      viewer.scene.globe.enableLighting = true
      viewer.scene.globe.depthTestAgainstTerrain = true

      const pathEntity = viewer.entities.add({
        polyline: {
          width: 2,
          material: ROYAL_BLUE,
          depthFailMaterial: ROYAL_BLUE,
          arcType: Cesium.ArcType.GEODESIC,
          clampToGround: false,
          positions: [],
        },
      })
      pathEntityRef.current = pathEntity

      const currentEntity = viewer.entities.add({
        position: Cesium.Cartesian3.ZERO,
        billboard: {
          width: 28,
          height: 28,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          show: false,
        },
      })
      currentEntityRef.current = currentEntity

      // Build a canvas-based icon from the SVG so Cesium can billboard it reliably
      const size = 28
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      let iconLoaded = false
      if (ctx) {
        const img = new Image()
        img.onload = () => {
          if (iconLoaded || !mounted) return
          iconLoaded = true
          ctx.drawImage(img, 0, 0, size, size)
          setVesselIcon(canvas)
        }
        img.onerror = () => {
          if (iconLoaded || !mounted) return
          iconLoaded = true
          // Fallback arrow in the same sky-blue colour
          ctx.fillStyle = '#5ec8ff'
          ctx.beginPath()
          ctx.moveTo(size / 2, 2)
          ctx.lineTo(size - 2, size - 2)
          ctx.lineTo(size / 2, size - 6)
          ctx.lineTo(2, size - 2)
          ctx.closePath()
          ctx.fill()
          setVesselIcon(canvas)
        }
        img.src = skyblueArrow
      }

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

      const handleMove = (movement: {
        endPosition: Cesium.Cartesian2
      }) => {
        const picked = viewer.scene.pick(movement.endPosition)
        const entity = picked?.id as Cesium.Entity | undefined
        const id = entity?.id

        if (
          typeof id === 'string' &&
          id.startsWith('point-') &&
          pointDataRef.current[id]
        ) {
          setSelectedInfo({
            type: 'point',
            data: pointDataRef.current[id],
            x: movement.endPosition.x,
            y: movement.endPosition.y,
          })
          return
        }

        if (selectedInfoRef.current?.type === 'point') {
          setSelectedInfo(null)
        }
      }

      const handleClick = (event: { position: Cesium.Cartesian2 }) => {
        const picked = viewer.scene.pick(event.position)
        const entity = picked?.id as Cesium.Entity | undefined
        const id = entity?.id

        if (typeof id === 'string' && eventDataRef.current[id]) {
          setSelectedInfo({
            type: 'event',
            data: eventDataRef.current[id],
            x: event.position.x,
            y: event.position.y,
          })
          return
        }

        setSelectedInfo(null)
      }

      handler.setInputAction(handleMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
      handler.setInputAction(handleClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      viewerRef.current = viewer
      if (mounted) {
        setIsReady(true)
      } else {
        viewer.destroy()
      }
    }

    init()

    return () => {
      mounted = false
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
      pathEntityRef.current = null
      currentEntityRef.current = null
      pointEntitiesRef.current = []
      eventEntitiesRef.current = {}
      eventDataRef.current = {}
      pointDataRef.current = {}
      pointCanvasRef.current = null
      eventCanvasCacheRef.current = {}
    }
  }, [])

  // Fit camera to the full trajectory and events whenever data changes
  useEffect(() => {
    const viewer = viewerRef.current
    if (!isReady || !viewer) return

    const eventLocations = events
      .filter((e): e is FocusEvent & { location: { lat: number; lon: number } } =>
        Boolean(e.location),
      )
      .map((e) => e.location)
    const coords: Array<{ lat: number; lon: number }> = [
      ...fullTrajectory,
      ...eventLocations,
    ]

    if (coords.length === 0) return

    const positions = computeSurfacePositions(viewer, coords)
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions)

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 1,
      offset: new Cesium.HeadingPitchRange(
        0,
        -Cesium.Math.toRadians(45),
        0,
      ),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, isReady])

  // Update visible polyline
  useEffect(() => {
    const pathEntity = pathEntityRef.current
    const viewer = viewerRef.current
    if (!pathEntity || !viewer || trajectory.length < 2) {
      if (pathEntity?.polyline) {
        pathEntity.polyline.show = new Cesium.ConstantProperty(false)
      }
      return
    }

    const polyline = pathEntity.polyline
    if (!polyline) return

    const positions = computeSurfacePositions(
      viewer,
      densifyPoints(trajectory, 16),
    )

    if (positions.length < 2) {
      polyline.show = new Cesium.ConstantProperty(false)
      return
    }

    polyline.positions = new Cesium.ConstantProperty(positions)
    polyline.show = new Cesium.ConstantProperty(true)
  }, [trajectory, isReady])

  // Update current vessel marker position and heading
  useEffect(() => {
    const entity = currentEntityRef.current
    const viewer = viewerRef.current
    if (!entity || !viewer) return

    if (!currentPoint) {
      if (entity.billboard) {
        entity.billboard.show = new Cesium.ConstantProperty(false)
      }
      return
    }

    const [position] = computeSurfacePositions(viewer, [currentPoint])
    entity.position = new Cesium.ConstantPositionProperty(position)

    const degrees = ((currentPoint.heading ?? 0) + 360) % 360
    if (entity.billboard) {
      entity.billboard.rotation = new Cesium.ConstantProperty(
        Cesium.Math.toRadians(-degrees),
      )
      if (vesselIcon && !entity.billboard.image) {
        entity.billboard.image = new Cesium.ConstantProperty(vesselIcon)
      }
      if (vesselIcon) {
        entity.billboard.show = new Cesium.ConstantProperty(true)
      }
    }
  }, [currentPoint, vesselIcon])

  // Render full trajectory sample points as clickable circle billboards
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    pointEntitiesRef.current.forEach((entity) => viewer.entities.remove(entity))
    pointEntitiesRef.current = []
    pointDataRef.current = {}

    if (fullTrajectory.length === 0) return

    const positions = computeSurfacePositions(viewer, fullTrajectory)
    const image = getTrajectoryCanvas()

    fullTrajectory.forEach((p, i) => {
      const id = `point-${i}-${p.timestamp}-${p.lat.toFixed(6)}-${p.lon.toFixed(6)}`
      const entity = viewer.entities.add({
        id,
        position: positions[i],
        billboard: {
          image,
          width: 8,
          height: 8,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
      pointEntitiesRef.current.push(entity)
      pointDataRef.current[id] = p
    })
  }, [fullTrajectory, isReady])

  // Update event markers as clickable circle billboards
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    Object.values(eventEntitiesRef.current).forEach((e) =>
      viewer.entities.remove(e),
    )
    eventEntitiesRef.current = {}
    eventDataRef.current = {}

    const eventPoints = events
      .map((event) =>
        event.location ? { lat: event.location.lat, lon: event.location.lon } : null,
      )
      .filter((p): p is { lat: number; lon: number } => p !== null)
    const eventPositions = computeSurfacePositions(viewer, eventPoints)

    events.forEach((event, i) => {
      if (!event.location) return
      const fill =
        (event.severity ? severityColorMap[event.severity] : undefined) ??
        theme.palette.warning.main
      const image = getEventCanvas(fill, theme.palette.background.paper)

      const entity = viewer.entities.add({
        id: event.id,
        name: event.type,
        position: eventPositions[i],
        billboard: {
          image,
          width: 18,
          height: 18,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })

      eventEntitiesRef.current[event.id] = entity
      eventDataRef.current[event.id] = event
    })
  }, [
    events,
    severityColorMap,
    theme.palette.warning.main,
    theme.palette.background.paper,
    isReady,
  ])

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', borderRadius: 8 }}
      />
      {selectedInfo && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            left: selectedInfo.x + 12,
            top: selectedInfo.y - 12,
            minWidth: 180,
            zIndex: 1000,
            p: 1.5,
            borderRadius: 1,
            pointerEvents: 'auto',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {selectedInfo.type === 'point' ? (
            <Typography variant="body2" fontWeight={700}>
              {new Date(
                (selectedInfo.data as TrajectoryPoint).timestamp * 1000,
              ).toLocaleString()}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" fontWeight={700}>
                {(selectedInfo.data as FocusEvent).type}
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  typography: 'body2',
                  color: 'text.secondary',
                }}
              >
                ID: {(selectedInfo.data as FocusEvent).id || '—'}
                <br />
                Severity: {(selectedInfo.data as FocusEvent).severity ?? '—'}
                <br />
                Status: {(selectedInfo.data as FocusEvent).status ?? '—'}
                <br />
                {(selectedInfo.data as FocusEvent).timestamp && (
                  <>
                    {(selectedInfo.data as FocusEvent).timestamp!.toLocaleString()}
                    <br />
                  </>
                )}
              </Box>
              <Button
                onClick={() => {
                  onNavigateToEventRef.current?.(
                    (selectedInfo.data as FocusEvent).id,
                  )
                  setSelectedInfo(null)
                }}
                sx={{
                  mt: 1,
                  p: 0,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  fontSize: theme.typography.body2.fontSize,
                }}
              >
                View Event Details →
              </Button>
            </>
          )}
        </Paper>
      )}
    </Box>
  )
}
