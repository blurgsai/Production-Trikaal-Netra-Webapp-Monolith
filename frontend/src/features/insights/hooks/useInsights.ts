import { useQuery } from "@tanstack/react-query";

import { fetchInsightsDashboard } from "../api/insightsApi";
import { mapInsightsDashboard } from "../model/mappers";

const INSIGHTS_KEY = "insights-dashboard";

export function useInsights() {
  return useQuery({
    queryKey: [INSIGHTS_KEY],
    queryFn: async () => {
      const raw = await fetchInsightsDashboard();
      return mapInsightsDashboard(raw);
    },
  });
}
