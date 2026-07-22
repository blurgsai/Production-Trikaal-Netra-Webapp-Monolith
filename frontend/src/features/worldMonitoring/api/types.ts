// ── Shared types ──────────────────────────────────────────────────────────────

export interface WorldMonitorLocationApiResponse {
  name: string;
  lat: number;
  lng: number;
  role: string;
}

export interface LinkedArticlePreviewApiResponse {
  id: string;
  external_article_id?: string;
  title: string;
  source?: string;
  source_type?: string;
  author?: string;
  published?: string;
  summary?: string;
  image_url?: string;
  processed_content?: string;
  raw_content?: string;
  tags: string[];
  locations: WorldMonitorLocationApiResponse[];
  link?: string;
}

export interface StructuredFieldApiResponse {
  key: string;
  label: string;
  value: string;
}

export interface PaginationApiResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Metadata API types ────────────────────────────────────────────────────────

export interface WorldMonitorMetadataApiResponse {
  success: boolean;
  event_types: string[];
  threat_levels: string[];
  sources: string[];
  source_types: string[];
  processing_statuses: string[];
  sort_options: {
    value: string;
    label: string;
  }[];
}

// ── Threats (events) API types ────────────────────────────────────────────────

export interface WorldMonitorEventListItemApiResponse {
  id: string;
  event_id?: string;
  title: string;
  event_type: string;
  threat_level: string;
  summary?: string;
  reasoning?: string;
  primary_location?: WorldMonitorLocationApiResponse;
  locations: WorldMonitorLocationApiResponse[];
  relevance_score?: number;
  enriched_at?: string;
  linked_article_preview?: LinkedArticlePreviewApiResponse;
}

export interface WorldMonitorEventListApiResponse {
  success: boolean;
  data: WorldMonitorEventListItemApiResponse[];
  pagination: PaginationApiResponse;
}

export interface WorldMonitorMapMarkerApiResponse {
  marker_id: string;
  event_id: string;
  title: string;
  event_type: string;
  threat_level: string;
  relevance_score?: number;
  enriched_at?: string;
  location: WorldMonitorLocationApiResponse;
}

export interface WorldMonitorMapApiResponse {
  success: boolean;
  data: WorldMonitorMapMarkerApiResponse[];
  total_events: number;
  total_markers: number;
}

export interface WorldMonitorEventDetailApiResponse
  extends WorldMonitorEventListItemApiResponse {
  structured_fields: StructuredFieldApiResponse[];
}

// ── Articles API types ────────────────────────────────────────────────────────

export interface WorldMonitorArticleListItemApiResponse {
  id: string;
  external_article_id?: string;
  title: string;
  source?: string;
  source_type?: string;
  author?: string;
  published?: string;
  updated?: string;
  ingested_at?: string;
  summary?: string;
  image_url?: string;
  tags?: string[];
  processing_status?: string;
  linked_event_count?: number;
  location_count?: number;
  link?: string;
}

export interface WorldMonitorArticleListApiResponse {
  success: boolean;
  data: WorldMonitorArticleListItemApiResponse[];
  pagination: PaginationApiResponse;
}

export interface WorldMonitorArticleDetailApiResponse
  extends WorldMonitorArticleListItemApiResponse {
  processed_content?: string;
  raw_content?: string;
  locations: WorldMonitorLocationApiResponse[];
  linked_events: WorldMonitorEventListItemApiResponse[];
}

// ── Dashboard overview API types ──────────────────────────────────────────────

export interface OverviewSummaryApiResponse {
  active_events: number;
  critical_high_events: number;
  new_events_last_24h: number;
  distinct_regions: number;
  articles_ingested_today: number;
  active_areas: number;
  review_required_events: number;
  linked_article_events: number;
  avg_enrichment_lag_hours?: number;
}

export interface OverviewTrendApiResponse {
  bucket: string;
  total_events: number;
  critical_high_events: number;
}

export interface OverviewDistributionItemApiResponse {
  key: string;
  label: string;
  value: number;
}

export interface OverviewDistributionsApiResponse {
  severity: OverviewDistributionItemApiResponse[];
  event_types: OverviewDistributionItemApiResponse[];
  sources: OverviewDistributionItemApiResponse[];
}

export interface OverviewHotspotApiResponse {
  location_name: string;
  event_count: number;
  critical_high_count: number;
  dominant_event_type?: string;
  last_seen?: string;
}

export interface OverviewRecentApiResponse {
  success: boolean;
  data: WorldMonitorEventListItemApiResponse[];
}
