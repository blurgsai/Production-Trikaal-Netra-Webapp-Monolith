import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, IconButton, Paper, Typography, useTheme } from "@mui/material";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import skyblueArrow from "@/assets/skyblue-arrow.svg";
import vesselGlbUrl from "@/assets/vessel.glb?url";
import type { TrajectoryPoint, FocusEvent } from "../model/types";

const ROYAL_BLUE = Cesium.Color.fromCssColorString("#4169e1").withAlpha(0.7);

const TRAJECTORY_POINT_RADIUS = 3;
const TRAJECTORY_POINT_OUTLINE = 1;
const EVENT_POINT_RADIUS = 8;
const EVENT_POINT_OUTLINE = 2;
const TRAJECTORY_BILLBOARD_SIZE = 8;
const EVENT_BILLBOARD_SIZE = 18;
const VESSEL_BILLBOARD_SIZE = 28;
const DEFAULT_INITIAL_VIEW_DELTA_DEGREES = 0.5;
const VESSEL_MODEL_SCALE = 1;
const VESSEL_MODEL_MINIMUM_PIXEL_SIZE = 64;
const VESSEL_MODEL_MAXIMUM_SCALE = 20000;
/** Adjust if the GLB's nose does not point along heading 0 (north). */
const VESSEL_MODEL_HEADING_OFFSET_DEG = 0;
/** Model-space Y rotation so the deck faces up (top-down view). */
const VESSEL_MODEL_Y_ROTATION_DEG = -90;

function createCircleCanvas(
  fill: string,
  stroke: string,
  radius: number,
  strokeWidth: number,
  logicalSize: number,
  fillOpacity: number,
): HTMLCanvasElement {
  const scale = 2;
  const size = Math.max(2, Math.floor(logicalSize * scale));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const r = (radius / logicalSize) * size;
  const lw = (strokeWidth / logicalSize) * size;

  ctx.beginPath();
  ctx.arc(cx, cy, r + lw / 2, 0, Math.PI * 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, r - lw / 2), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.globalAlpha = fillOpacity;
  ctx.fill();
  ctx.globalAlpha = 1;

  return canvas;
}

function densifyPoints<T extends { lat: number; lon: number }>(
  points: T[],
  segments: number,
): { lat: number; lon: number }[] {
  if (points.length === 0) return [];
  const result: { lat: number; lon: number }[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      result.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
      });
    }
    result.push(b);
  }
  return result;
}

function computeSurfacePositions(
  viewer: Cesium.Viewer,
  points: Array<{ lat: number; lon: number }>,
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  points.forEach((p) => {
    const c = Cesium.Cartographic.fromDegrees(p.lon, p.lat);
    viewer.scene.globe.getHeight(c);
    positions.push(
      Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height ?? 0),
    );
  });
  return positions;
}

function getEventCenterView(
  events: FocusEvent[],
): { lat: number; lon: number; deltaDegrees: number } | null {
  const located = events.filter(
    (e): e is FocusEvent & { location: { lat: number; lon: number } } =>
      Boolean(e.location),
  );
  if (located.length === 0) return null;

  if (located.length === 1) {
    return {
      lat: located[0].location.lat,
      lon: located[0].location.lon,
      deltaDegrees: DEFAULT_INITIAL_VIEW_DELTA_DEGREES,
    };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const event of located) {
    minLat = Math.min(minLat, event.location.lat);
    maxLat = Math.max(maxLat, event.location.lat);
    minLon = Math.min(minLon, event.location.lon);
    maxLon = Math.max(maxLon, event.location.lon);
  }

  const span = Math.max(
    maxLat - minLat,
    maxLon - minLon,
    DEFAULT_INITIAL_VIEW_DELTA_DEGREES,
  );

  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
    deltaDegrees: Math.max(
      span / 2 + DEFAULT_INITIAL_VIEW_DELTA_DEGREES * 0.5,
      DEFAULT_INITIAL_VIEW_DELTA_DEGREES,
    ),
  };
}

/**
 * Cesium's camera.flyTo/flyToBoundingSphere compute the frustum from the
 * canvas's current pixel size. Right after the Viewer is constructed, the
 * Mosaic tile it lives in may not have finished measuring/laying out yet, so
 * the canvas can still be 0x0 for a frame or two -- flying the camera at that
 * moment throws "DeveloperError: Expected width to be greater than 0, actual
 * value was 0". Defer until the canvas actually has a size.
 */
function whenCanvasSized(
  viewer: Cesium.Viewer,
  cb: () => void,
  attempt = 0,
): void {
  if (viewer.isDestroyed()) return;
  if (viewer.canvas.clientWidth > 0 && viewer.canvas.clientHeight > 0) {
    cb();
    return;
  }
  if (attempt > 120) return; // ~2s at 60fps -- give up quietly rather than spin forever
  requestAnimationFrame(() => whenCanvasSized(viewer, cb, attempt + 1));
}

function setInitialViewCenteredOn(
  viewer: Cesium.Viewer,
  lat: number,
  lon: number,
  deltaDegrees: number,
): void {
  whenCanvasSized(viewer, () => {
    const is2D = viewer.scene.mode === Cesium.SceneMode.SCENE2D;

    if (is2D) {
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(
          lon - deltaDegrees,
          lat - deltaDegrees,
          lon + deltaDegrees,
          lat + deltaDegrees,
        ),
        duration: 0.8,
      });
      return;
    }

    const center = Cesium.Cartesian3.fromDegrees(lon, lat);
    const radiusMeters = deltaDegrees * 111_000;
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(center, radiusMeters), {
      duration: 0.8,
      offset: new Cesium.HeadingPitchRange(
        0,
        -Cesium.Math.toRadians(45),
        radiusMeters * 2,
      ),
    });
  });
}

function fitTrajectoryView(
  viewer: Cesium.Viewer,
  coords: Array<{ lat: number; lon: number }>,
): void {
  if (coords.length === 0) return;

  whenCanvasSized(viewer, () => {
    const positions = computeSurfacePositions(viewer, coords);
    const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
    const is2D = viewer.scene.mode === Cesium.SceneMode.SCENE2D;

    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 0.8,
      offset: is2D
        ? undefined
        : new Cesium.HeadingPitchRange(
            0,
            -Cesium.Math.toRadians(45),
            Math.max(boundingSphere.radius * 2, 1000),
          ),
    });
  });
}

function setVesselOrientation(
  entity: Cesium.Entity,
  position: Cesium.Cartesian3,
  headingDegrees: number | null | undefined,
): void {
  const degrees =
    (((headingDegrees ?? 0) + VESSEL_MODEL_HEADING_OFFSET_DEG) % 360 + 360) % 360;
  const hpr = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(degrees), 0, 0);
  const headingQuat = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
  const yRot = Cesium.Quaternion.fromAxisAngle(
    Cesium.Cartesian3.UNIT_Y,
    Cesium.Math.toRadians(VESSEL_MODEL_Y_ROTATION_DEG),
  );
  // Apply Y rotation in model space first, then world heading
  const orientation = Cesium.Quaternion.multiply(
    headingQuat,
    yRot,
    new Cesium.Quaternion(),
  );
  entity.orientation = new Cesium.ConstantProperty(orientation);
}

function syncVesselVisualMode(
  viewer: Cesium.Viewer,
  entity: Cesium.Entity,
  visible: boolean,
  vesselIconReady: boolean,
): void {
  const useModel = viewer.scene.mode !== Cesium.SceneMode.SCENE2D;

  if (entity.model) {
    entity.model.show = new Cesium.ConstantProperty(visible && useModel);
  }
  if (entity.billboard) {
    entity.billboard.show = new Cesium.ConstantProperty(
      visible && !useModel && vesselIconReady,
    );
  }
}

interface Props {
  trajectory: TrajectoryPoint[];
  fullTrajectory: TrajectoryPoint[];
  currentPoint: TrajectoryPoint | null;
  playbackSpeed: number;
  events: FocusEvent[];
  fitKey: unknown;
  eventsLoading?: boolean;
  onNavigateToEvent?: (eventId: string) => void;
}

export const FocusModeMap = ({
  trajectory,
  fullTrajectory,
  currentPoint,
  playbackSpeed,
  events,
  fitKey,
  eventsLoading = false,
  onNavigateToEvent,
}: Props) => {
  void playbackSpeed; // kept for parity with the 2D map props

  const theme = useTheme();

  const severityColorMap = useMemo(
    () => ({
      high: theme.palette.error.main,
      medium: theme.palette.warning.main,
      low: theme.palette.info.main,
    }),
    [theme],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const pathEntityRef = useRef<Cesium.Entity | null>(null);
  const currentEntityRef = useRef<Cesium.Entity | null>(null);
  const pointEntitiesRef = useRef<Cesium.Entity[]>([]);
  const pointDataRef = useRef<Record<string, TrajectoryPoint>>({});
  const eventEntitiesRef = useRef<Record<string, Cesium.Entity>>({});
  const eventDataRef = useRef<Record<string, FocusEvent>>({});
  const pointCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eventCanvasCacheRef = useRef<Record<string, HTMLCanvasElement>>({});
  const [isReady, setIsReady] = useState(false);
  const [vesselIcon, setVesselIcon] = useState<HTMLCanvasElement | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<{
    type: "point" | "event";
    data: TrajectoryPoint | FocusEvent;
    x: number;
    y: number;
  } | null>(null);
  const onNavigateToEventRef = useRef(onNavigateToEvent);
  onNavigateToEventRef.current = onNavigateToEvent;
  const selectedInfoRef = useRef<typeof selectedInfo>(null);
  selectedInfoRef.current = selectedInfo;
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const currentPointRef = useRef(currentPoint);
  currentPointRef.current = currentPoint;
  const lastFitKeyRef = useRef<unknown>(null);
  const vesselVisibleRef = useRef(false);
  const vesselIconReadyRef = useRef(false);

  const getTrajectoryCanvas = () => {
    if (!pointCanvasRef.current) {
      pointCanvasRef.current = createCircleCanvas(
        "#ff0000",
        "#ffffff",
        TRAJECTORY_POINT_RADIUS,
        TRAJECTORY_POINT_OUTLINE,
        TRAJECTORY_BILLBOARD_SIZE,
        0.85,
      );
    }
    return pointCanvasRef.current;
  };

  const getEventCanvas = (fill: string, stroke: string) => {
    if (!eventCanvasCacheRef.current[fill]) {
      eventCanvasCacheRef.current[fill] = createCircleCanvas(
        fill,
        stroke,
        EVENT_POINT_RADIUS,
        EVENT_POINT_OUTLINE,
        EVENT_BILLBOARD_SIZE,
        0.9,
      );
    }
    return eventCanvasCacheRef.current[fill];
  };

  // Initialize Cesium viewer once
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const init = async () => {
      const imageryProvider =
        await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
          { enablePickFeatures: false },
        );
      if (!mounted) return;

      const viewer = new Cesium.Viewer(containerRef.current as HTMLDivElement, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: true,
        sceneMode: Cesium.SceneMode.SCENE2D,
        timeline: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        baseLayer: new Cesium.ImageryLayer(imageryProvider),
        terrain: new Cesium.Terrain(Cesium.createWorldTerrainAsync()),
      });

      if (viewer.scene.skyBox) {
        viewer.scene.skyBox.show = false;
      }
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#0b0d17");
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.depthTestAgainstTerrain = true;

      // Leave room above the 2D/3D picker for the focus button
      const toolbar = viewer.container.querySelector(
        ".cesium-viewer-toolbar",
      ) as HTMLElement | null;
      if (toolbar) {
        toolbar.style.top = "46px";
      }

      const pathEntity = viewer.entities.add({
        polyline: {
          width: 2,
          material: ROYAL_BLUE,
          depthFailMaterial: ROYAL_BLUE,
          arcType: Cesium.ArcType.GEODESIC,
          clampToGround: false,
          positions: [],
        },
      });
      pathEntityRef.current = pathEntity;

      const currentEntity = viewer.entities.add({
        position: Cesium.Cartesian3.ZERO,
        billboard: {
          width: VESSEL_BILLBOARD_SIZE,
          height: VESSEL_BILLBOARD_SIZE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          show: false,
        },
        model: {
          uri: vesselGlbUrl,
          scale: VESSEL_MODEL_SCALE,
          minimumPixelSize: VESSEL_MODEL_MINIMUM_PIXEL_SIZE,
          maximumScale: VESSEL_MODEL_MAXIMUM_SCALE,
          heightReference: Cesium.HeightReference.NONE,
          runAnimations: false,
          show: false,
        },
      });
      currentEntityRef.current = currentEntity;

      const syncMode = () => {
        const entity = currentEntityRef.current;
        if (!entity) return;
        syncVesselVisualMode(
          viewer,
          entity,
          vesselVisibleRef.current,
          vesselIconReadyRef.current,
        );
      };

      viewer.scene.morphComplete.addEventListener(syncMode);

      // Build a canvas-based icon from the SVG so Cesium can billboard it reliably
      const size = VESSEL_BILLBOARD_SIZE;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      let iconLoaded = false;
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          if (iconLoaded || !mounted) return;
          iconLoaded = true;
          ctx.drawImage(img, 0, 0, size, size);
          setVesselIcon(canvas);
        };
        img.onerror = () => {
          if (iconLoaded || !mounted) return;
          iconLoaded = true;
          // Fallback arrow in the same sky-blue colour
          ctx.fillStyle = "#5ec8ff";
          ctx.beginPath();
          ctx.moveTo(size / 2, 2);
          ctx.lineTo(size - 2, size - 2);
          ctx.lineTo(size / 2, size - 6);
          ctx.lineTo(2, size - 2);
          ctx.closePath();
          ctx.fill();
          setVesselIcon(canvas);
        };
        img.src = skyblueArrow;
      }

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

      const handleMove = (movement: { endPosition: Cesium.Cartesian2 }) => {
        const picked = viewer.scene.pick(movement.endPosition);
        const entity = picked?.id as Cesium.Entity | undefined;
        const id = entity?.id;

        if (
          typeof id === "string" &&
          id.startsWith("point-") &&
          pointDataRef.current[id]
        ) {
          setSelectedInfo({
            type: "point",
            data: pointDataRef.current[id],
            x: movement.endPosition.x,
            y: movement.endPosition.y,
          });
          return;
        }

        if (selectedInfoRef.current?.type === "point") {
          setSelectedInfo(null);
        }
      };

      const handleClick = (event: { position: Cesium.Cartesian2 }) => {
        const picked = viewer.scene.pick(event.position);
        const entity = picked?.id as Cesium.Entity | undefined;
        const id = entity?.id;

        if (typeof id === "string" && eventDataRef.current[id]) {
          setSelectedInfo({
            type: "event",
            data: eventDataRef.current[id],
            x: event.position.x,
            y: event.position.y,
          });
          return;
        }

        setSelectedInfo(null);
      };

      handler.setInputAction(
        handleMove,
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
      );
      handler.setInputAction(
        handleClick,
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      );

      viewerRef.current = viewer;
      if (mounted) {
        setIsReady(true);
      } else {
        viewer.destroy();
      }
    };

    init();

    return () => {
      mounted = false;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      pathEntityRef.current = null;
      currentEntityRef.current = null;
      pointEntitiesRef.current = [];
      eventEntitiesRef.current = {};
      eventDataRef.current = {};
      pointDataRef.current = {};
      pointCanvasRef.current = null;
      eventCanvasCacheRef.current = {};
    };
  }, []);

  // Resize viewer when the container size changes (mosaic drag, window resize)
  useEffect(() => {
    const container = containerRef.current;
    const viewer = viewerRef.current;
    if (!container || !viewer || !isReady) return;

    const resize = () => {
      if (viewer.isDestroyed()) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      viewer.resize();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isReady]);

  // Initial view: center on events when present; otherwise fit full trajectory
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!isReady || !viewer || eventsLoading) return;
    if (lastFitKeyRef.current === fitKey) return;

    const eventView = getEventCenterView(eventsRef.current);
    if (eventView) {
      lastFitKeyRef.current = fitKey;
      viewer.camera.cancelFlight();
      setInitialViewCenteredOn(
        viewer,
        eventView.lat,
        eventView.lon,
        eventView.deltaDegrees,
      );
      return;
    }

    if (fullTrajectory.length === 0) return;

    lastFitKeyRef.current = fitKey;
    viewer.camera.cancelFlight();
    fitTrajectoryView(viewer, fullTrajectory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, isReady, eventsLoading]);

  // Update visible polyline
  useEffect(() => {
    const pathEntity = pathEntityRef.current;
    const viewer = viewerRef.current;
    if (!pathEntity || !viewer || trajectory.length < 2) {
      if (pathEntity?.polyline) {
        pathEntity.polyline.show = new Cesium.ConstantProperty(false);
      }
      return;
    }

    const polyline = pathEntity.polyline;
    if (!polyline) return;

    const positions = computeSurfacePositions(
      viewer,
      densifyPoints(trajectory, 16),
    );

    if (positions.length < 2) {
      polyline.show = new Cesium.ConstantProperty(false);
      return;
    }

    polyline.positions = new Cesium.ConstantProperty(positions);
    polyline.show = new Cesium.ConstantProperty(true);
  }, [trajectory, isReady]);

  // Update current vessel marker position, heading, and 2D/3D visual
  useEffect(() => {
    const entity = currentEntityRef.current;
    const viewer = viewerRef.current;
    if (!entity || !viewer) return;

    if (!currentPoint) {
      vesselVisibleRef.current = false;
      syncVesselVisualMode(viewer, entity, false, vesselIconReadyRef.current);
      return;
    }

    const [position] = computeSurfacePositions(viewer, [currentPoint]);
    entity.position = new Cesium.ConstantPositionProperty(position);
    setVesselOrientation(entity, position, currentPoint.heading);

    const degrees = ((currentPoint.heading ?? 0) + 360) % 360;
    if (entity.billboard) {
      entity.billboard.rotation = new Cesium.ConstantProperty(
        Cesium.Math.toRadians(-degrees),
      );
      if (vesselIcon && !entity.billboard.image) {
        entity.billboard.image = new Cesium.ConstantProperty(vesselIcon);
      }
    }

    vesselIconReadyRef.current = Boolean(vesselIcon);
    vesselVisibleRef.current = true;
    syncVesselVisualMode(viewer, entity, true, Boolean(vesselIcon));
  }, [currentPoint, vesselIcon, isReady]);

  // Render full trajectory sample points as clickable circle billboards
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    pointEntitiesRef.current.forEach((entity) =>
      viewer.entities.remove(entity),
    );
    pointEntitiesRef.current = [];
    pointDataRef.current = {};

    if (fullTrajectory.length === 0) return;

    const positions = computeSurfacePositions(viewer, fullTrajectory);
    const image = getTrajectoryCanvas();

    fullTrajectory.forEach((p, i) => {
      const id = `point-${i}-${p.timestamp}-${p.lat.toFixed(6)}-${p.lon.toFixed(6)}`;
      const entity = viewer.entities.add({
        id,
        position: positions[i],
        billboard: {
          image,
          width: TRAJECTORY_BILLBOARD_SIZE,
          height: TRAJECTORY_BILLBOARD_SIZE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      pointEntitiesRef.current.push(entity);
      pointDataRef.current[id] = p;
    });
  }, [fullTrajectory, isReady]);

  // Update event markers as clickable circle billboards
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    Object.values(eventEntitiesRef.current).forEach((e) =>
      viewer.entities.remove(e),
    );
    eventEntitiesRef.current = {};
    eventDataRef.current = {};

    const eventPoints = events
      .map((event) =>
        event.location
          ? { lat: event.location.lat, lon: event.location.lon }
          : null,
      )
      .filter((p): p is { lat: number; lon: number } => p !== null);
    const eventPositions = computeSurfacePositions(viewer, eventPoints);

    events.forEach((event, i) => {
      if (!event.location) return;
      const fill =
        (event.severity ? severityColorMap[event.severity] : undefined) ??
        theme.palette.warning.main;
      const image = getEventCanvas(fill, theme.palette.background.paper);

      const entity = viewer.entities.add({
        id: event.id,
        name: event.type,
        position: eventPositions[i],
        billboard: {
          image,
          width: EVENT_BILLBOARD_SIZE,
          height: EVENT_BILLBOARD_SIZE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      eventEntitiesRef.current[event.id] = entity;
      eventDataRef.current[event.id] = event;
    });
  }, [
    events,
    severityColorMap,
    theme.palette.warning.main,
    theme.palette.background.paper,
    isReady,
  ]);

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%", borderRadius: 8 }}
      />
      <IconButton
        onClick={() => {
          const viewer = viewerRef.current;
          const point = currentPointRef.current;
          if (!viewer || !point) return;
          setInitialViewCenteredOn(
            viewer,
            point.lat,
            point.lon,
            DEFAULT_INITIAL_VIEW_DELTA_DEGREES,
          );
        }}
        disabled={!currentPoint}
        size="small"
        title="Focus vessel"
        aria-label="Focus vessel"
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1001,
          width: 32,
          height: 32,
          borderRadius: 1,
          bgcolor: "#303336",
          color: "#ffffff",
          border: "1px solid #444",
          boxShadow: 1,
          "&:hover": { bgcolor: "#48b", color: "#ffffff" },
          "&.Mui-disabled": { bgcolor: "#303336", color: "#888", opacity: 0.7 },
        }}
      >
        <CenterFocusStrongIcon sx={{ fontSize: 22 }} />
      </IconButton>
      {selectedInfo && (
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            left: selectedInfo.x + 12,
            top: selectedInfo.y - 12,
            minWidth: 180,
            zIndex: 1000,
            p: 1.5,
            borderRadius: 1,
            pointerEvents: "auto",
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {selectedInfo.type === "point" ? (
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
                  typography: "body2",
                  color: "text.secondary",
                }}
              >
                ID: {(selectedInfo.data as FocusEvent).id || "—"}
                <br />
                Severity: {(selectedInfo.data as FocusEvent).severity ?? "—"}
                <br />
                Status: {(selectedInfo.data as FocusEvent).status ?? "—"}
                <br />
                {(selectedInfo.data as FocusEvent).timestamp && (
                  <>
                    {(
                      selectedInfo.data as FocusEvent
                    ).timestamp!.toLocaleString()}
                    <br />
                  </>
                )}
              </Box>
              <Button
                onClick={() => {
                  onNavigateToEventRef.current?.(
                    (selectedInfo.data as FocusEvent).id,
                  );
                  setSelectedInfo(null);
                }}
                sx={{
                  mt: 1,
                  p: 0,
                  justifyContent: "flex-start",
                  textTransform: "none",
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
  );
};
