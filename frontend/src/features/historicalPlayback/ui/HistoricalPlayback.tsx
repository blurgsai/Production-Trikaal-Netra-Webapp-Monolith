import { useCallback, useRef, useState, useEffect } from "react";

import { Box, Fade, Paper, Typography } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import type { PlaybackRange, TimeGranularity, PlaybackFilter } from "../model/types";
import {
  PLAYBACK_SESSION_COLORS,
  MAX_PLAYBACK_SESSIONS,
} from "../model/types";
import { usePlaybackUrlParams } from "../hooks/usePlaybackUrlParams";

import PlaybackMap from "./PlaybackMap";
import PlaybackDialog from "./PlaybackDialog";
import BufferedCanvasLayer from "./BufferedCanvasLayer";
import { PlaybackControlsProvider } from "./PlaybackControlsContext";
import PlaybackControlsStack from "./PlaybackControlsStack";

import "leaflet/dist/leaflet.css";

const DATA_START_UTC = "2024-12-04T10:35:00Z";
const DATA_END_UTC = "2024-12-04T17:50:00Z";

function toLocalDatetime(utcIso: string): string {
  const d = new Date(utcIso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface ActivePlaybackSession {
  id: string;
  useBuffering: boolean;
  playbackRange: PlaybackRange;
  granularity: TimeGranularity;
  filters: PlaybackFilter[];
  geometry: GeoJSON.Geometry;
}

export default function HistoricalPlayback() {
  const urlParams = usePlaybackUrlParams();

  const [polygon, setPolygon] = useState<
    GeoJSON.Feature | GeoJSON.Geometry | null
  >(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingSession, setAddingSession] = useState(false);

  const [playbackRange, setPlaybackRange] = useState<PlaybackRange>(() => ({
    start: urlParams.start ?? toLocalDatetime(DATA_START_UTC),
    end: urlParams.end ?? toLocalDatetime(DATA_END_UTC),
  }));

  const [filters, setFilters] = useState<PlaybackFilter[]>(() =>
    urlParams.filters,
  );

  const [granularity, setGranularity] = useState<TimeGranularity>(() =>
    urlParams.granularity ?? "hour",
  );

  const [sessions, setSessions] = useState<ActivePlaybackSession[]>([]);
  const [drawingActive, setDrawingActive] = useState(false);

  useEffect(() => {
    if (urlParams.zone) {
      setPolygon(urlParams.zone);
      setDialogOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearDrawnShapeRef = useRef<(() => void) | null>(null);
  const drawPolygonRef = useRef<(() => void) | null>(null);

  const resetDialogDefaults = useCallback(() => {
    setPlaybackRange({
      start: urlParams.start ?? toLocalDatetime(DATA_START_UTC),
      end: urlParams.end ?? toLocalDatetime(DATA_END_UTC),
    });
    setFilters([]);
    setGranularity(urlParams.granularity ?? "hour");
  }, [urlParams]);

  const handlePolygonComplete = useCallback((geoJson: GeoJSON.Feature) => {
    setPolygon(geoJson);
    setDialogOpen(true);
    setDrawingActive(false);
  }, []);

  const handlePolygonDelete = useCallback(() => {
    if (addingSession) {
      setAddingSession(false);
      setPolygon(null);
      setDialogOpen(false);
      setDrawingActive(false);
      return;
    }
    setPolygon(null);
    setDialogOpen(false);
    setDrawingActive(false);
    clearDrawnShapeRef.current?.();
  }, [addingSession]);

  const handleDrawingActive = useCallback((active: boolean) => {
    setDrawingActive(active);
  }, []);

  const handlePlay = () => {
    if (!polygon) return;

    const toUtcIso = (localDateTime: string) =>
      new Date(localDateTime).toISOString();

    const geometry =
      "geometry" in polygon ? polygon.geometry : polygon;

    const newSession: ActivePlaybackSession = {
      id: createSessionId(),
      useBuffering: true,
      playbackRange: {
        start: toUtcIso(playbackRange.start),
        end: toUtcIso(playbackRange.end),
      },
      granularity,
      filters: [...filters],
      geometry,
    };

    setSessions((prev) => [...prev, newSession]);
    setDialogOpen(false);
    setAddingSession(false);
    setPolygon(null);
    clearDrawnShapeRef.current?.();
  };

  const handleRemoveSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const resetFlow = () => {
    clearDrawnShapeRef.current?.();
    setSessions([]);
    setPolygon(null);
    setAddingSession(false);
    setDialogOpen(false);
  };

  const handleDialogClose = () => {
    if (sessions.length > 0) {
      setDialogOpen(false);
      setAddingSession(false);
      setPolygon(null);
      clearDrawnShapeRef.current?.();
      return;
    }
    resetFlow();
  };

  const handleAddSession = useCallback(() => {
    resetDialogDefaults();
    setAddingSession(true);
    setPolygon(null);
    setTimeout(() => drawPolygonRef.current?.(), 100);
  }, [resetDialogDefaults]);

  const hasSessions = sessions.length > 0;
  const showOnboarding = !hasSessions && !polygon && !drawingActive && !addingSession;
  const canAddSession = hasSessions && sessions.length < MAX_PLAYBACK_SESSIONS && !addingSession;
  const nextSessionColor =
    PLAYBACK_SESSION_COLORS[sessions.length % PLAYBACK_SESSION_COLORS.length];
  const drawColor = hasSessions
    ? nextSessionColor
    : PLAYBACK_SESSION_COLORS[0];

  return (
    <PlaybackControlsProvider
      onAddSession={handleAddSession}
      canAddSession={canAddSession}
    >
      <Box sx={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {(!hasSessions) && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: dialogOpen ? "none" : "auto",
            }}
          >
            <PlaybackMap
              onPolygonComplete={handlePolygonComplete}
              onPolygonDelete={handlePolygonDelete}
              onPolygonEdit={handlePolygonDelete}
              onClearRequest={clearDrawnShapeRef}
              onDrawPolygonRequest={drawPolygonRef}
              hideToolbar={!!polygon}
              onDrawingActive={handleDrawingActive}
              drawColor={drawColor}
            />
          </Box>
        )}

        {showOnboarding && (
          <Fade in timeout={600}>
            <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <Paper
                sx={{
                  position: "absolute",
                  top: 24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1000,
                  px: 3,
                  py: 2.5,
                  maxWidth: 480,
                  width: "90%",
                  borderRadius: 3,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  boxShadow: (theme) => theme.shadows[8],
                  pointerEvents: "auto",
                }}
              >
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, color: "text.primary" }}>
                  Historical Playback
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  Replay vessel movement inside a selected area over time.
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "primary.soft",
                        color: "primary.main",
                      }}
                    >
                      <MapIcon fontSize="small" />
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Draw a polygon on the map using the toolbar on the top-right
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "primary.soft",
                        color: "primary.main",
                      }}
                    >
                      <PlayArrowRoundedIcon fontSize="small" />
                    </Box>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Choose a time range and granularity, then press Play
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper
                onClick={() => drawPolygonRef.current?.()}
                sx={{
                  position: "absolute",
                  top: 24,
                  right: 88,
                  zIndex: 1000,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 4,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  boxShadow: (theme) => theme.shadows[8],
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  pointerEvents: "auto",
                  cursor: "pointer",
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1, transform: "scale(1)" },
                      "50%": { opacity: 0.5, transform: "scale(1.2)" },
                      "100%": { opacity: 1, transform: "scale(1)" },
                    },
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Click to draw area
                </Typography>
              </Paper>
            </Box>
          </Fade>
        )}

        {hasSessions && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: dialogOpen ? "none" : "auto",
            }}
          >
            <PlaybackMap
              onPolygonComplete={addingSession ? handlePolygonComplete : () => {}}
              onPolygonDelete={addingSession ? handlePolygonDelete : undefined}
              onClearRequest={clearDrawnShapeRef}
              onDrawPolygonRequest={drawPolygonRef}
              hideToolbar={!addingSession}
              onDrawingActive={handleDrawingActive}
              drawColor={drawColor}
            >
              {sessions.map((session, index) => (
                <BufferedCanvasLayer
                  key={session.id}
                  sessionId={session.id}
                  sessionColor={PLAYBACK_SESSION_COLORS[index % PLAYBACK_SESSION_COLORS.length]}
                  sessionIndex={index}
                  playbackRange={session.playbackRange}
                  geometry={session.geometry}
                  filters={session.filters}
                  granularity={session.granularity}
                  onClosePlayback={() => handleRemoveSession(session.id)}
                />
              ))}
            </PlaybackMap>
          </Box>
        )}

        {addingSession && hasSessions && !dialogOpen && (
          <Paper
            onClick={() => drawPolygonRef.current?.()}
            sx={{
              position: "absolute",
              top: 24,
              right: 88,
              zIndex: 1000,
              px: 1.5,
              py: 0.75,
              borderRadius: 4,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              boxShadow: (theme) => theme.shadows[8],
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: nextSessionColor,
                animation: "pulse 2s infinite",
                "@keyframes pulse": {
                  "0%": { opacity: 1, transform: "scale(1)" },
                  "50%": { opacity: 0.5, transform: "scale(1.2)" },
                  "100%": { opacity: 1, transform: "scale(1)" },
                },
              }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, whiteSpace: "nowrap" }}>
              Draw area for playback {sessions.length + 1}
            </Typography>
          </Paper>
        )}

        {hasSessions && !dialogOpen && <PlaybackControlsStack />}
      </Box>

      <PlaybackDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        playbackRange={playbackRange}
        setPlaybackRange={setPlaybackRange}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onApply={handlePlay}
        polygon={polygon}
        filters={filters}
        onFiltersChange={setFilters}
        isPlaying={hasSessions && !addingSession}
      />
    </PlaybackControlsProvider>
  );
}