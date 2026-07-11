import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type {
  OverviewSummaryApiResponse,
  OverviewTrendApiResponse,
  OverviewHotspotApiResponse,
  OverviewRecentApiResponse,
  OverviewDistributionsApiResponse,
  WorldMonitorEventDetailApiResponse,
  WorldMonitorEventListItemApiResponse,
  WorldMonitorMapMarkerApiResponse,
  WorldMonitorMetadataApiResponse,
  WorldMonitorArticleListItemApiResponse,
  WorldMonitorArticleDetailApiResponse,
  WorldMonitorLocationApiResponse,
} from "../api/types";

import type {
  DashboardSummary,
  DashboardRecentEvent,
  DashboardTrend,
  DashboardHotspot,
  DashboardDistributions,
  EventDetail,
  SeverityLevel,
  ThreatEvent,
  ThreatMapMarker,
  ThreatMetadata,
  Article,
  ArticleDetail,
  ArticleLinkedEvent,
  ArticleMetadata,
} from "./types";
import { severityConfig } from "./types";

dayjs.extend(relativeTime);

// ── Formatters ───────────────────────────────────────────────────────────────

export function getSeverityConfig(level?: string) {
  return severityConfig[level as SeverityLevel] ?? severityConfig.MEDIUM;
}

export function formatRelative(value?: string | null): string {
  if (!value) {
    return "Unknown time";
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.fromNow();
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not available";
  }

  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format("DD MMM YYYY, HH:mm");
}

export function formatEventTypeLabel(value?: string | null): string {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSourceTypeLabel(value?: string | null): string {
  if (!value) {
    return "Unknown feed";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

// ── Mappers ──────────────────────────────────────────────────────────────────

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
  raw: WorldMonitorEventListItemApiResponse,
): DashboardRecentEvent => ({
  id: raw.id,
  title: raw.title,
  summary: raw.summary,
  threatLevel: raw.threat_level,
  eventType: raw.event_type,
  enrichedAt: raw.enriched_at ?? "",
  location: raw.primary_location?.name,
  source: raw.linked_article_preview?.source,
});

export const mapRecentEvents = (
  raw: OverviewRecentApiResponse,
): DashboardRecentEvent[] => raw.data.map(mapRecentEvent);

export const mapTrend = (raw: OverviewTrendApiResponse): DashboardTrend => ({
  bucket: raw.bucket,
  totalEvents: raw.total_events,
  criticalHighEvents: raw.critical_high_events,
});

export const mapTrends = (
  raw: OverviewTrendApiResponse[],
): DashboardTrend[] => raw.map(mapTrend);

export const mapHotspot = (
  raw: OverviewHotspotApiResponse,
): DashboardHotspot => ({
  locationName: raw.location_name,
  eventCount: raw.event_count,
  criticalHighCount: raw.critical_high_count,
  dominantEventType: raw.dominant_event_type,
  lastSeen: raw.last_seen ?? "",
});

export const mapHotspots = (
  raw: OverviewHotspotApiResponse[],
): DashboardHotspot[] => raw.map(mapHotspot);

export const mapDistributions = (
  raw: OverviewDistributionsApiResponse,
): DashboardDistributions => ({
  severity: raw.severity.map((item) => ({
    key: item.key,
    value: item.value,
  })),
  eventTypes: raw.event_types.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
  })),
});

function mapLocation(
  raw: WorldMonitorLocationApiResponse,
): { name: string; lat?: number; lng?: number; role?: string } {
  return {
    name: raw.name,
    lat: raw.lat,
    lng: raw.lng,
    role: raw.role,
  };
}

export const mapEventDetail = (
  raw: WorldMonitorEventDetailApiResponse,
): EventDetail => ({
  id: raw.id,

  title: raw.title,
  summary: raw.summary,

  threatLevel: raw.threat_level,
  eventType: raw.event_type,

  enrichedAt: raw.enriched_at,

  reasoning: raw.reasoning,

  relevanceScore: raw.relevance_score,

  primaryLocation: raw.primary_location
    ? mapLocation(raw.primary_location)
    : undefined,

  locations: raw.locations.map(mapLocation),

  structuredFields: raw.structured_fields,

  linkedArticlePreview: raw.linked_article_preview
    ? {
        id: raw.linked_article_preview.id,
        title: raw.linked_article_preview.title,
        summary: raw.linked_article_preview.summary,
        published: raw.linked_article_preview.published,
        imageUrl: raw.linked_article_preview.image_url,
        source: raw.linked_article_preview.source,
        sourceType: raw.linked_article_preview.source_type,
        author: raw.linked_article_preview.author,
        processedContent: raw.linked_article_preview.processed_content,
        rawContent: raw.linked_article_preview.raw_content,
        tags: raw.linked_article_preview.tags,
        locations: raw.linked_article_preview.locations.map(mapLocation),
      }
    : undefined,
});

// ── Article image helper ─────────────────────────────────────────────────────

export function getArticleImage(article?: { imageUrl?: string | null } | null): string | null {
  return article?.imageUrl ?? null;
}

// ── Threat mappers ────────────────────────────────────────────────────────────

export const mapWorldMonitorMetadata = (
  raw: WorldMonitorMetadataApiResponse,
): ThreatMetadata => ({
  threatLevels: raw.threat_levels,
  eventTypes: raw.event_types,
  sources: raw.sources,
  sortOptions: raw.sort_options,
});

export const mapThreatMetadata = mapWorldMonitorMetadata;

export const mapThreatEvent = (
  raw: WorldMonitorEventListItemApiResponse,
): ThreatEvent => ({
  id: raw.id,
  title: raw.title,
  summary: raw.summary,
  threatLevel: raw.threat_level,
  eventType: raw.event_type,
  enrichedAt: raw.enriched_at ?? "",
  location: raw.primary_location?.name,
});

export const mapThreatEvents = (
  raw: WorldMonitorEventListItemApiResponse[],
): ThreatEvent[] => raw.map(mapThreatEvent);

export const mapThreatMarker = (
  raw: WorldMonitorMapMarkerApiResponse,
): ThreatMapMarker => ({
  markerId: raw.marker_id,
  eventId: raw.event_id,
  title: raw.title,
  threatLevel: raw.threat_level,
  location: {
    name: raw.location.name,
    lat: raw.location.lat,
    lng: raw.location.lng,
  },
});

export const mapThreatMarkers = (
  raw: WorldMonitorMapMarkerApiResponse[],
): ThreatMapMarker[] => raw.map(mapThreatMarker);

// ── Article mappers ───────────────────────────────────────────────────────────

export const mapArticle = (
  raw: WorldMonitorArticleListItemApiResponse,
): Article => ({
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

export const mapArticles = (
  raw: WorldMonitorArticleListItemApiResponse[],
): Article[] => raw.map(mapArticle);

export const mapLinkedEvent = (
  raw: WorldMonitorEventListItemApiResponse,
): ArticleLinkedEvent => ({
  id: raw.id,
  title: raw.title,
  summary: raw.summary,
  threatLevel: raw.threat_level,
  eventType: raw.event_type,
});

export const mapArticleDetail = (
  raw: WorldMonitorArticleDetailApiResponse,
): ArticleDetail => ({
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
  locations: (raw.locations ?? []).map((loc) => ({ name: loc.name })),
  link: raw.link,
});

export const mapArticleMetadata = (
  raw: WorldMonitorMetadataApiResponse,
): ArticleMetadata => ({
  sources: raw.sources,
  processingStatuses: raw.processing_statuses,
});
