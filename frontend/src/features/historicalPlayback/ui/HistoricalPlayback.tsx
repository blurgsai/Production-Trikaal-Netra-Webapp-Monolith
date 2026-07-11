import { useCallback, useRef, useState } from "react";

import { Box, Fade, Paper, Typography } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import type { PlaybackRange, TimeGranularity } from "../model/types";

import PlaybackMap from "./PlaybackMap";
import PlaybackDialog from "./PlaybackDialog";
import BufferedCanvasLayer from "./BufferedCanvasLayer";

import "leaflet/dist/leaflet.css";

const DATA_START_UTC = "2024-12-04T16:00:00Z";
const DATA_END_UTC = "2024-12-11T16:00:00Z";

function toLocalDatetime(utcIso: string): string {
  const d = new Date(utcIso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

interface PlaybackSession {
  useBuffering: boolean;
  playbackRange: PlaybackRange;
  granularity: TimeGranularity;
}

export default function HistoricalPlayback() {
  const [polygon, setPolygon] = useState<
    GeoJSON.Feature | GeoJSON.Geometry | null
  >(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [playbackRange, setPlaybackRange] = useState<PlaybackRange>({
    start: toLocalDatetime(DATA_START_UTC),
    end: toLocalDatetime(DATA_END_UTC),
  });

  const [filters] = useState<Record<string, unknown>>({});

  const [granularity, setGranularity] = useState<TimeGranularity>("day");

  const [vesselsData, setVesselsData] = useState<PlaybackSession | null>(null);
  const [drawingActive, setDrawingActive] = useState(false);

  const clearDrawnShapeRef = useRef<(() => void) | null>(null);
  const drawPolygonRef = useRef<(() => void) | null>(null);

  const handlePolygonComplete = useCallback((geoJson: GeoJSON.Feature) => {
    setPolygon(geoJson);
    setDialogOpen(true);
    setDrawingActive(false);
  }, []);

  const handlePolygonDelete = useCallback(() => {
    setPolygon(null);
    setVesselsData(null);
    setDialogOpen(false);
    setDrawingActive(false);
    clearDrawnShapeRef.current?.();
  }, []);

  const handleDrawingActive = useCallback((active: boolean) => {
    setDrawingActive(active);
  }, []);

  const handlePlay = () => {
    if (!polygon) return;

    const toUtcIso = (localDateTime: string) =>
      new Date(localDateTime).toISOString();

    setVesselsData({
      useBuffering: true,
      playbackRange: {
        start: toUtcIso(playbackRange.start),
        end: toUtcIso(playbackRange.end),
      },
      granularity,
    });

    setDialogOpen(false);
    clearDrawnShapeRef.current?.();
  };

  const resetFlow = () => {
    clearDrawnShapeRef.current?.();
  };

  const showOnboarding = !vesselsData && !polygon && !drawingActive;

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
      {!vesselsData && (
        <PlaybackMap
          onPolygonComplete={handlePolygonComplete}
          onPolygonDelete={handlePolygonDelete}
          onPolygonEdit={handlePolygonDelete}
          onClearRequest={clearDrawnShapeRef}
          onDrawPolygonRequest={drawPolygonRef}
          hideToolbar={!!polygon}
          onDrawingActive={handleDrawingActive}
        />
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
            onClick={() => {
              drawPolygonRef.current?.();
            }}
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

      <PlaybackDialog
        open={dialogOpen}
        onClose={resetFlow}
        playbackRange={playbackRange}
        setPlaybackRange={setPlaybackRange}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onApply={handlePlay}
        polygon={polygon}
      />

      {vesselsData?.useBuffering && vesselsData.playbackRange && polygon && (
        <PlaybackMap
          onPolygonComplete={() => {}}
          onClearRequest={clearDrawnShapeRef}
          hideToolbar
        >
          <BufferedCanvasLayer
            playbackRange={vesselsData.playbackRange}
            geometry={"geometry" in polygon ? polygon.geometry : polygon}
            filters={filters}
            granularity={vesselsData.granularity}
            onClosePlayback={resetFlow}
          />
        </PlaybackMap>
      )}
    </Box>
  );
}
