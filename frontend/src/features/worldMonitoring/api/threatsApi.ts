import { axiosInstance } from "@/shared/api";

import type {
  WorldMonitorEventListApiResponse,
  WorldMonitorMapApiResponse,
  WorldMonitorMetadataApiResponse,
} from "./types";

export async function getThreatMetadata(): Promise<WorldMonitorMetadataApiResponse> {
  const res = await axiosInstance.get<WorldMonitorMetadataApiResponse>(
    "/world-monitor/filters/metadata",
  );
  return res.data;
}

export interface ThreatFiltersRequest {
  keyword?: string;
  eventTypes?: string[];
  threatLevels?: string[];
  sources?: string[];
  dateFrom?: string;
  dateTo?: string;
  hasLinkedArticle?: boolean;
  sort?: string;
}

function buildEventParams(
  filters: ThreatFiltersRequest,
  page: number,
  pageSize: number,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page,
    page_size: pageSize,
  };

  if (filters.keyword?.trim()) {
    params.keyword = filters.keyword.trim();
  }
  if (filters.eventTypes?.length) {
    params.event_types = filters.eventTypes.join(",");
  }
  if (filters.threatLevels?.length) {
    params.threat_levels = filters.threatLevels.join(",");
  }
  if (filters.sources?.length) {
    params.sources = filters.sources.join(",");
  }
  if (filters.dateFrom) {
    params.date_from = filters.dateFrom;
  }
  if (filters.dateTo) {
    params.date_to = filters.dateTo;
  }
  if (filters.hasLinkedArticle !== undefined) {
    params.has_linked_article = filters.hasLinkedArticle;
  }
  if (filters.sort) {
    params.sort = filters.sort;
  }

  return params;
}

export async function getThreatEvents(
  filters: ThreatFiltersRequest,
  page: number,
  pageSize: number,
): Promise<WorldMonitorEventListApiResponse> {
  const res = await axiosInstance.get<WorldMonitorEventListApiResponse>(
    "/world-monitor/events",
    { params: buildEventParams(filters, page, pageSize) },
  );
  return res.data;
}

export async function getThreatMapEvents(
  filters: ThreatFiltersRequest,
): Promise<WorldMonitorMapApiResponse> {
  const params = buildEventParams(filters, 1, 100);
  delete params.page;
  delete params.page_size;

  const res = await axiosInstance.get<WorldMonitorMapApiResponse>(
    "/world-monitor/events/map",
    { params },
  );
  return res.data;
}
