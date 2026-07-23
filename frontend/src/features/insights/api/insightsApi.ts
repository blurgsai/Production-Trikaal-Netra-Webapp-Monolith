import axiosInstance from "@/shared/api/client";

import type {
  InsightsDashboardApiResponse,
  InsightsTimelineApiResponse,
} from "./types";

export async function fetchInsightsDashboard(): Promise<InsightsDashboardApiResponse> {
  const res = await axiosInstance.get<InsightsDashboardApiResponse>("/insights/summary");
  return res.data;
}

export async function fetchInsightsTimeline(
  timelineRange: string = "1w"
): Promise<InsightsTimelineApiResponse> {
  const res = await axiosInstance.get<InsightsTimelineApiResponse>("/insights/timeline", {
    params: { timeline_range: timelineRange },
  });
  return res.data;
}
