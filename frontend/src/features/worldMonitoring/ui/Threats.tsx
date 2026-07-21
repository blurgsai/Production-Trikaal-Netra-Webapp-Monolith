import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Paper,
} from "@mui/material";

import { useThreats } from "../hooks/useThreats";
import { useWorldMonitoringUrlParams } from "../hooks/useWorldMonitoringUrlParams";

import type {
  ThreatFilters,
  ThreatMapMarker,
  ThreatProgressiveFilter,
  SavedThreatFilterSet,
} from "../model/types";
import { defenseColors } from "@/shared/theme";

import {
  loadSavedThreatFilters,
  saveThreatFilter,
  deleteSavedThreatFilter,
} from "../model/threatFilterStorage";

import { ThreatMap } from "./ThreatMap";
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

function progressiveFiltersToThreatFilters(
  progressive: ThreatProgressiveFilter[],
  sort: string,
): ThreatFilters {
  const result: ThreatFilters = {
    keyword: "",
    eventTypes: [],
    threatLevels: [],
    sources: [],
    sort,
  };

  for (const f of progressive) {
    if (!f.field || !f.operator || !f.value) continue;

    switch (f.field) {
      case "keyword":
        if (f.operator === "contains" || f.operator === "=") {
          result.keyword = f.value;
        }
        break;
      case "event_type":
        if (f.operator === "=" || f.operator === "contains") {
          if (!result.eventTypes.includes(f.value)) {
            result.eventTypes.push(f.value);
          }
        }
        break;
      case "threat_level":
        if (f.operator === "=") {
          if (!result.threatLevels.includes(f.value)) {
            result.threatLevels.push(f.value);
          }
        }
        break;
      case "source":
        if (f.operator === "=" || f.operator === "contains") {
          if (!result.sources.includes(f.value)) {
            result.sources.push(f.value);
          }
        }
        break;
      case "enriched_at":
        if (f.operator === ">=" || (f.operator === "between" && f.value)) {
          result.dateFrom = f.value;
        }
        if (f.operator === "<=" || (f.operator === "between" && f.value2)) {
          result.dateTo = f.value2 ?? f.value;
        }
        break;
      case "has_linked_article":
        if (f.operator === "=") {
          result.hasLinkedArticle = f.value === "true";
        }
        break;
      case "relevance_score":
        if (f.operator === ">=" || (f.operator === "between" && f.value)) {
          result.relevanceScoreFrom = parseFloat(f.value);
        }
        if (f.operator === "<=" || (f.operator === "between" && f.value2)) {
          result.relevanceScoreTo = parseFloat(f.value2 ?? f.value);
        }
        if (f.operator === "=") {
          result.relevanceScoreFrom = parseFloat(f.value);
          result.relevanceScoreTo = parseFloat(f.value);
        }
        break;
      case "extracted_data.location":
        if (f.operator === "contains" || f.operator === "=") {
          result.extractedDataLocation = f.value;
        }
        break;
      case "extracted_data.vessel_name":
        if (f.operator === "contains" || f.operator === "=") {
          result.extractedDataVesselName = f.value;
        }
        break;
      case "extracted_data.threat_type":
        if (f.operator === "contains" || f.operator === "=") {
          result.extractedDataThreatType = f.value;
        }
        break;
      case "extracted_data.origin":
        if (f.operator === "contains" || f.operator === "=") {
          result.extractedDataOrigin = f.value;
        }
        break;
      case "extracted_data.damage":
        if (f.operator === "contains" || f.operator === "=") {
          result.extractedDataDamage = f.value;
        }
        break;
      case "extracted_data.countermeasures":
        if (f.operator === "contains" || f.operator === "=") {
          result.extractedDataCountermeasures = f.value;
        }
        break;
      case "location.name":
        if (f.operator === "contains" || f.operator === "=") {
          result.locationName = f.value;
        }
        break;
    }
  }

  return result;
}

export function Threats() {
  const urlParams = useWorldMonitoringUrlParams();
  const [filters, setFilters] = useState<ThreatFilters>(() =>
    urlParams.hasParams
      ? { ...DEFAULT_FILTERS, ...urlParams.threatFilters }
      : DEFAULT_FILTERS,
  );
  const [keywordInput, setKeywordInput] = useState(() =>
    urlParams.keyword ?? "",
  );
  const [page, setPage] = useState(1);

  const [progressiveFilters, setProgressiveFilters] = useState<
    ThreatProgressiveFilter[]
  >(() => urlParams.threatProgressiveFilters);
  const [savedFilters, setSavedFilters] = useState<SavedThreatFilterSet[]>(
    () => loadSavedThreatFilters(),
  );
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

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
  const mapMarkers = useMemo(() => data?.mapMarkers ?? [], [data?.mapMarkers]);
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

  const handleAddProgressiveFilter = useCallback(() => {
    setProgressiveFilters((prev) => [
      ...prev,
      { field: "keyword", operator: "contains", value: "" },
    ]);
  }, []);

  const handleUpdateProgressiveFilter = useCallback(
    (index: number, update: Partial<ThreatProgressiveFilter>) => {
      setProgressiveFilters((prev) =>
        prev.map((f, i) => (i === index ? { ...f, ...update } : f)),
      );
    },
    [],
  );

  const handleRemoveProgressiveFilter = useCallback((index: number) => {
    setProgressiveFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleResetProgressiveFilters = useCallback(() => {
    setProgressiveFilters([]);
    setFilters((prev) => ({
      ...DEFAULT_FILTERS,
      sort: prev.sort,
    }));
    setKeywordInput("");
    setPage(1);
  }, []);

  const handleApplyProgressiveFilters = useCallback(() => {
    const mapped = progressiveFiltersToThreatFilters(
      progressiveFilters,
      filters.sort,
    );
    setFilters(mapped);
    setKeywordInput(mapped.keyword);
    setPage(1);
  }, [progressiveFilters, filters.sort]);

  const handleSaveFilter = useCallback(
    (name: string) => {
      const updated = saveThreatFilter(name, progressiveFilters);
      setSavedFilters(updated);
    },
    [progressiveFilters],
  );

  const handleLoadSavedFilter = useCallback(
    (name: string) => {
      const saved = savedFilters.find((s) => s.name === name);
      if (!saved) return;
      setProgressiveFilters(saved.filters.map((f) => ({ ...f })));
      const mapped = progressiveFiltersToThreatFilters(
        saved.filters,
        filters.sort,
      );
      setFilters(mapped);
      setKeywordInput(mapped.keyword);
      setPage(1);
    },
    [savedFilters, filters.sort],
  );

  const handleDeleteSavedFilter = useCallback((name: string) => {
    const updated = deleteSavedThreatFilter(name);
    setSavedFilters(updated);
  }, []);

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpen(true);
  }, []);

  const handleCloseFilterDialog = useCallback(() => {
    setFilterDialogOpen(false);
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
            border: `1px solid ${defenseColors.border.default}`,
            background: `linear-gradient(180deg, ${defenseColors.background.surfaceAlt}, ${defenseColors.background.surface})`,
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
            filterDialogOpen={filterDialogOpen}
            progressiveFilters={progressiveFilters}
            savedFilters={savedFilters}
            metadata={metadata}
            onOpenFilterDialog={handleOpenFilterDialog}
            onCloseFilterDialog={handleCloseFilterDialog}
            onAddFilter={handleAddProgressiveFilter}
            onUpdateFilter={handleUpdateProgressiveFilter}
            onRemoveFilter={handleRemoveProgressiveFilter}
            onResetFilters={handleResetProgressiveFilters}
            onApplyFilters={handleApplyProgressiveFilters}
            onSaveFilter={handleSaveFilter}
            onLoadSavedFilter={handleLoadSavedFilter}
            onDeleteSavedFilter={handleDeleteSavedFilter}
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
