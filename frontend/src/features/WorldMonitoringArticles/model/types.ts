export interface ArticleMetadata {
  sources: string[];

  processingStatuses: string[];
}

export interface ArticleFilters {
  search: string;

  source: string;

  processingStatus: string;
}

export interface Article {
  id: string;

  title: string;

  summary?: string;

  source?: string;

  sourceType?: string;

  imageUrl?: string;

  processingStatus?: string;

  published?: string;

  linkedEventCount: number;
  tags?: string[];
  author?: string;
}

export interface ArticleLinkedEvent {
  id: string;

  title: string;

  summary?: string;

  threatLevel: string;

  eventType: string;
}

export interface ArticleDetail {
  id: string;

  title: string;

  summary?: string;

  source?: string;

  sourceType?: string;

  imageUrl?: string;

  author?: string;

  published?: string;

  processingStatus?: string;

  rawContent?: string;

  processedContent?: string;

  tags: string[];

  linkedEvents: ArticleLinkedEvent[];
  link?: string;

  locations: {
    name: string;
  }[];
}

export interface ArticlePagination {
  page: number;

  pageSize: number;

  totalPages: number;

  total: number;
}
