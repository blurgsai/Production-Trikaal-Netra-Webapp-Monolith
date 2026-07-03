import type {
  Location,
  StructuredField,
} from "@/shared/model/world-monitoring/types";

export interface OverviewSummaryApiResponse {
  active_events: number;
  critical_high_events: number;
  new_events_last_24h: number;
  active_areas?: number;
  distinct_regions?: number;
  linked_article_events: number;
}

export interface TrendApiResponse {
  bucket: string;
  total_events: number;
  critical_high_events: number;
}

export interface HotspotApiResponse {
  location_name: string;
  event_count: number;
  critical_high_count: number;
  dominant_event_type?: string;
  last_seen: string;
}

export interface RecentEventApiResponse {
  id: string;
  title: string;
  summary: string;
  threat_level: string;
  event_type: string;
  enriched_at: string;
  primary_location?: {
    name: string;
  };
  linked_article_preview?: {
    source?: string;
  };
}

export interface RecentEventsResponse {
  data: RecentEventApiResponse[];
}

export interface DistributionApiResponse {
  severity: {
    key: string;
    value: number;
  }[];

  event_types: {
    key: string;
    label: string;
    value: number;
  }[];

  sources: {
    key: string;
    value: number;
  }[];
}

export interface EventDetailApiResponse {
  id: string;

  title: string;
  summary: string;

  threat_level: string;
  event_type: string;

  enriched_at?: string;

  reasoning?: string;

  relevance_score?: number;

  primary_location?: Location;

  locations?: Location[];

  structured_fields?: StructuredField[];

  linked_article_preview?: {
    id: string;
    title: string;
    summary?: string;
    published?: string;

    image_url?: string;

    source?: string;
    source_type?: string;
    author?: string;

    processed_content?: string;
    raw_content?: string;

    tags?: string[];

    locations?: Location[];
  };
}
