import axiosInstance from "@/shared/api/client";

import type {
  EventDetailApiResponse,
  ThreatEventsResponse,
  ThreatMapEventsResponse,
  ThreatMetadataApiResponse,
} from "./types";

export interface ThreatFiltersRequest {
  keyword?: string;

  eventTypes?: string[];

  threatLevels?: string[];

  sources?: string[];

  sort?: string;
}

const applyFilters = (
  params: URLSearchParams,
  filters: ThreatFiltersRequest,
) => {
  if (filters.keyword) {
    params.set("keyword", filters.keyword);
  }

  if (filters.eventTypes?.length) {
    params.set("event_types", filters.eventTypes.join(","));
  }

  if (filters.threatLevels?.length) {
    params.set("threat_levels", filters.threatLevels.join(","));
  }

  if (filters.sources?.length) {
    params.set("sources", filters.sources.join(","));
  }

  if (filters.sort) {
    params.set("sort", filters.sort);
  }
};

export const getMetadata = async (): Promise<ThreatMetadataApiResponse> => {
  const response = await axiosInstance.get("/world-monitor/filters/metadata");

  return response.data;
};

export const getEvents = async (
  filters: ThreatFiltersRequest,
  page: number,
  pageSize: number,
): Promise<ThreatEventsResponse> => {
  const params = new URLSearchParams();

  applyFilters(params, filters);

  params.set("page", String(page));
  params.set("page_size", String(pageSize));

  const response = await axiosInstance.get(
    `/world-monitor/events?${params.toString()}`,
  );

  return response.data;
};

export const getMapEvents = async (
  filters: ThreatFiltersRequest,
): Promise<ThreatMapEventsResponse> => {
  const params = new URLSearchParams();

  applyFilters(params, filters);

  const query = params.toString();

  const response = await axiosInstance.get(
    `/world-monitor/events/map${query ? `?${query}` : ""}`,
  );

  return response.data;
};

export const getEventDetail = async (
  eventId: string,
): Promise<EventDetailApiResponse> => {
  const response = await axiosInstance.get(`/world-monitor/events/${eventId}`);

  return response.data;
};