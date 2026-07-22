import { useEffect } from "react";
import type { Dayjs } from "dayjs";
import {
  Box,
  Alert,
  Snackbar,
  Button,
  Fade,
  IconButton,
  Typography,
} from "@mui/material";
import {
  Edit as EditIcon,
  Timeline as TimelineIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Mosaic, MosaicWindow, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import "@/shared/ui/mosaic/mosaic.css";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useLocalStorage } from "@/shared";
import { FocusModeMap } from "./FocusModeMap";
import { FocusPlaybackControls } from "./FocusPlaybackControls";
import { FocusEventList } from "./FocusEventList";
import { FocusEventPlaybackTile } from "./FocusEventPlaybackTile";
import { FocusModeNavbar } from "./FocusModeNavbar";
import { VesselPickerDialog } from "./VesselPickerDialog";
import { VesselSearchForm } from "./VesselSearchForm";
import {
  buildFocusMosaicLayout,
  DEFAULT_FOCUS_MOSAIC_LAYOUT,
  DEFAULT_FOCUS_TILES,
  getFocusTileTitle,
  type FocusMosaicTile,
  type FocusToggleTile,
} from "../model/mosaic";
import type { TrajectoryPoint, FocusEvent, Vessel } from "../model/types";

interface Playback {
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  seek: (i: number) => void;
  setSpeed: (s: number) => void;
  togglePlay: () => void;
}

export interface FocusModeViewProps {
  mmsiInput: string;
  formStart: Dayjs;
  formEnd: Dayjs;
  onMmsiChange: (v: string) => void;
  onStartChange: (v: Dayjs) => void;
  onEndChange: (v: Dayjs) => void;
  onSearch: () => void;
  isLoaded: boolean;
  isLoading: boolean;
  activeLabel: string;
  onChangeVessel: () => void;
  trajectory: TrajectoryPoint[];
  visibleTrajectory: TrajectoryPoint[];
  currentPoint: TrajectoryPoint | null;
  playback: Playback;
  visibleEvents: FocusEvent[];
  selectedEventId: string | null;
  playbackEvent: FocusEvent | null;
  eventsLoading: boolean;
  onSelectEvent: (event: FocusEvent) => void;
  onClosePlayback: () => void;
  startTime: number | null;
  endTime: number | null;
  onApplyTimeRange: (start: number, end: number) => void;
  fitKey: string | undefined;
  onNavigateToEvent: (eventId: string) => void;
  dialogOpen: boolean;
  dialogVessels: Vessel[];
  onSelectVessel: (vessel: Vessel) => void;
  onDialogClose: () => void;
  snackbar: { open: boolean; message: string; error: boolean };
  onSnackbarClose: () => void;
}

export const FocusModeView = ({
  mmsiInput,
  formStart,
  formEnd,
  onMmsiChange,
  onStartChange,
  onEndChange,
  onSearch,
  isLoaded,
  isLoading,
  activeLabel,
  onChangeVessel,
  trajectory,
  visibleTrajectory,
  currentPoint,
  playback,
  visibleEvents,
  selectedEventId,
  playbackEvent,
  eventsLoading,
  onSelectEvent,
  onClosePlayback,
  startTime,
  endTime,
  onApplyTimeRange,
  fitKey,
  onNavigateToEvent,
  dialogOpen,
  dialogVessels,
  onSelectVessel,
  onDialogClose,
  snackbar,
  onSnackbarClose,
}: FocusModeViewProps) => {
  const [visibleTiles, setVisibleTiles] = useLocalStorage<FocusToggleTile[]>(
    "trikaal_focus_mosaic_tiles",
    DEFAULT_FOCUS_TILES,
  );
  const [mosaicLayout, setMosaicLayout] = useLocalStorage<
    MosaicNode<FocusMosaicTile>
  >("trikaal_focus_mosaic_layout", DEFAULT_FOCUS_MOSAIC_LAYOUT);

  useEffect(() => {
    if (visibleTiles.length === 0) return
    setMosaicLayout(buildFocusMosaicLayout(visibleTiles, playbackEvent))
  }, [visibleTiles, playbackEvent, setMosaicLayout])

  const renderMapTile = () => (
    <Box sx={{ position: "relative", height: "100%", width: "100%" }}>
      <FocusModeMap
        trajectory={visibleTrajectory}
        fullTrajectory={trajectory}
        currentPoint={currentPoint}
        playbackSpeed={playback.playbackSpeed}
        events={visibleEvents}
        fitKey={fitKey}
        eventsLoading={eventsLoading}
        onNavigateToEvent={onNavigateToEvent}
      />
      {trajectory.length === 0 && (
        <Fade in>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              bgcolor: (theme) => theme.palette.background.paper,
              opacity: 0.95,
              zIndex: 1300,
              textAlign: "center",
              p: 4,
            }}
          >
            <TimelineIcon sx={{ fontSize: 48, color: "text.secondary" }} />
            <Typography variant="h6" fontWeight={600}>
              No trajectory data available
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth={400}>
              We could not find any trajectory points for the selected vessel
              and time range. Try a different MMSI or broaden the time range.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onChangeVessel}
              startIcon={<EditIcon />}
            >
              Change Vessel
            </Button>
          </Box>
        </Fade>
      )}
      {trajectory.length > 0 && (
        <FocusPlaybackControls
          trajectory={trajectory}
          events={visibleEvents}
          currentIndex={playback.currentIndex}
          isPlaying={playback.isPlaying}
          playbackSpeed={playback.playbackSpeed}
          onPlayPause={playback.togglePlay}
          onSeek={playback.seek}
          onSpeedChange={playback.setSpeed}
          startTime={startTime}
          endTime={endTime}
          onApplyTimeRange={onApplyTimeRange}
        />
      )}
    </Box>
  );

  const renderTile = (id: FocusMosaicTile, path: number[]) => (
    <MosaicWindow<FocusMosaicTile>
      path={path}
      title={getFocusTileTitle(id)}
      createNode={() => id}
      toolbarControls={
        id === "eventPlayback" ? (
          <IconButton
            size="small"
            onClick={onClosePlayback}
            aria-label="close-event-playback"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : (
          <div />
        )
      }
    >
      {id === "map" && renderMapTile()}
      {id === "events" && (
        <FocusEventList
          events={visibleEvents}
          vesselLabel={activeLabel}
          selectedEventId={selectedEventId}
          loading={eventsLoading}
          onSelectEvent={onSelectEvent}
        />
      )}
      {id === "eventPlayback" && playbackEvent && (
        <FocusEventPlaybackTile
          event={playbackEvent}
          vesselLabel={activeLabel}
        />
      )}
    </MosaicWindow>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DndProvider backend={HTML5Backend}>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <FocusModeNavbar
            isLoaded={isLoaded}
            activeLabel={activeLabel}
            visibleTiles={visibleTiles}
            onVisibleTilesChange={setVisibleTiles}
            onChangeVessel={onChangeVessel}
          />

          {!isLoaded && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
              }}
            >
              <Box
                sx={{
                  p: 4,
                  borderRadius: 3,
                  width: "100%",
                  maxWidth: 540,
                  bgcolor: "background.paper",
                  boxShadow: 4,
                }}
              >
                <VesselSearchForm
                  mmsi={mmsiInput}
                  formStart={formStart}
                  formEnd={formEnd}
                  loading={isLoading}
                  onMmsiChange={onMmsiChange}
                  onStartChange={onStartChange}
                  onEndChange={onEndChange}
                  onSearch={onSearch}
                />
              </Box>
            </Box>
          )}

          {isLoaded && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                height: "100%",
                position: "relative",
                overflow: "hidden",
              }}
              className="mosaic-blueprint-theme"
            >
              <Mosaic<FocusMosaicTile>
                renderTile={renderTile}
                value={mosaicLayout}
                onChange={(node) => node && setMosaicLayout(node)}
              />
            </Box>
          )}

          <VesselPickerDialog
            open={dialogOpen}
            mmsi={mmsiInput}
            vessels={dialogVessels}
            onSelect={onSelectVessel}
            onClose={onDialogClose}
          />

          <Snackbar
            open={snackbar.open}
            autoHideDuration={5000}
            onClose={onSnackbarClose}
          >
            <Alert
              severity={snackbar.error ? "error" : "success"}
              sx={{ width: "100%" }}
              onClose={onSnackbarClose}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </DndProvider>
    </LocalizationProvider>
  );
};
