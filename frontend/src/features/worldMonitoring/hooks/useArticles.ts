import { useQuery } from "@tanstack/react-query";

import {
  getArticles,
  getArticleMetadata,
} from "../api/articlesApi";

import {
  mapArticles,
  mapArticleMetadata,
} from "../model/mappers";

import type { ArticleFilters } from "../model/types";

const ARTICLES_KEY = "world-monitor-articles";

export const useArticles = (
  filters: ArticleFilters,
  page: number,
  pageSize: number,
) => {
  return useQuery({
    queryKey: [ARTICLES_KEY, filters, page, pageSize],

    queryFn: async () => {
      const [metadataResponse, articlesResponse] = await Promise.all([
        getArticleMetadata(),
        getArticles(filters, page, pageSize),
      ]);

      return {
        metadata: mapArticleMetadata(metadataResponse),
        articles: mapArticles(articlesResponse.data),
        pagination: {
          page: articlesResponse.pagination.page,
          pageSize: articlesResponse.pagination.page_size,
          totalPages: articlesResponse.pagination.total_pages,
          total: articlesResponse.pagination.total,
        },
      };
    },
  });
};

