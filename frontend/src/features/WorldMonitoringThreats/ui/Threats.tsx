import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useThreats } from "../hooks/useThreats";
import { useArticleDetail } from "@/features/WorldMonitoringArticles/hooks/useArticles";

import type { ThreatFilters, ThreatMapMarker } from "../model/types";
import type { ArticlePreview } from "@/shared/model/world-monitoring/types";
import {
  formatDateTime,
  worldMonitorPalette,
} from "@/shared/utils/worldMonitoringUtils";

import { ThreatMap } from "./ThreatMap";
import { ThreatFilters as ThreatFiltersPanel } from "./ThreatFilters";
import { EventExplorer } from "./EventExplorer";
import { ArticleMetadataChips } from "@/shared/ui/world-monitoring/ArticleMetadataChips";
import { useNavigate, useParams } from "react-router-dom";

// ── Constants

const DEFAULT_FILTERS: ThreatFilters = {
  keyword: "",
  eventTypes: [],
  threatLevels: [],
  sources: [],
  sort: "latest",
};

const DEFAULT_PAGE_SIZE = 12;

// ── Main component

export function Threats() {
  // ── Filter + pagination state
  const [filters, setFilters] = useState<ThreatFilters>(DEFAULT_FILTERS);
  const [keywordInput, setKeywordInput] = useState("");
  const [page, setPage] = useState(1);

  // ── Selection state
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

  const navigate = useNavigate();

  // Debounce keyword into filters
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, keyword: keywordInput.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [keywordInput]);

  // ── Data
  const {
    data,
    isLoading: threatsLoading,
    error: threatsError,
  } = useThreats(filters, page, DEFAULT_PAGE_SIZE);

  const metadata = data?.metadata;
  const events = data?.events ?? [];
  const mapMarkers = data?.mapMarkers ?? [];
  const pagination = data?.pagination;

  const { data: articleDetail, isLoading: articleLoading } = useArticleDetail(
    selectedArticleId ?? undefined,
  );

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

  // ── Derived map state
  const resolvedSelectedMarker = useMemo<ThreatMapMarker | null>(() => {
    if (selectedMarker) return selectedMarker;
    if (!selectedEventId) return null;
    return mapMarkers.find((m) => m.eventId === selectedEventId) ?? null;
  }, [mapMarkers, selectedEventId, selectedMarker]);

  const selectedEventMarkers = useMemo(
    () => mapMarkers.filter((m) => m.eventId === selectedEventId),
    [mapMarkers, selectedEventId],
  );

  // ── Handlers
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

  // ── Render
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minHeight: 0,
        flex: 1,
      }}
    >
      {/* Filter bar */}
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
      />

      {threatsError && (
        <Alert severity="error">Failed to load world monitoring threats.</Alert>
      )}

      {/* Map + panel grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.9fr) minmax(360px, 1fr)",
          },
          gap: 2,
          minHeight: 0,
          flex: 1,
        }}
      >
        <ThreatMap
          markers={mapMarkers}
          selectedEventId={selectedEventId}
          selectedMarker={resolvedSelectedMarker}
          isLoading={threatsLoading}
          onMarkerClick={handleMarkerClick}
        />

        <Box
          sx={{
            minHeight: 540,
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
        </Box>
      </Box>

      {/* Full article dialog */}
      <Dialog
        open={articleLoading || Boolean(selectedArticleId)}
        onClose={() => setSelectedArticleId(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: worldMonitorPalette.panel,
            border: `1px solid ${worldMonitorPalette.borderStrong}`,
            color: worldMonitorPalette.text,
          },
        }}
      >
        <DialogContent>
          {articleLoading ? (
            <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
              <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
            </Box>
          ) : articleDetail ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {articleDetail.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: worldMonitorPalette.textMuted, mt: 1 }}
                >
                  {articleDetail.source ?? "Unknown source"}
                  {articleDetail.published
                    ? ` | ${formatDateTime(articleDetail.published)}`
                    : ""}
                </Typography>
              </Box>

              {articleDetail.imageUrl && (
                <CardMedia
                  component="img"
                  image={articleDetail.imageUrl}
                  alt={articleDetail.title}
                  sx={{
                    height: 240,
                    borderRadius: 2,
                    objectFit: "cover",
                    border: `1px solid ${worldMonitorPalette.border}`,
                  }}
                />
              )}

              <Typography
                variant="body1"
                sx={{ color: worldMonitorPalette.textMuted }}
              >
                {articleDetail.summary ??
                  articleDetail.processedContent ??
                  articleDetail.rawContent}
              </Typography>

              <ArticleMetadataChips article={articleDetail} />

              {(articleDetail as ArticlePreview & { link?: string }).link && (
                <Button
                  component="a"
                  href={
                    (articleDetail as ArticlePreview & { link?: string }).link
                  }
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon />}
                  sx={{
                    alignSelf: "flex-start",
                    color: worldMonitorPalette.accent,
                  }}
                >
                  Open Source Site
                </Button>
              )}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
