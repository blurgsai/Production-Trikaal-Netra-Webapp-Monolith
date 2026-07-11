import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Paper,
} from "@mui/material";

import { useThreats } from "../hooks/useThreats";

import type { ThreatFilters, ThreatMapMarker } from "../model/types";
import { worldMonitorPalette } from "../model/types";

import { ThreatMap } from "./ThreatMap";
import { ThreatFilters as ThreatFiltersPanel } from "./ThreatFilters";
import { EventExplorer } from "./EventExplorer";
import { ArticleDetailDialog } from "./ArticleDetailDialog";
import { WorldMonitorScrollbarStyles } from "./ScrollbarStyles";
import { useNavigate, useParams } from "react-router-dom";

const DEFAULT_FILTERS: ThreatFilters = {
  keyword: "",
  eventTypes: [],
  threatLevels: [],
  sources: [],
  sort: "latest",
};

const DEFAULT_PAGE_SIZE = 12;

export function Threats() {
  const [filters, setFilters] = useState<ThreatFilters>(DEFAULT_FILTERS);
  const [keywordInput, setKeywordInput] = useState("");
  const [page, setPage] = useState(1);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<ThreatMapMarker | null>(
    null,
  );
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null,
  );
  const { eventId } = useParams<{
    eventId?: string;
  }>();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, keyword: keywordInput.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [keywordInput]);

  const {
    data,
    isLoading: threatsLoading,
    error: threatsError,
  } = useThreats(filters, page, DEFAULT_PAGE_SIZE);

  const metadata = data?.metadata;
  const events = data?.events ?? [];
  const mapMarkers = data?.mapMarkers ?? [];
  const pagination = data?.pagination;

  const navigate = useNavigate();

  useEffect(() => {
      if (!eventId) {
        setSelectedEventId(null);
        setSelectedMarker(null);
        return;
      }

      setSelectedEventId(eventId);

      const marker = mapMarkers.find((m) => m.eventId === eventId) ?? null;

      setSelectedMarker(marker);
  }, [eventId, mapMarkers]);

  const resolvedSelectedMarker = useMemo<ThreatMapMarker | null>(() => {
    if (selectedMarker) return selectedMarker;
    if (!selectedEventId) return null;
    return mapMarkers.find((m) => m.eventId === selectedEventId) ?? null;
  }, [mapMarkers, selectedEventId, selectedMarker]);

  const selectedEventMarkers = useMemo(
    () => mapMarkers.filter((m) => m.eventId === selectedEventId),
    [mapMarkers, selectedEventId],
  );

  const handleMarkerClick = useCallback(
    (eventId: string) => {
      navigate(`/world-monitoring/threats/${eventId}`);
    },
    [navigate],
  );

  const handleSelectEvent = useCallback(
    (id: string) => {
      navigate(`/world-monitoring/threats/${id}`);
    },
    [navigate],
  );

  const handleCloseDetail = useCallback(() => {
    navigate("/world-monitoring/threats");
  }, [navigate]);

  const handleOpenArticle = useCallback((articleId: string) => {
    setSelectedArticleId(articleId);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minHeight: 0,
        flex: 1,
        overflow: "hidden",
      }}
    >
      <ThreatFiltersPanel
        filters={filters}
        metadata={metadata}
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        onThreatLevelsChange={(value) => {
          setFilters((p) => ({ ...p, threatLevels: value }));
          setPage(1);
        }}
        onEventTypesChange={(value) => {
          setFilters((p) => ({ ...p, eventTypes: value }));
          setPage(1);
        }}
        onSourcesChange={(value) => {
          setFilters((p) => ({ ...p, sources: value }));
          setPage(1);
        }}
        onSortChange={(value) => {
          setFilters((p) => ({ ...p, sort: value }));
          setPage(1);
        }}
        onResetFilters={() => {
          setFilters(DEFAULT_FILTERS);
          setKeywordInput("");
          setPage(1);
        }}
      />

      {threatsError && (
        <Alert severity="error">Failed to load world monitoring threats.</Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1.9fr) minmax(360px, 1fr)",
          },
          gridTemplateRows: "minmax(0, 1fr)",
          gap: 2,
          minHeight: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <ThreatMap
          markers={mapMarkers}
          selectedEventId={selectedEventId}
          selectedMarker={resolvedSelectedMarker}
          isLoading={threatsLoading}
          onMarkerClick={handleMarkerClick}
        />

        <Paper
          sx={{
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 4,
            border: `1px solid ${worldMonitorPalette.border}`,
            background:
              "linear-gradient(180deg, rgba(13,26,44,0.98), rgba(9,22,37,0.98))",
            overflow: "hidden",
          }}
        >
          <EventExplorer
            events={events}
            pagination={pagination}
            selectedEventMarkers={selectedEventMarkers}
            selectedEventId={selectedEventId}
            loading={threatsLoading}
            onSelectEvent={handleSelectEvent}
            onPageChange={setPage}
            onCloseDetail={handleCloseDetail}
            onOpenArticle={handleOpenArticle}
          />
        </Paper>
      </Box>

      <ArticleDetailDialog
        articleId={selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
        onOpenEventInThreats={(eventId) => {
          setSelectedArticleId(null);
          navigate(`/world-monitoring/threats/${eventId}`);
        }}
      />

      <WorldMonitorScrollbarStyles />
    </Box>
  );
}
