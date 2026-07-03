import type {
  StructuredField,
  Location,
} from "@/shared/model/world-monitoring/types";

export interface ThreatMetadataApiResponse {
  threat_levels: string[];
  event_types: string[];
  sources: string[];
  sort_options: {
    value: string;
    label: string;
  }[];
}

export interface ThreatEventApiResponse {
  id: string;

  title: string;
  summary: string;

  threat_level: string;
  event_type: string;

  enriched_at: string;

  primary_location?: {
    name: string;
  };
}

export interface ThreatEventsResponse {
  data: ThreatEventApiResponse[];

  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total: number;
  };
}

export interface ThreatMapMarkerApiResponse {
  marker_id: string;

  event_id: string;

  title: string;

  threat_level: string;

  location: {
    name: string;
    lat: number;
    lng: number;
  };
}

export interface ThreatMapEventsResponse {
  data: ThreatMapMarkerApiResponse[];
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
