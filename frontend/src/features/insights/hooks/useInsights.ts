import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchInsightsDashboard,
  fetchInsightsTimeline,
  type InsightsTimelineRange,
} from "../api/insightsApi";
import { mapInsightsDashboard, mapInsightsTimeline } from "../model/mappers";

const INSIGHTS_KEY = "insights-dashboard";
const INSIGHTS_TIMELINE_KEY = "insights-timeline";

export function useInsights() {
  return useQuery({
    queryKey: [INSIGHTS_KEY],
    queryFn: async () => {
      const raw = await fetchInsightsDashboard();
      return mapInsightsDashboard(raw);
    },
  });
}

export function useInsightsTimeline(timelineRange: InsightsTimelineRange = "1w") {
  return useQuery({
    queryKey: [INSIGHTS_TIMELINE_KEY, timelineRange],
    queryFn: async () => {
      const raw = await fetchInsightsTimeline(timelineRange);
      return mapInsightsTimeline(raw);
    },
    placeholderData: keepPreviousData,
  });
}
