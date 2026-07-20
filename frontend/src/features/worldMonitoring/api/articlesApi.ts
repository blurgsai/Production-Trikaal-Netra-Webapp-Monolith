import { axiosInstance } from "@/shared/api";

import type {
  WorldMonitorArticleListApiResponse,
  WorldMonitorArticleDetailApiResponse,
  WorldMonitorMetadataApiResponse,
} from "./types";

export async function getArticleMetadata(): Promise<WorldMonitorMetadataApiResponse> {
  const res = await axiosInstance.get<WorldMonitorMetadataApiResponse>(
    "/world-monitor/filters/metadata",
  );
  return res.data;
}

export interface ArticleFiltersRequest {
  search?: string;
  source?: string;
  processingStatus?: string;
  title?: string;
  author?: string;
  sourceType?: string;
  publishedFrom?: string;
  publishedTo?: string;
  ingestedFrom?: string;
  ingestedTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  tags?: string;
  locationName?: string;
  sort?: string;
}

export async function getArticles(
  filters: ArticleFiltersRequest,
  page: number,
  pageSize: number,
): Promise<WorldMonitorArticleListApiResponse> {
  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
  };

  if (filters.search?.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.source) {
    params.source = filters.source;
  }
  if (filters.processingStatus) {
    params.processing_status = filters.processingStatus;
  }
  if (filters.title?.trim()) {
    params.title = filters.title.trim();
  }
  if (filters.author?.trim()) {
    params.author = filters.author.trim();
  }
  if (filters.sourceType) {
    params.source_type = filters.sourceType;
  }
  if (filters.publishedFrom) {
    params.published_from = filters.publishedFrom;
  }
  if (filters.publishedTo) {
    params.published_to = filters.publishedTo;
  }
  if (filters.ingestedFrom) {
    params.ingested_from = filters.ingestedFrom;
  }
  if (filters.ingestedTo) {
    params.ingested_to = filters.ingestedTo;
  }
  if (filters.updatedFrom) {
    params.updated_from = filters.updatedFrom;
  }
  if (filters.updatedTo) {
    params.updated_to = filters.updatedTo;
  }
  if (filters.tags?.trim()) {
    params.tags = filters.tags.trim();
  }
  if (filters.locationName?.trim()) {
    params.location_name = filters.locationName.trim();
  }
  if (filters.sort) {
    params.sort = filters.sort;
  }

  const res = await axiosInstance.get<WorldMonitorArticleListApiResponse>(
    "/world-monitor/articles",
    { params },
  );
  return res.data;
}

export async function getArticleDetail(
  articleId: string,
): Promise<WorldMonitorArticleDetailApiResponse> {
  const res =
    await axiosInstance.get<WorldMonitorArticleDetailApiResponse>(
      `/world-monitor/articles/${articleId}`,
    );
  return res.data;
}
