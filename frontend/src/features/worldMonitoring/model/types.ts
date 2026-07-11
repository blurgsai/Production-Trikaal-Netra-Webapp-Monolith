import { defenseColors } from "@/shared/theme";

export interface Location {
  name: string;
  lat?: number;
  lng?: number;
  role?: string;
}

export interface StructuredField {
  key: string;
  label: string;
  value: string;
}

export interface ArticlePreview {
  id: string;
  title: string;
  summary?: string;
  published?: string;

  imageUrl?: string;

  source?: string;
  sourceType?: string;
  author?: string;

  processedContent?: string;
  rawContent?: string;

  tags?: string[];

  locations?: Location[];
}

export interface EventDetail {
  id: string;

  title: string;
  summary: string;

  threatLevel: string;
  eventType: string;

  enrichedAt?: string;

  reasoning?: string;

  relevanceScore?: number;

  primaryLocation?: Location;

  locations?: Location[];

  structuredFields?: StructuredField[];

  linkedArticlePreview?: ArticlePreview;
}

export interface EventDetailDialogProps {
  open: boolean;
  loading: boolean;

  eventDetail: EventDetail | null;

  articleDetail?: ArticlePreview | null;

  onClose: () => void;

  onOpenArticle?: (articleId: string) => void;
  variant?: "dialog" | "inline";
}

export interface DashboardSummary {
  totalEvents: number;
  criticalHighEvents: number;
  newEvents24h: number;
  activeAreas: number;
  linkedArticleEvents: number;
}

export interface DashboardTrend {
  bucket: string;
  totalEvents: number;
  criticalHighEvents: number;
}

export interface DashboardHotspot {
  locationName: string;
  eventCount: number;
  criticalHighCount: number;
  dominantEventType?: string;
  lastSeen: string;
}

export interface DashboardRecentEvent {
  id: string;
  title: string;
  summary: string;
  threatLevel: string;
  eventType: string;
  enrichedAt: string;
  location?: string;
  source?: string;
}

export interface DashboardSeverityDistribution {
  key: string;
  value: number;
  color?: string;
}

export interface DashboardEventTypeDistribution {
  key: string;
  label: string;
  value: number;
}

export interface DashboardDistributions {
  severity: DashboardSeverityDistribution[];
  eventTypes: DashboardEventTypeDistribution[];
}

export const severityConfig = {
  LOW: {
    label: "Low",
    color: defenseColors.status.success,
    bg: `${defenseColors.status.success}24`,
    border: `${defenseColors.status.success}6b`,
  },
  MEDIUM: {
    label: "Medium",
    color: defenseColors.status.info,
    bg: `${defenseColors.status.info}24`,
    border: `${defenseColors.status.info}6b`,
  },
  HIGH: {
    label: "High",
    color: defenseColors.status.warning,
    bg: `${defenseColors.status.warning}24`,
    border: `${defenseColors.status.warning}6b`,
  },
  CRITICAL: {
    label: "Critical",
    color: defenseColors.status.error,
    bg: `${defenseColors.status.error}29`,
    border: `${defenseColors.status.error}70`,
  },
} as const;

export type SeverityLevel = keyof typeof severityConfig;

// ── Threats model types ───────────────────────────────────────────────────────

export interface ThreatFilters {
  keyword: string;
  eventTypes: string[];
  threatLevels: string[];
  sources: string[];
  sort: string;
}

export interface ThreatEvent {
  id: string;
  title: string;
  summary: string;
  threatLevel: string;
  eventType: string;
  enrichedAt: string;
  location?: string;
}

export interface ThreatMapMarker {
  markerId: string;
  eventId: string;
  title: string;
  threatLevel: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
}

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ThreatPagination {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
}

export interface ThreatMetadata {
  threatLevels: string[];
  eventTypes: string[];
  sources: string[];
  sortOptions: {
    value: string;
    label: string;
  }[];
}

// ── Articles model types ──────────────────────────────────────────────────────

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
