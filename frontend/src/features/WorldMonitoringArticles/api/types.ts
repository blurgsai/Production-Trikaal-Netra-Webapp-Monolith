export interface ArticleMetadataApiResponse {
  sources: string[];

  processing_statuses: string[];
}

export interface ArticleApiResponse {
  id: string;

  title: string;

  summary?: string;

  source?: string;

  source_type?: string;

  image_url?: string;

  processing_status?: string;

  published?: string;

  linked_event_count?: number;

  tags?: string[];

  author?: string;
}

export interface ArticlesResponse {
  data: ArticleApiResponse[];

  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total: number;
  };
}

export interface ArticleLinkedEventApiResponse {
  id: string;

  title: string;

  summary?: string;

  threat_level: string;

  event_type: string;
}

export interface ArticleDetailApiResponse {
  id: string;

  title: string;

  summary?: string;

  source?: string;

  source_type?: string;

  image_url?: string;

  author?: string;

  published?: string;

  processing_status?: string;

  raw_content?: string;

  processed_content?: string;

  link?: string;

  tags?: string[];

  linked_events?: ArticleLinkedEventApiResponse[];

  locations?: {
    name: string;
  }[];
}