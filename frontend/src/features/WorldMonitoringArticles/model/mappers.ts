import type {
  ArticleApiResponse,
  ArticleDetailApiResponse,
  ArticleLinkedEventApiResponse,
  ArticleMetadataApiResponse,
} from "../api/types";

import type {
  Article,
  ArticleDetail,
  ArticleLinkedEvent,
  ArticleMetadata,
} from "./types";

export const mapArticle = (raw: ArticleApiResponse): Article => ({
  id: raw.id,

  title: raw.title,

  summary: raw.summary,

  source: raw.source,

  sourceType: raw.source_type,

  imageUrl: raw.image_url,

  processingStatus: raw.processing_status,

  published: raw.published,

  linkedEventCount: raw.linked_event_count ?? 0,

  tags: raw.tags ?? [],

  author: raw.author,
});

export const mapArticles = (raw: ArticleApiResponse[]): Article[] =>
  raw.map(mapArticle);

export const mapLinkedEvent = (
  raw: ArticleLinkedEventApiResponse,
): ArticleLinkedEvent => ({
  id: raw.id,

  title: raw.title,

  summary: raw.summary,

  threatLevel: raw.threat_level,

  eventType: raw.event_type,
});

export const mapArticleDetail = (raw: ArticleDetailApiResponse): ArticleDetail => ({
  id: raw.id,

  title: raw.title,

  summary: raw.summary,

  source: raw.source,

  sourceType: raw.source_type,

  imageUrl: raw.image_url,

  author: raw.author,

  published: raw.published,

  processingStatus: raw.processing_status,

  rawContent: raw.raw_content,

  processedContent: raw.processed_content,

  tags: raw.tags ?? [],

  linkedEvents: (raw.linked_events ?? []).map(mapLinkedEvent),

  locations: raw.locations ?? [],
  link: raw.link,
});

export const mapArticleMetadata = (
  raw: ArticleMetadataApiResponse,
): ArticleMetadata => ({
  sources: raw.sources,

  processingStatuses: raw.processing_statuses,
});