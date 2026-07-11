import { useQuery } from "@tanstack/react-query";

import { getArticleDetail } from "../api/articlesApi";

import { mapArticleDetail } from "../model/mappers";

export const useArticleDetail = (articleId?: string) => {
  return useQuery({
    queryKey: ["world-monitor-articles", "detail", articleId],

    queryFn: async () => {
      const response = await getArticleDetail(articleId as string);
      return mapArticleDetail(response);
    },

    enabled: Boolean(articleId),
  });
};
