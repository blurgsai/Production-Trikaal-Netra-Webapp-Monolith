import { useMemo, useState } from "react";

import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";

import { useDashboard } from "../hooks/useDashboard";
import { useDashboardEventDetail } from "../hooks/useDashboardEventDetail";
import type { DashboardHotspot, DashboardRecentEvent } from "../model/types";
import { defenseColors } from "@/shared/theme";
import { getSeverityConfig, formatEventTypeLabel } from "../model/mappers";

import { MetricCard } from "./MetricCard";
import { ActivityTrend } from "./ActivityTrend";
import { SeverityMix } from "./SeverityMix";
import { EventTypes } from "./EventTypes";
import { OperationalHotspots } from "./OperationalHotspots";
import { RecentIntelligence } from "./RecentIntelligence";
import EventDetailDialog from "./EventDetailDialog";
import { WorldMonitorScrollbarStyles } from "./ScrollbarStyles";

import { useNavigate } from "react-router-dom";

type MetricCardData = {
  label: string;
  value: number;
  helper: string;
};

const METRICS_HEADING_ID = "wm-overview-metrics-heading";

export const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useDashboard();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: selectedEventDetail, isLoading: loadingEventDetail } =
    useDashboardEventDetail(selectedEventId ?? undefined);

  const summary = data?.summary;
  const trends = data?.trends ?? [];

  const hotspots: DashboardHotspot[] = data?.hotspots ?? [];

  const recent: DashboardRecentEvent[] = data?.recent ?? [];

  const distributions = data?.distributions;

  const severityData = useMemo(
    () =>
      (distributions?.severity ?? []).map((item) => ({
        ...item,
        name: item.key,
        color: getSeverityConfig(item.key).color,
      })),
    [distributions],
  );

  const eventTypeData = useMemo(
    () =>
      (distributions?.eventTypes ?? []).map((item) => ({
        ...item,
        name: item.key,
        label: formatEventTypeLabel(item.label || item.key),
      })),
    [distributions],
  );

  const topEventType = eventTypeData[0];

  const severityTotal = severityData.reduce((sum, item) => sum + item.value, 0);

  function handleOpenEvent(eventId: string) {
    setSelectedEventId(eventId);
  }

  function handleOpenArticle(articleId: string) {
    setSelectedEventId(null);
    navigate(`/world-monitoring/articles/${articleId}`);
  }

  if (isLoading) {
    return (
      <Box
        role="status"
        aria-live="polite"
        aria-busy="true"
        sx={{
          display: "grid",
          placeItems: "center",
          flex: 1,
        }}
      >
        <CircularProgress
          aria-label="Loading overview intelligence"
          sx={{ color: defenseColors.primary.main }}
        />
      </Box>
    );
  }

  const metricCards: MetricCardData[] = [
    {
      label: "Total Events",
      value: summary?.totalEvents ?? 0,
      helper: "Total number of active events",
    },
    {
      label: "Critical / High Events",
      value: summary?.criticalHighEvents ?? 0,
      helper: "Events currently flagged as critical or high",
    },
    {
      label: "New Events (24h)",
      value: summary?.newEvents24h ?? 0,
      helper: "Events reported in the last 24 hours",
    },
    {
      label: "Active Areas",
      value: summary?.activeAreas ?? 0,
      helper: "Distinct regions with active events",
    },
    {
      label: "Linked Article Events",
      value: summary?.linkedArticleEvents ?? 0,
      helper: "Events with related published articles",
    },
  ];

  return (
    <Stack
      spacing={2}
      className="wm-scrollable"
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        pr: 0.5,
        pb: 1,
      }}
    >
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load overview intelligence.
        </Alert>
      )}

      <Box
        component="section"
        aria-labelledby={METRICS_HEADING_ID}
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
            xl: "repeat(5, 1fr)",
          },
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Typography
          id={METRICS_HEADING_ID}
          component="h2"
          sx={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: 0,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          Overview metrics
        </Typography>
        {metricCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
          />
        ))}
      </Box>

      {/* Charts — fixed equal card heights; tables scroll inside */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "1.2fr 1fr 1fr",
          },
          gap: 2,
          flexShrink: 0,
          alignItems: "stretch",
        }}
      >
        <ActivityTrend trends={trends} />

        <SeverityMix
          severityData={severityData}
          severityTotal={severityTotal}
        />

        <EventTypes eventTypeData={eventTypeData} topEventType={topEventType} />
      </Box>

      {/* Hotspots + Recent Intelligence */}
      <Box
        sx={{
          flexShrink: 0,
          minHeight: { xs: 360, xl: 420 },
          height: { xs: 420, xl: 480 },
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            xl: "minmax(0, 1fr) minmax(0, 1.1fr)",
          },
          gap: 2,
        }}
      >
        <OperationalHotspots hotspots={hotspots} />

        <RecentIntelligence recent={recent} onOpenEvent={handleOpenEvent} />
      </Box>

      <WorldMonitorScrollbarStyles />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        open={loadingEventDetail || Boolean(selectedEventDetail)}
        onClose={() => setSelectedEventId(null)}
        eventDetail={selectedEventDetail ?? null}
        loading={loadingEventDetail}
        onOpenArticle={handleOpenArticle}
      />
    </Stack>
  );
};
