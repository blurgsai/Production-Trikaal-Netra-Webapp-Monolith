import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchInsightsTimeline } from "../api/insightsApi";
import { mapInsightsTimeline } from "../model/mappers";
import type { InsightsTimelineRange } from "../model/types";

const INSIGHTS_TIMELINE_KEY = "insights-timeline";

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
