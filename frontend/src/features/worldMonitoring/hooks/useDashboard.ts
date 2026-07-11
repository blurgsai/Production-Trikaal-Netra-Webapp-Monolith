import { useQuery } from "@tanstack/react-query";

import {
  getOverviewDistributions,
  getOverviewHotspots,
  getOverviewRecent,
  getOverviewSummary,
  getOverviewTrends,
} from "../api/overviewApi";

import {
  mapDistributions,
  mapHotspots,
  mapRecentEvents,
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

        recent: mapRecentEvents(recentResponse),

        distributions: mapDistributions(distributionsResponse),
      };
    },
  });
};
