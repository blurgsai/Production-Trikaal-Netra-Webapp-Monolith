import { useQuery } from "@tanstack/react-query";

import { fetchInsightsSummary } from "../api/insightsApi";
import { mapInsightsSummaryToCards } from "../model/mappers";

const INSIGHTS_KEY = "insights-summary";

export function useInsights() {
  return useQuery({
    queryKey: [INSIGHTS_KEY],
    queryFn: async () => {
      const raw = await fetchInsightsSummary();
      return mapInsightsSummaryToCards(raw);
    },
  });
}
