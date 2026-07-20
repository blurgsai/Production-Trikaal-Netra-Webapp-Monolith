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

interface EventRowProps {
  event: ThreatEvent;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function EventRow({ event, isSelected, onSelect }: EventRowProps) {
  const severity = getSeverityConfig(event.threatLevel);

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: `1px solid ${isSelected ? severity.border : defenseColors.border.default}`,
        background: isSelected ? severity.bg : defenseColors.border.soft,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: severity.border,
          transform: "translateY(-1px)",
        },
      }}
    >
      <CardActionArea onClick={() => onSelect(event.id)} sx={{ borderRadius: 2 }}>
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

  if (selectedEventId) {
    return (
      <>
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${defenseColors.border.default}`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onCloseDetail}
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
          onClose={onCloseDetail}
          onOpenArticle={onOpenArticle}
        />
      </>
    );
  }

  return (
    <>
        <Paper
          sx={{ p: 2, borderBottom: `1px solid ${defenseColors.border.default}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
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
            <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
              <Typography sx={{ color: defenseColors.text.muted }}>
                No events match the current filters.
              </Typography>
            </Box>
          ) : (
            <Stack
              spacing={1.25}
              className="wm-scrollable"
              sx={{
                p: 1.5,
                overflowY: "auto",
                flex: 1,
                minHeight: 0,
                "& > *": { flexShrink: 0 },
              }}
            >
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  isSelected={event.id === selectedEventId}
                  onSelect={onSelectEvent}
                />
              ))}
            </Stack>
          )}

        {(pagination?.totalPages ?? 1) > 1 && (
          <Paper
            sx={{ p: 1.5, borderTop: `1px solid ${defenseColors.border.default}`, display: "flex", justifyContent: "center" }}
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
