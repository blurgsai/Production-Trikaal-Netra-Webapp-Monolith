import axiosInstance from "@/shared/api/client";

import type { InsightsSummaryApiResponse } from "./types";

export async function fetchInsightsSummary(): Promise<InsightsSummaryApiResponse> {
  const res = await axiosInstance.get<InsightsSummaryApiResponse>("/insights/summary");
  return res.data;
}
