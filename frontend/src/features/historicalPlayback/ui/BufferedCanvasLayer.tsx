import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  Paper,
  Typography,
  CircularProgress,
  alpha,
  Snackbar,
  Alert,
} from "@mui/material";
import { usePlaybackControlsOptional } from "./usePlaybackControls";
import { usePlaybackBuffer } from "../hooks/usePlaybackBuffer";
import type {
  PlaybackChunk,
  PlaybackPoint,
  PlaybackRange,
  AnimationVessel as Vessel,
  TimeGranularity,
  PlaybackFilter,
  LabelVisibility,
} from "../model/types";
import {
  mergeMinuteData,
  advanceVessel,
  tickVessel,
  computeEaseFactor,
  seekVessel,
} from "../model/animationUtils";
import { GRANULARITY_SECONDS, DEFAULT_LABEL_VISIBILITY } from "../model/types";
import { useTheme } from "@mui/material/styles";

const GRANULARITY_TIME_MULTIPLIER: Record<TimeGranularity, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

export type PlaybackGeometry = GeoJSON.Geometry;

type VesselMap = Record<string, PlaybackPoint[]>;

export interface BufferedCanvasLayerProps {
  sessionId: string;
  sessionColor: string;
  sessionIndex: number;
  playbackRange: PlaybackRange;
  onClosePlayback: () => void;
  geometry: PlaybackGeometry;
  filters: PlaybackFilter[];
  granularity: TimeGranularity;
}

interface CanvasOverlayLayer extends L.Layer {
  _canvas?: HTMLCanvasElement;
  _render?: () => void;
}

export default function BufferedCanvasLayer({
  sessionId,
  sessionColor,
  sessionIndex,
  playbackRange,
  onClosePlayback,
  geometry,
  filters,
  granularity,
}: BufferedCanvasLayerProps) {
  const map = useMap();
  const theme = useTheme();
  const controlsCtx = usePlaybackControlsOptional();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerRef = useRef<CanvasOverlayLayer | null>(null);
  const animationRef = useRef<number | null>(null);
  const vesselsRef = useRef<Vessel[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const currentTimeRef = useRef<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [displayChunk, setDisplayChunk] = useState<number>(0);
  const [errorDismissed, setErrorDismissed] = useState<boolean>(false);
  const [labelVisibility, setLabelVisibility] = useState<LabelVisibility>(
    DEFAULT_LABEL_VISIBILITY,
  );
  const labelVisibilityRef = useRef<LabelVisibility>(DEFAULT_LABEL_VISIBILITY);

  const startTimeRef = useRef<number>(Date.now());
  const baseElapsedRef = useRef<number>(0);
  const globalStartTsRef = useRef<number>(0);

  const {
    bufferManager,
    isBuffering,
    bufferError,
    initializeBuffer,
    clearBuffer,
  } = usePlaybackBuffer();

  useEffect(() => {
    if (bufferError) setErrorDismissed(false);
  }, [bufferError]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lv = labelVisibilityRef.current;

    if (lv.tracks) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      vesselsRef.current.forEach((v) => {
        if (!v.currentPos?.lat || v.points.length < 1) return;

        ctx.strokeStyle = v.color;
        ctx.beginPath();

        const firstPt = map.latLngToContainerPoint([
          v.points[0].lat,
          v.points[0].lng,
        ]);
        ctx.moveTo(firstPt.x, firstPt.y);

        for (let i = 1; i <= v.index; i++) {
          const pt = map.latLngToContainerPoint([
            v.points[i].lat,
            v.points[i].lng,
          ]);
          ctx.lineTo(pt.x, pt.y);
        }

        const currentPt = map.latLngToContainerPoint([
          v.currentPos.lat,
          v.currentPos.lng,
        ]);
        ctx.lineTo(currentPt.x, currentPt.y);
        ctx.stroke();
      });
      ctx.restore();
    }

    vesselsRef.current.forEach((v) => {
      if (!v.currentPos || !v.currentPos.lat) return;
      const pt = map.latLngToContainerPoint([
        v.currentPos.lat,
        v.currentPos.lng,
      ]);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(((v.currentPos.heading - 90) * Math.PI) / 180);
      ctx.fillStyle = v.color;
      ctx.strokeStyle = theme.palette.text.primary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(-7, 10);
      ctx.lineTo(0, 6);
      ctx.lineTo(7, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const labelLines: string[] = [];
      if (lv.names) labelLines.push(v.vesselId);
      if (lv.heading)
        labelLines.push(
          `${Math.round(v.currentPos.heading).toString().padStart(3, "0")}°`,
        );
      if (lv.speed) {
        const spd = v.points[v.index]?.speed ?? 0;
        labelLines.push(`${spd.toFixed(1)} kn`);
      }
      if (lv.latlon) {
        labelLines.push(
          `${v.currentPos.lat.toFixed(2)} / ${v.currentPos.lng.toFixed(2)}`,
        );
      }

      if (labelLines.length > 0) {
        ctx.save();
        ctx.font = "11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = theme.palette.text.primary;
        ctx.strokeStyle = alpha(theme.palette.background.paper, 0.45);
        ctx.lineWidth = 3;
        labelLines.forEach((line, i) => {
          const y = pt.y + 10 + i * 13;
          ctx.strokeText(line, pt.x, y);
          ctx.fillText(line, pt.x, y);
        });
        ctx.restore();
      }
    });
  }, [map, theme]);

  useEffect(() => {
    labelVisibilityRef.current = labelVisibility;
    draw();
  }, [labelVisibility, draw]);

  useEffect(() => {
    if (!visible) return;

    const run = () => {
      const now = Date.now();
      let totalElapsedMs = baseElapsedRef.current;

      if (isPlaying) {
        totalElapsedMs +=
          (now - startTimeRef.current) *
          playbackSpeed *
          GRANULARITY_TIME_MULTIPLIER[granularity];
      }

      const logicalGlobalMs = globalStartTsRef.current + totalElapsedMs;
      const timeSec = totalElapsedMs / 1000;
      currentTimeRef.current = timeSec;

      setCurrentTime((prev) =>
        Math.abs(prev - timeSec) > 0.1 ? timeSec : prev,
      );

      const chunkIdx = Math.min(
        Math.floor(timeSec / GRANULARITY_SECONDS[granularity]),
        Math.max(totalChunks - 1, 0),
      );
      setDisplayChunk((prev) => (prev !== chunkIdx ? chunkIdx : prev));

      if (timeSec >= duration) {
        setIsPlaying(false);
      }

      const easeFactor = computeEaseFactor(playbackSpeed);

      vesselsRef.current.forEach((v) => {
        advanceVessel(v, logicalGlobalMs);
        tickVessel(v, easeFactor);
      });

      draw();
      animationRef.current = requestAnimationFrame(run);
    };

    animationRef.current = requestAnimationFrame(run);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    visible,
    isPlaying,
    playbackSpeed,
    duration,
    draw,
    granularity,
    totalChunks,
  ]);

  useEffect(() => {
    if (!playbackRange.start || !geometry) return;

    const manager = initializeBuffer(
      playbackRange.start,
      playbackRange.end,
      geometry,
      granularity,
      filters,
    );

    globalStartTsRef.current = new Date(playbackRange.start).getTime();
    const durationMs =
      new Date(playbackRange.end).getTime() - globalStartTsRef.current;
    setDuration(durationMs / 1000);

    const chunkSeconds = GRANULARITY_SECONDS[granularity];
    const chunks = Math.ceil(durationMs / 1000 / chunkSeconds);
    setTotalChunks(chunks);

    const loadAllChunks = async () => {
      const promises: Promise<PlaybackChunk>[] = [];
      for (let c = 0; c < chunks; c++) {
        promises.push(manager.getChunkData(c));
      }
      const results = await Promise.allSettled(promises);

      let allVessels: Vessel[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          const vesselData: VesselMap = result.value.vessels || {};
          allVessels = mergeMinuteData(allVessels, vesselData, sessionColor);
        }
      }

      vesselsRef.current = allVessels;
      setupCanvasLayer();
      setVisible(true);

      setTimeout(() => {
        setIsPlaying(true);
        startTimeRef.current = Date.now();
      }, 100);
    };

    loadAllChunks().catch(() => {});

    return () => {
      clearBuffer();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackRange, geometry, filters, granularity, sessionColor]);

  const setupCanvasLayer = useCallback(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const CanvasOverlay = L.Layer.extend({
      onAdd(mapInstance: L.Map) {
        this._canvas = L.DomUtil.create(
          "canvas",
          "leaflet-zoom-animated",
        ) as HTMLCanvasElement;
        const size = mapInstance.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        canvasRef.current = this._canvas;
        mapInstance.getPanes().overlayPane.appendChild(this._canvas);
        mapInstance.on("move zoom resize", this._render, this);
        this._render();
      },
      onRemove(mapInstance: L.Map) {
        mapInstance.off("move zoom resize", this._render, this);
        if (this._canvas && this._canvas.parentNode) {
          this._canvas.parentNode.removeChild(this._canvas);
        }
      },
      _render(this: CanvasOverlayLayer) {
        const topLeft = map.containerPointToLayerPoint([0, 0]);
        if (this._canvas) {
          L.DomUtil.setPosition(this._canvas, topLeft);
        }
        draw();
      },
    });

    layerRef.current = new CanvasOverlay() as CanvasOverlayLayer;
    layerRef.current.addTo(map);
  }, [map, draw]);

  const cleanup = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
  }, [map]);

  const handleTogglePlay = () => {
    const now = Date.now();
    if (isPlaying) {
      const sessionElapsed =
        (now - startTimeRef.current) *
        playbackSpeed *
        GRANULARITY_TIME_MULTIPLIER[granularity];
      baseElapsedRef.current += sessionElapsed;
      setIsPlaying(false);
    } else {
      startTimeRef.current = now;
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    const now = Date.now();
    const sessionElapsed =
      (now - startTimeRef.current) *
      playbackSpeed *
      GRANULARITY_TIME_MULTIPLIER[granularity];
    baseElapsedRef.current += sessionElapsed;
    startTimeRef.current = now;
    setPlaybackSpeed(newSpeed);
  };

  const handleSeek = async (t: number) => {
    map.dragging.enable();
    const wasPlaying = isPlaying;
    setIsPlaying(false);

    baseElapsedRef.current = t * 1000;
    startTimeRef.current = Date.now();
    const logicalGlobalMs = globalStartTsRef.current + t * 1000;

    const chunkIdx = Math.min(
      Math.floor(t / GRANULARITY_SECONDS[granularity]),
      Math.max(totalChunks - 1, 0),
    );
    setDisplayChunk(chunkIdx);

    // Preload chunks around the seek position
    if (bufferManager) {
      const chunkOffset = bufferManager.getChunkOffset(t);
      bufferManager.getChunkData(chunkOffset).catch(() => {});
    }

    vesselsRef.current.forEach((v) => {
      seekVessel(v, logicalGlobalMs);
    });

    currentTimeRef.current = t;
    setCurrentTime(t);
    draw();

    if (wasPlaying) {
      setTimeout(() => {
        setIsPlaying(true);
        startTimeRef.current = Date.now();
      }, 100);
    }
  };

  const handleClose = useCallback(() => {
    cleanup();
    clearBuffer();
    onClosePlayback();
  }, [cleanup, clearBuffer, onClosePlayback]);

  const handlersRef = useRef({
    onPlayPause: handleTogglePlay,
    onSeek: handleSeek,
    onSpeedChange: handleSpeedChange,
    onClose: handleClose,
    onSliderDragStart: () => map.dragging.disable(),
  });
  handlersRef.current = {
    onPlayPause: handleTogglePlay,
    onSeek: handleSeek,
    onSpeedChange: handleSpeedChange,
    onClose: handleClose,
    onSliderDragStart: () => map.dragging.disable(),
  };

  const handleLabelVisibilityChange = useCallback(
    (v: LabelVisibility) => {
      labelVisibilityRef.current = v;
      setLabelVisibility(v);
      draw();
    },
    [draw],
  );

  const stableHandlers = useRef({
    onPlayPause: () => handlersRef.current.onPlayPause(),
    onSeek: (t: number) => handlersRef.current.onSeek(t),
    onSpeedChange: (s: number) => handlersRef.current.onSpeedChange(s),
    onClose: () => handlersRef.current.onClose(),
    onLabelVisibilityChange: (v: LabelVisibility) =>
      handleLabelVisibilityChange(v),
    onSliderDragStart: () => handlersRef.current.onSliderDragStart(),
  });
  stableHandlers.current.onLabelVisibilityChange = handleLabelVisibilityChange;

  const controlsCtxRef = useRef(controlsCtx);
  controlsCtxRef.current = controlsCtx;

  useEffect(() => {
    controlsCtxRef.current?.registerSession({
      sessionId,
      sessionColor,
      visible,
      isPlaying,
      currentTime,
      duration,
      playbackSpeed,
      startTime: playbackRange.start,
      isBuffering,
      labelVisibility,
      ...stableHandlers.current,
    });
  }, [
    sessionId,
    sessionColor,
    visible,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    isBuffering,
    labelVisibility,
    playbackRange.start,
  ]);

  useEffect(() => {
    return () => controlsCtxRef.current?.unregisterSession(sessionId);
  }, [sessionId]);

  const controlsStackHeight =
    Math.min(controlsCtx?.sessions.filter((s) => s.visible).length ?? 1, 2) *
    68;

  return (
    <>
      {isBuffering && (
        <Paper
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
            border: 1,
            borderColor: "divider",
            boxShadow: 8,
          }}
        >
          <CircularProgress size={16} thickness={4} color="primary" />
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            Loading vessel data…
          </Typography>
        </Paper>
      )}

      {visible && totalChunks > 0 && sessionIndex === 0 && (
        <Paper
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          sx={{
            position: "absolute",
            bottom: controlsStackHeight + 16,
            left: 16,
            zIndex: 1000,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
            border: 1,
            borderColor: "divider",
            boxShadow: 8,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 600 }}
          >
            Timeframe {displayChunk + 1} of {totalChunks}
          </Typography>
        </Paper>
      )}

      <Snackbar
        open={!!bufferError && !errorDismissed}
        autoHideDuration={8000}
        onClose={() => setErrorDismissed(true)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={() => setErrorDismissed(true)}
          sx={{ width: "100%" }}
        >
          {bufferError?.message ||
            "Failed to load playback data. Close and try again."}
        </Alert>
      </Snackbar>
    </>
  );
}
