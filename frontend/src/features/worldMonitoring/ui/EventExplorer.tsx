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

import type {
  ThreatEvent,
  ThreatMapMarker,
  ThreatPagination,
} from "../model/types";

import { worldMonitorPalette } from "../model/types";
import {
  formatEventTypeLabel,
  formatRelative,
  getSeverityConfig,
} from "../model/mappers";

import { useThreatDetail } from "../hooks/useThreatDetail";

import EventDetailDialog from "./EventDetailDialog";

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
        border: `1px solid ${isSelected ? severity.border : worldMonitorPalette.border}`,
        background: isSelected ? severity.bg : "rgba(255,255,255,0.02)",
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
          sx={{ color: worldMonitorPalette.textMuted }}
        >
          {formatRelative(event.enrichedAt)}
        </Typography>
      </Stack>

      <Typography
        variant="subtitle2"
        sx={{
          color: worldMonitorPalette.text,
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
        sx={{ color: worldMonitorPalette.textMuted, mb: 1.25 }}
      >
        {event.summary}
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={formatEventTypeLabel(event.eventType)}
          sx={{
            backgroundColor: "rgba(78,195,255,0.12)",
            color: worldMonitorPalette.accent,
          }}
        />
        {event.location && (
          <Chip
            size="small"
            label={event.location}
            sx={{
              backgroundColor: "rgba(255,255,255,0.04)",
              color: worldMonitorPalette.textMuted,
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
            borderBottom: `1px solid ${worldMonitorPalette.border}`,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onCloseDetail}
            sx={{ color: worldMonitorPalette.textMuted }}
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
          sx={{ p: 2, borderBottom: `1px solid ${worldMonitorPalette.border}` }}
        >
        <Typography
          variant="h6"
          sx={{ color: worldMonitorPalette.text, fontWeight: 800 }}
        >
          Event Explorer
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: worldMonitorPalette.textMuted }}
        >
          {pagination?.total ?? 0} events match the active threat filters.
        </Typography>
        {!!selectedEventMarkers.length && (
          <Typography
            variant="caption"
            sx={{
              color: worldMonitorPalette.accent,
              display: "block",
              mt: 0.75,
            }}
          >
            Selected event is highlighted on the map across{" "}
            {selectedEventMarkers.length} mapped location
            {selectedEventMarkers.length > 1 ? "s" : ""}.
          </Typography>
        )}
        </Paper>
      {loading ? (
        <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
          <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
        </Box>
      ) : (
        <>
          {events.length === 0 ? (
            <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
              <Typography sx={{ color: worldMonitorPalette.textMuted }}>
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
            sx={{ p: 1.5, borderTop: `1px solid ${worldMonitorPalette.border}`, display: "flex", justifyContent: "center" }}
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
    </>
  );
}
