import axiosInstance from "@/shared/api/client";

import type {
  DistributionApiResponse,
  EventDetailApiResponse,
  HotspotApiResponse,
  OverviewSummaryApiResponse,
  RecentEventsResponse,
  TrendApiResponse,
} from "./types";

export const getOverviewSummary =
  async (): Promise<OverviewSummaryApiResponse> => {
    const response = await axiosInstance.get("/world-monitor/overview/summary");

    return response.data;
  };

export const getOverviewTrends = async (
  days = 7,
): Promise<TrendApiResponse[]> => {
  const response = await axiosInstance.get(
    `/world-monitor/overview/trends?days=${days}`,
  );

  return response.data;
};

export const getOverviewHotspots = async (
  limit = 8,
): Promise<HotspotApiResponse[]> => {
  const response = await axiosInstance.get(
    `/world-monitor/overview/hotspots?limit=${limit}`,
  );

  return response.data;
};

export const getOverviewRecent = async (
  limit = 8,
): Promise<RecentEventsResponse> => {
  const response = await axiosInstance.get(
    `/world-monitor/overview/recent?limit=${limit}`,
  );

  return response.data;
};

export const getOverviewDistributions = async (
  sourceLimit = 8,
): Promise<DistributionApiResponse> => {
  const response = await axiosInstance.get(
    `/world-monitor/overview/distributions?source_limit=${sourceLimit}`,
  );

  return response.data;
};

export const getEventDetail = async (
  eventId: string,
): Promise<EventDetailApiResponse> => {
  const response = await axiosInstance.get(`/world-monitor/events/${eventId}`);

  return response.data;
};
