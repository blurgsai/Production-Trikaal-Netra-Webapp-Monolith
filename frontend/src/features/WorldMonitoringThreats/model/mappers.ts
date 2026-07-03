import type {
  ThreatEventApiResponse,
  ThreatMapMarkerApiResponse,
  ThreatMetadataApiResponse,
} from "../api/types";

import type { ThreatEvent, ThreatMapMarker, ThreatMetadata } from "./types";

import type { EventDetail } from "@/shared/model/world-monitoring/types";
import type { EventDetailApiResponse } from "../api/types";

export const mapMetadata = (
  raw: ThreatMetadataApiResponse,
): ThreatMetadata => ({
  threatLevels: raw.threat_levels,

  eventTypes: raw.event_types,

  sources: raw.sources,

  sortOptions: raw.sort_options,
});

export const mapEvent = (raw: ThreatEventApiResponse): ThreatEvent => ({
  id: raw.id,

  title: raw.title,

  summary: raw.summary,

  threatLevel: raw.threat_level,

  eventType: raw.event_type,

  enrichedAt: raw.enriched_at,

  location: raw.primary_location?.name,
});

export const mapEvents = (raw: ThreatEventApiResponse[]): ThreatEvent[] =>
  raw.map(mapEvent);

export const mapMarker = (
  raw: ThreatMapMarkerApiResponse,
): ThreatMapMarker => ({
  markerId: raw.marker_id,

  eventId: raw.event_id,

  title: raw.title,

  threatLevel: raw.threat_level,

  location: raw.location,
});

export const mapMarkers = (
  raw: ThreatMapMarkerApiResponse[],
): ThreatMapMarker[] => raw.map(mapMarker);

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