import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { Paper, Typography, CircularProgress, alpha, Snackbar, Alert } from "@mui/material";
import AnimationControls from "./AnimationControls";
import { usePlaybackBuffer } from "../hooks/usePlaybackBuffer";
import type { PlaybackChunk, PlaybackPoint, PlaybackRange, AnimationVessel as Vessel, TimeGranularity } from "../model/types";
import {
  mergeMinuteData,
  advanceVessel,
  tickVessel,
  computeEaseFactor,
  seekVessel,
} from "../model/animationUtils";
import { GRANULARITY_SECONDS } from "../model/types";
import { useTheme } from "@mui/material/styles";

const GRANULARITY_TIME_MULTIPLIER: Record<TimeGranularity, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

export type PlaybackGeometry = GeoJSON.Geometry;
export type PlaybackFilters = Record<string, unknown>;

type VesselMap = Record<string, PlaybackPoint[]>;

export interface BufferedCanvasLayerProps {
  playbackRange: PlaybackRange;
  onClosePlayback: () => void;
  geometry: PlaybackGeometry;
  filters: PlaybackFilters;
  granularity: TimeGranularity;
}

interface CanvasOverlayLayer extends L.Layer {
  _canvas?: HTMLCanvasElement;
  _render?: () => void;
}

export default function BufferedCanvasLayer({
  playbackRange,
  onClosePlayback,
  geometry,
  filters,
  granularity,
}: BufferedCanvasLayerProps) {
  const map = useMap();
  const theme = useTheme();
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
  const [errorDismissed, setErrorDismissed] = useState<boolean>(false);

  const startTimeRef = useRef<number>(Date.now());
  const baseElapsedRef = useRef<number>(0);
  const globalStartTsRef = useRef<number>(0);

  const {
    bufferManager,
    currentChunk,
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

      ctx.save();
      ctx.font = "11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = theme.palette.text.primary;
      ctx.strokeStyle = alpha(theme.palette.background.paper, 0.45);
      ctx.lineWidth = 3;
      ctx.strokeText(v.vesselId, pt.x, pt.y + 10);
      ctx.fillText(v.vesselId, pt.x, pt.y + 10);
      ctx.restore();
    });

  }, [map, theme]);


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
  }, [visible, isPlaying, playbackSpeed, duration, draw, granularity]);

  useEffect(() => {
    if (!playbackRange.start || !geometry) return;

    const manager = initializeBuffer(playbackRange.start, geometry, filters, granularity);

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
          allVessels = mergeMinuteData(allVessels, vesselData);
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
  }, [playbackRange, geometry, filters, granularity]);

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
    const wasPlaying = isPlaying;
    setIsPlaying(false);

    baseElapsedRef.current = t * 1000;
    startTimeRef.current = Date.now();
    const logicalGlobalMs = globalStartTsRef.current + t * 1000;

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

  return (
    <>
      <AnimationControls
        visible={visible}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        onPlayPause={handleTogglePlay}
        onSeek={handleSeek}
        onClose={() => {
          cleanup();
          clearBuffer();
          onClosePlayback();
        }}
        startTime={playbackRange.start}
        isBuffering={isBuffering}
      />

      {isBuffering && (
        <Paper
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 3000,
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
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
            Loading vessel data…
          </Typography>
        </Paper>
      )}

      {visible && totalChunks > 0 && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 120,
            left: 16,
            zIndex: 3000,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.9),
            border: 1,
            borderColor: "divider",
            boxShadow: 8,
          }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            Timeframe {currentChunk + 1} of {totalChunks}
          </Typography>
        </Paper>
      )}

      <Snackbar
        open={!!bufferError && !errorDismissed}
        autoHideDuration={8000}
        onClose={() => setErrorDismissed(true)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErrorDismissed(true)} sx={{ width: "100%" }}>
          {bufferError?.message || "Failed to load playback data. Close and try again."}
        </Alert>
      </Snackbar>
    </>
  );
}
