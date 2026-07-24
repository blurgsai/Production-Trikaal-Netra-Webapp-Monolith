import { useEffect, useMemo, useRef, type Ref } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FilterListIcon from "@mui/icons-material/FilterList";

import type {
  ThreatEvent,
  ThreatMapMarker,
  ThreatPagination,
  ThreatProgressiveFilter,
  SavedThreatFilterSet,
  ThreatMetadata,
} from "../model/types";

import { defenseColors } from "@/shared/theme";
import {
  formatEventTypeLabel,
  formatRelative,
  getSeverityConfig,
} from "../model/mappers";

import { useThreatDetail } from "../hooks/useThreatDetail";

import EventDetailDialog from "./EventDetailDialog";
import { ThreatFilterDialog } from "./ThreatFilterDialog";

const srOnlySx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

interface EventRowProps {
  event: ThreatEvent;
  isSelected: boolean;
  onSelect: (id: string) => void;
  actionRef?: (el: HTMLElement | null) => void;
}

function EventRow({ event, isSelected, onSelect, actionRef }: EventRowProps) {
  const severity = getSeverityConfig(event.threatLevel);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <Box component="li" sx={{ listStyle: "none", m: 0, p: 0 }}>
      <Card
        sx={{
          borderRadius: 2,
          border: `1px solid ${isSelected ? severity.border : defenseColors.border.default}`,
          background: isSelected ? severity.bg : defenseColors.border.soft,
          transition: prefersReducedMotion ? "none" : "all 0.2s ease",
          "&:hover": {
            borderColor: severity.border,
            transform: prefersReducedMotion ? "none" : "translateY(-1px)",
          },
        }}
      >
        <CardActionArea
          ref={actionRef as Ref<HTMLButtonElement>}
          onClick={() => onSelect(event.id)}
          aria-label={`Select threat: ${event.title}, ${event.threatLevel}`}
          aria-pressed={isSelected}
          sx={{
            borderRadius: 2,
            "&:focus-visible": {
              outline: `2px solid ${defenseColors.primary.main}`,
              outlineOffset: 2,
            },
          }}
        >
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <Chip
                size="small"
                label={event.threatLevel}
                sx={{
                  color: severity.color,
                  backgroundColor: severity.bg,
                  border: `1px solid ${severity.border}`,
                  fontWeight: 700,
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: defenseColors.text.muted }}
              >
                {formatRelative(event.enrichedAt)}
              </Typography>
            </Stack>

            <Typography
              variant="subtitle2"
              sx={{
                color: defenseColors.text.primary,
                fontWeight: 700,
                mb: 0.75,
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {event.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: defenseColors.text.muted, mb: 1.25 }}
            >
              {event.summary}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={formatEventTypeLabel(event.eventType)}
                sx={{
                  backgroundColor: defenseColors.primary.soft,
                  color: defenseColors.primary.main,
                }}
              />
              {event.location && (
                <Chip
                  size="small"
                  label={event.location}
                  sx={{
                    backgroundColor: defenseColors.border.soft,
                    color: defenseColors.text.muted,
                  }}
                />
              )}
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  );
}

interface EventExplorerProps {
  events: ThreatEvent[];
  pagination?: ThreatPagination;
  selectedEventMarkers: ThreatMapMarker[];
  selectedEventId: string | null;
  loading: boolean;
  onSelectEvent: (id: string) => void;
  onPageChange: (page: number) => void;
  onCloseDetail: () => void;
  onOpenArticle: (articleId: string) => void;
  filterDialogOpen: boolean;
  progressiveFilters: ThreatProgressiveFilter[];
  savedFilters: SavedThreatFilterSet[];
  metadata?: ThreatMetadata;
  onOpenFilterDialog: () => void;
  onCloseFilterDialog: () => void;
  onAddFilter: () => void;
  onUpdateFilter: (index: number, update: Partial<ThreatProgressiveFilter>) => void;
  onRemoveFilter: (index: number) => void;
  onResetFilters: () => void;
  onApplyFilters: () => void;
  onSaveFilter: (name: string) => void;
  onLoadSavedFilter: (name: string) => void;
  onDeleteSavedFilter: (name: string) => void;
}

export function EventExplorer({
  events,
  pagination,
  selectedEventMarkers,
  selectedEventId,
  loading,
  onSelectEvent,
  onPageChange,
  onCloseDetail,
  onOpenArticle,
  filterDialogOpen,
  progressiveFilters,
  savedFilters,
  metadata,
  onOpenFilterDialog,
  onCloseFilterDialog,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onResetFilters,
  onApplyFilters,
  onSaveFilter,
  onLoadSavedFilter,
  onDeleteSavedFilter,
}: EventExplorerProps) {
  const { data: eventDetail, isLoading } = useThreatDetail(
    selectedEventId ?? undefined,
  );

  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingFocusIdRef = useRef<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);

  const selectionAnnouncement = useMemo(() => {
    if (!selectedEventId) return "";
    const selected = events.find((e) => e.id === selectedEventId);
    if (selected) {
      return `Selected: ${selected.title}, ${selected.threatLevel}.`;
    }
    if (eventDetail) {
      return `Selected: ${eventDetail.title}, ${eventDetail.threatLevel}.`;
    }
    return "Selected threat details.";
  }, [selectedEventId, events, eventDetail]);

  useEffect(() => {
    if (selectedEventId) {
      prevSelectedIdRef.current = selectedEventId;
      return;
    }

    const focusId = pendingFocusIdRef.current ?? prevSelectedIdRef.current;
    if (!focusId) return;

    pendingFocusIdRef.current = null;
    const frame = requestAnimationFrame(() => {
      const target = rowRefs.current[focusId];
      if (target) {
        target.focus();
        return;
      }
      listContainerRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedEventId]);

  const handleBackToList = () => {
    pendingFocusIdRef.current = selectedEventId ?? prevSelectedIdRef.current;
    onCloseDetail();
  };

  if (selectedEventId) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Typography component="p" role="status" aria-live="polite" sx={srOnlySx}>
          {selectionAnnouncement}
        </Typography>
        <Box
          sx={{
            p: 2,
            flexShrink: 0,
            borderBottom: `1px solid ${defenseColors.border.default}`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToList}
            sx={{ color: defenseColors.text.muted }}
          >
            Back to list
          </Button>
        </Box>

        <EventDetailDialog
          variant="inline"
          open
          loading={isLoading}
          eventDetail={eventDetail ?? null}
          onClose={handleBackToList}
          onOpenArticle={onOpenArticle}
        />
      </Box>
    );
  }

  return (
    <>
      <Typography component="p" role="status" aria-live="polite" sx={srOnlySx}>
        {selectionAnnouncement}
      </Typography>
      <Paper
        sx={{
          p: 2,
          borderBottom: `1px solid ${defenseColors.border.default}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{ color: defenseColors.text.primary, fontWeight: 800 }}
          >
            Event Explorer
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: defenseColors.text.muted }}
          >
            {pagination?.total ?? 0} events match the active threat filters.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: defenseColors.text.muted,
              display: "block",
              mt: 0.5,
            }}
          >
            Threat list — keyboard-accessible alternative to map markers.
          </Typography>
          {!!selectedEventMarkers.length && (
            <Typography
              variant="caption"
              sx={{
                color: defenseColors.primary.main,
                display: "block",
                mt: 0.75,
              }}
            >
              Selected event is highlighted on the map across{" "}
              {selectedEventMarkers.length} mapped location
              {selectedEventMarkers.length > 1 ? "s" : ""}.
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={onOpenFilterDialog}
          sx={{
            color: defenseColors.text.primary,
            borderColor: defenseColors.border.strong,
            textTransform: "none",
            fontWeight: 600,
            "&:hover": {
              borderColor: defenseColors.primary.main,
              backgroundColor: defenseColors.primary.soft,
            },
          }}
        >
          Filters
          {progressiveFilters.length > 0 && (
            <Chip
              label={progressiveFilters.length}
              size="small"
              color="primary"
              sx={{
                ml: 0.5,
                height: 18,
                fontSize: "0.65rem",
                minWidth: 18,
              }}
            />
          )}
        </Button>
      </Paper>
      {loading ? (
        <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
          <CircularProgress sx={{ color: defenseColors.primary.main }} />
        </Box>
      ) : (
        <>
          {events.length === 0 ? (
            <Box
              sx={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                p: 3,
                textAlign: "center",
              }}
            >
              <Stack spacing={1.5} alignItems="center" maxWidth={360}>
                <Typography sx={{ color: defenseColors.text.primary, fontWeight: 600 }}>
                  {progressiveFilters.length > 0
                    ? "No events match the current filters."
                    : "No threat events to display."}
                </Typography>
                {progressiveFilters.length > 0 ? (
                  <>
                    <Typography
                      variant="body2"
                      sx={{ color: defenseColors.text.muted }}
                    >
                      Try adjusting severity, location, or time range.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={onResetFilters}
                      sx={{
                        color: defenseColors.text.primary,
                        borderColor: defenseColors.border.strong,
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: defenseColors.primary.main,
                          backgroundColor: defenseColors.primary.soft,
                        },
                      }}
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: defenseColors.text.muted }}
                  >
                    Events will appear here when available for the current view.
                  </Typography>
                )}
              </Stack>
            </Box>
          ) : (
            <Box
              ref={listContainerRef}
              tabIndex={-1}
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                outline: "none",
              }}
            >
              <Stack
                component="ul"
                role="list"
                aria-label="Threat list — keyboard-accessible alternative to map markers"
                spacing={1.25}
                className="wm-scrollable"
                sx={{
                  p: 1.5,
                  m: 0,
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  listStyle: "none",
                  "& > *": { flexShrink: 0 },
                }}
              >
                {events.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isSelected={event.id === selectedEventId}
                    onSelect={onSelectEvent}
                    actionRef={(el) => {
                      rowRefs.current[event.id] = el;
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {(pagination?.totalPages ?? 1) > 1 && (
            <Paper
              sx={{
                p: 1.5,
                borderTop: `1px solid ${defenseColors.border.default}`,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                count={pagination?.totalPages ?? 1}
                page={pagination?.page ?? 1}
                onChange={(_, page) => onPageChange(page)}
                color="primary"
              />
            </Paper>
          )}
        </>
      )}

      <ThreatFilterDialog
        open={filterDialogOpen}
        onClose={onCloseFilterDialog}
        filters={progressiveFilters}
        savedFilters={savedFilters}
        metadata={metadata}
        onAddFilter={onAddFilter}
        onUpdateFilter={onUpdateFilter}
        onRemoveFilter={onRemoveFilter}
        onResetFilters={onResetFilters}
        onApplyFilters={onApplyFilters}
        onSaveFilter={onSaveFilter}
        onLoadSavedFilter={onLoadSavedFilter}
        onDeleteSavedFilter={onDeleteSavedFilter}
      />
    </>
  );
}
