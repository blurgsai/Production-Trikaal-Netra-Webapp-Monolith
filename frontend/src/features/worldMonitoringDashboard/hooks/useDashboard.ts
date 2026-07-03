import { useQuery } from "@tanstack/react-query";

import {
  getOverviewDistributions,
  getOverviewHotspots,
  getOverviewRecent,
  getOverviewSummary,
  getOverviewTrends,
  getEventDetail,
} from "../api/worldMonitoringDashboardApi";

import {
  mapDistributions,
  mapEventDetail,
  mapHotspots,
  mapRecentEvent,
  mapSummary,
  mapTrends,
} from "../model/mappers";

const DASHBOARD_KEY = "world-monitor-dashboard";

export const useDashboard = () => {
  return useQuery({
    queryKey: [DASHBOARD_KEY],

    queryFn: async () => {
      const [
        summaryResponse,
        trendsResponse,
        hotspotsResponse,
        recentResponse,
        distributionsResponse,
      ] = await Promise.all([
        getOverviewSummary(),
        getOverviewTrends(),
        getOverviewHotspots(),
        getOverviewRecent(),
        getOverviewDistributions(),
      ]);

      return {
        summary: mapSummary(summaryResponse),

        trends: mapTrends(trendsResponse),

        hotspots: mapHotspots(hotspotsResponse),

        recent: recentResponse.data.map(mapRecentEvent),

        distributions: mapDistributions(distributionsResponse),
      };
    },
  });
};

export const useDashboardEventDetail = (eventId?: string) => {
  return useQuery({
    queryKey: ["dashboard-event-detail", eventId],

    enabled: Boolean(eventId),

    queryFn: async () => {
      const response = await getEventDetail(eventId!);

      return mapEventDetail(response);
    },
  });
};
