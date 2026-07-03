import type {
  OverviewSummaryApiResponse,
  RecentEventApiResponse,
  TrendApiResponse,
  HotspotApiResponse,
  DistributionApiResponse,
  EventDetailApiResponse,
} from "../api/types";

import type {
  DashboardSummary,
  DashboardRecentEvent,
  DashboardTrend,
  DashboardHotspot,
  DashboardDistributions,
} from "./types";
import type { EventDetail } from "@/shared/model/world-monitoring/types";

export const mapSummary = (
  raw: OverviewSummaryApiResponse,
): DashboardSummary => ({
  totalEvents: raw.active_events,
  criticalHighEvents: raw.critical_high_events,
  newEvents24h: raw.new_events_last_24h,
  activeAreas: raw.active_areas ?? raw.distinct_regions ?? 0,
  linkedArticleEvents: raw.linked_article_events,
});

export const mapRecentEvent = (
  raw: RecentEventApiResponse,
): DashboardRecentEvent => ({
  id: raw.id,
  title: raw.title,
  summary: raw.summary,
  threatLevel: raw.threat_level,
  eventType: raw.event_type,
  enrichedAt: raw.enriched_at,
  location: raw.primary_location?.name,
  source: raw.linked_article_preview?.source,
});

export const mapTrend = (raw: TrendApiResponse): DashboardTrend => ({
  bucket: raw.bucket,
  totalEvents: raw.total_events,
  criticalHighEvents: raw.critical_high_events,
});

export const mapTrends = (raw: TrendApiResponse[]): DashboardTrend[] =>
  raw.map(mapTrend);

export const mapHotspot = (raw: HotspotApiResponse): DashboardHotspot => ({
  locationName: raw.location_name,
  eventCount: raw.event_count,
  criticalHighCount: raw.critical_high_count,
  dominantEventType: raw.dominant_event_type,
  lastSeen: raw.last_seen,
});

export const mapHotspots = (raw: HotspotApiResponse[]): DashboardHotspot[] =>
  raw.map(mapHotspot);

export const mapDistributions = (
  raw: DistributionApiResponse,
): DashboardDistributions => ({
  severity: raw.severity,
  eventTypes: raw.event_types.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
  })),
});

export const mapEventDetail = (raw: EventDetailApiResponse): EventDetail => ({
  id: raw.id,

  title: raw.title,
  summary: raw.summary,

  threatLevel: raw.threat_level,
  eventType: raw.event_type,

  enrichedAt: raw.enriched_at,

  reasoning: raw.reasoning,

  relevanceScore: raw.relevance_score,

  primaryLocation: raw.primary_location,

  locations: raw.locations,

  structuredFields: raw.structured_fields,

  linkedArticlePreview: raw.linked_article_preview
    ? {
        ...raw.linked_article_preview,
        imageUrl: raw.linked_article_preview.image_url,
        sourceType: raw.linked_article_preview.source_type,
        processedContent: raw.linked_article_preview.processed_content,
        rawContent: raw.linked_article_preview.raw_content,
      }
    : undefined,
});
