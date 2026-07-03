import axiosInstance from "@/shared/api/client";

import type {
  ArticlesResponse,
  ArticleDetailApiResponse,
} from "./types";

export interface ArticleFiltersRequest {
  search?: string;

  source?: string;

  processingStatus?: string;
}

export const getArticles = async (
  filters: ArticleFiltersRequest,
  page: number,
  pageSize: number,
): Promise<ArticlesResponse> => {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.source) {
    params.set("source", filters.source);
  }

  if (filters.processingStatus) {
    params.set("processing_status", filters.processingStatus);
  }

  params.set("page", String(page));
  params.set("page_size", String(pageSize));

  const response = await axiosInstance.get(
    `/world-monitor/articles?${params.toString()}`,
  );

  return response.data;
};

export const getArticleDetail = async (
  articleId: string,
): Promise<ArticleDetailApiResponse> => {
  const response = await axiosInstance.get(
    `/world-monitor/articles/${articleId}`,
  );

  return response.data;
};

export const getArticleMetadata = async () => {
  const response = await axiosInstance.get("/world-monitor/filters/metadata");

  return response.data;
};