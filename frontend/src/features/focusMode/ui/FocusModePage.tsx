import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Box } from "@mui/material";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVesselsByMmsi } from "../hooks/useVesselsByMmsi";
import { useVesselTrajectory } from "../hooks/useVesselTrajectory";
import { useVesselEvents } from "../hooks/useVesselEvents";
import { useFocusModePlayback } from "../hooks/useFocusModePlayback";
import { FocusModeView } from "./FocusModeView";
import type { Vessel, FocusEvent } from "../model/types";

const DIRECT_ENTRY_MMSI = "366168522";
// Padded a day either side of the seeded demo voyage's actual window
// (2026-07-14T02:00:30Z -> 2026-07-17T04:16:30Z) to absorb local-timezone
// parsing here, since dayjs("...") without a "Z" suffix parses as local time.
const DIRECT_ENTRY_START = dayjs("2026-07-13T00:00");
const DIRECT_ENTRY_END = dayjs("2026-07-18T00:00");

const getMapEntryTimeRange = () => ({
  start: dayjs().subtract(7, "day"),
  end: dayjs(),
});

const parseUnixParam = (value: string | null): dayjs.Dayjs | null => {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return dayjs.unix(n);
};

const resolveInitialTimeRange = (
  vesselId: string | null,
  startParam: string | null,
  endParam: string | null,
) => {
  const start = parseUnixParam(startParam);
  const end = parseUnixParam(endParam);
  if (start && end && start.isBefore(end)) {
    return { start, end };
  }
  // Legacy deep-link with vesselId but no times → treat as map entry
  if (vesselId) {
    return getMapEntryTimeRange();
  }
  return { start: DIRECT_ENTRY_START, end: DIRECT_ENTRY_END };
};

export const FocusModePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const vesselIdFromUrl = searchParams.get("vesselId")?.trim() || null;
  const initialRange = resolveInitialTimeRange(
    vesselIdFromUrl,
    searchParams.get("start"),
    searchParams.get("end"),
  );

  const [mmsiInput, setMmsiInput] = useState(DIRECT_ENTRY_MMSI);
  const [formStart, setFormStart] = useState<dayjs.Dayjs | null>(
    initialRange.start,
  );
  const [formEnd, setFormEnd] = useState<dayjs.Dayjs | null>(initialRange.end);

  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    error: false,
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("");
  const pendingUrlEntry = useRef(!!vesselIdFromUrl);

  const mmsiNumber = mmsiInput.trim() ? Number(mmsiInput) : null;
  const vesselsQuery = useVesselsByMmsi(mmsiNumber);

  const trajectoryQuery = useVesselTrajectory(
    selectedVessel?.id ?? null,
    startTime,
    endTime,
  );

  const eventsQuery = useVesselEvents(
    selectedVessel?.id ?? null,
    startTime,
    endTime,
  );

  const trajectory = useMemo(
    () => trajectoryQuery.data?.points ?? [],
    [trajectoryQuery.data],
  );

  const playback = useFocusModePlayback(trajectory, selectedVessel?.id);

  const currentPoint = trajectory[playback.currentIndex] ?? null;

  const visibleTrajectory = useMemo(
    () => trajectory.slice(0, playback.currentIndex + 1),
    [trajectory, playback.currentIndex],
  );

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const fitKey = useMemo(
    () =>
      `${selectedVessel?.id ?? ""}|${startTime ?? ""}|${endTime ?? ""}|${events.map((e) => e.id).join(",")}`,
    [selectedVessel?.id, startTime, endTime, events],
  );

  const writeFocusParams = useCallback(
    (vesselId: string, startUnix: number, endUnix: number) => {
      setSearchParams(
        {
          vesselId,
          start: String(startUnix),
          end: String(endUnix),
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleSearch = useCallback(() => {
    if (!mmsiInput.trim()) return;
    setDialogOpen(true);
  }, [mmsiInput]);

  const handleSelectVessel = useCallback(
    (vessel: Vessel) => {
      const startUnix = formStart?.unix() ?? null;
      const endUnix = formEnd?.unix() ?? null;
      setSelectedVessel(vessel);
      setDialogOpen(false);
      setStartTime(startUnix);
      setEndTime(endUnix);
      if (startUnix != null && endUnix != null) {
        writeFocusParams(vessel.id, startUnix, endUnix);
      } else {
        setSearchParams({ vesselId: vessel.id }, { replace: true });
      }
      setSnackbar({
        open: true,
        message: `Loaded ${vessel.name}. Trajectory ready for playback.`,
        error: false,
      });
    },
    [formStart, formEnd, writeFocusParams, setSearchParams],
  );

  const formatEventType = (type: string) =>
    type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleHighlightEvent = useCallback((event: FocusEvent) => {
    setSelectedEventId(event.id);
    const time = event.timestamp
      ? dayjs(event.timestamp).format("YYYY-MM-DD HH:mm:ss")
      : "unknown time";
    setSelectionAnnouncement(
      `Selected event: ${formatEventType(event.type)} at ${time}`,
    );
  }, []);

  const goToVesselEvents = useCallback(() => {
    if (!selectedVessel) return;
    navigate(
      `/events?vessels_involved=${encodeURIComponent(selectedVessel.id)}`,
    );
  }, [navigate, selectedVessel]);

  const handleSelectEvent = useCallback(
    (event: FocusEvent) => {
      handleHighlightEvent(event);
      goToVesselEvents();
    },
    [goToVesselEvents, handleHighlightEvent],
  );

  const handleNavigateToEvent = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        handleHighlightEvent(event);
      } else {
        setSelectedEventId(eventId);
      }
      goToVesselEvents();
    },
    [events, goToVesselEvents, handleHighlightEvent],
  );

  const handleSelectEventMarker = useCallback(
    (event: FocusEvent) => {
      handleHighlightEvent(event);
    },
    [handleHighlightEvent],
  );

  const handleChangeVessel = useCallback(() => {
    setSelectedVessel(null);
    setStartTime(null);
    setEndTime(null);
    setSelectedEventId(null);
    setSelectionAnnouncement("");
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleApplyTimeRange = useCallback(
    (start: number, end: number) => {
      setStartTime(start);
      setEndTime(end);
      setFormStart(dayjs.unix(start));
      setFormEnd(dayjs.unix(end));
      if (selectedVessel) {
        writeFocusParams(selectedVessel.id, start, end);
      }
    },
    [selectedVessel, writeFocusParams],
  );

  // Deep-link: /focus-mode?vesselId=...&start=...&end=...
  useEffect(() => {
    if (!pendingUrlEntry.current || !vesselIdFromUrl) return;
    pendingUrlEntry.current = false;
    handleSelectVessel({
      id: vesselIdFromUrl,
      name: `Vessel ${vesselIdFromUrl}`,
    });
  }, [vesselIdFromUrl, handleSelectVessel]);

  useEffect(() => {
    if (trajectoryQuery.isError || eventsQuery.isError) {
      const message = trajectoryQuery.isError
        ? "Failed to load trajectory. Please check the vessel/time range and try again."
        : "Failed to load vessel events. Please try again.";
      setSnackbar({ open: true, message, error: true });
    }
  }, [
    trajectoryQuery.isError,
    trajectoryQuery.error,
    eventsQuery.isError,
    eventsQuery.error,
  ]);

  const isLoaded = selectedVessel !== null;
  const isLoading = trajectoryQuery.isFetching || eventsQuery.isFetching;
  const activeLabel = selectedVessel
    ? `${selectedVessel.name} (ID: ${selectedVessel.id})`
    : "";

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <FocusModeView
        mmsiInput={mmsiInput}
        formStart={formStart as dayjs.Dayjs}
        formEnd={formEnd as dayjs.Dayjs}
        onMmsiChange={setMmsiInput}
        onStartChange={setFormStart}
        onEndChange={setFormEnd}
        onSearch={handleSearch}
        isLoaded={isLoaded}
        isLoading={isLoading}
        activeLabel={activeLabel}
        onChangeVessel={handleChangeVessel}
        trajectory={trajectory}
        visibleTrajectory={visibleTrajectory}
        currentPoint={currentPoint}
        playback={playback}
        visibleEvents={events}
        eventsLoading={eventsQuery.isFetching}
        selectedEventId={selectedEventId}
        selectionAnnouncement={selectionAnnouncement}
        onSelectEvent={handleSelectEvent}
        onHighlightEvent={handleHighlightEvent}
        onSelectEventMarker={handleSelectEventMarker}
        startTime={startTime}
        endTime={endTime}
        onApplyTimeRange={handleApplyTimeRange}
        fitKey={fitKey}
        onNavigateToEvent={handleNavigateToEvent}
        dialogOpen={dialogOpen}
        dialogVessels={vesselsQuery.data ?? []}
        onSelectVessel={handleSelectVessel}
        onDialogClose={() => setDialogOpen(false)}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  );
};
