import { useMemo, useState } from "react";

import { Alert, Box, CircularProgress, Stack } from "@mui/material";

import { useDashboard, useDashboardEventDetail } from "../hooks/useDashboard";
import type { DashboardHotspot, DashboardRecentEvent } from "../model/types";

import { MetricCard } from "./MetricCard";
import { ActivityTrend } from "./ActivityTrend";
import { SeverityMix } from "./SeverityMix";
import { EventTypes } from "./EventTypes";
import { OperationalHotspots } from "./OperationalHotspots";
import { RecentIntelligence } from "./RecentIntelligence";

import EventDetailDialog from "@/shared/ui/world-monitoring/EventDetailDialog";

import {
  formatEventTypeLabel,
  getSeverityConfig,
  worldMonitorPalette,
} from "@/shared/utils/worldMonitoringUtils";

import { useNavigate } from "react-router-dom";

type MetricCardData = {
  label: string;
  value: number;
  helper: string;
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDashboard();

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
        sx={{
          display: "grid",
          placeItems: "center",
          flex: 1,
        }}
      >
        <CircularProgress sx={{ color: worldMonitorPalette.accent }} />
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
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        pr: 0.5,
        pb: 1,
      }}
    >
      {error && (
        <Alert severity="error">Failed to load overview intelligence.</Alert>
      )}

      {/* Metric Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, 1fr)",
            xl: "repeat(5, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {metricCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
          />
        ))}
      </Box>

      {/* Charts */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "1.2fr 1fr 1fr",
          },
          gap: 2,
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
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "1fr 1.1fr",
          },
          gap: 2,
        }}
      >
        <OperationalHotspots hotspots={hotspots} />

        <RecentIntelligence recent={recent} onOpenEvent={handleOpenEvent} />
      </Box>

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
