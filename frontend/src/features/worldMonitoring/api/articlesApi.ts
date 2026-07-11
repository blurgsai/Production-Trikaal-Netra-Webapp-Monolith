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
