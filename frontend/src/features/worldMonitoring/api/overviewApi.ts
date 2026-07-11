import { axiosInstance } from "@/shared/api";

import type {
  OverviewSummaryApiResponse,
  OverviewTrendApiResponse,
  OverviewHotspotApiResponse,
  OverviewRecentApiResponse,
  OverviewDistributionsApiResponse,
  WorldMonitorEventDetailApiResponse,
} from "./types";

export async function getOverviewSummary(): Promise<OverviewSummaryApiResponse> {
  const res = await axiosInstance.get<OverviewSummaryApiResponse>(
    "/world-monitor/overview/summary",
  );
  return res.data;
}

export async function getOverviewTrends(
  days = 7,
): Promise<OverviewTrendApiResponse[]> {
  const res = await axiosInstance.get<OverviewTrendApiResponse[]>(
    "/world-monitor/overview/trends",
    { params: { days } },
  );
  return res.data;
}

export async function getOverviewHotspots(
  limit = 8,
): Promise<OverviewHotspotApiResponse[]> {
  const res = await axiosInstance.get<OverviewHotspotApiResponse[]>(
    "/world-monitor/overview/hotspots",
    { params: { limit } },
  );
  return res.data;
}

export async function getOverviewRecent(
  limit = 8,
): Promise<OverviewRecentApiResponse> {
  const res = await axiosInstance.get<OverviewRecentApiResponse>(
    "/world-monitor/overview/recent",
    { params: { limit } },
  );
  return res.data;
}

export async function getOverviewDistributions(
  sourceLimit = 8,
): Promise<OverviewDistributionsApiResponse> {
  const res = await axiosInstance.get<OverviewDistributionsApiResponse>(
    "/world-monitor/overview/distributions",
    { params: { source_limit: sourceLimit } },
  );
  return res.data;
}

export async function getEventDetail(
  eventId: string,
): Promise<WorldMonitorEventDetailApiResponse> {
  const res =
    await axiosInstance.get<WorldMonitorEventDetailApiResponse>(
      `/world-monitor/events/${eventId}`,
    );
  return res.data;
}
