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
    color: "#2ec27e",
    bg: "rgba(46, 194, 126, 0.14)",
    border: "rgba(46, 194, 126, 0.42)",
  },
  MEDIUM: {
    label: "Medium",
    color: "#f6c445",
    bg: "rgba(246, 196, 69, 0.14)",
    border: "rgba(246, 196, 69, 0.42)",
  },
  HIGH: {
    label: "High",
    color: "#ff8a3d",
    bg: "rgba(255, 138, 61, 0.14)",
    border: "rgba(255, 138, 61, 0.42)",
  },
  CRITICAL: {
    label: "Critical",
    color: "#ff4d67",
    bg: "rgba(255, 77, 103, 0.16)",
    border: "rgba(255, 77, 103, 0.44)",
  },
} as const;

export const worldMonitorPalette = {
  background: "#07111f",
  panel: "#0d1a2c",
  panelAlt: "#12233b",
  panelMuted: "#091625",
  border: "rgba(143, 179, 225, 0.18)",
  borderStrong: "rgba(143, 179, 225, 0.28)",
  text: "#edf4ff",
  textSecondary: "#7f93ac",
  textMuted: "#93a8c7",
  accent: "#4ec3ff",
  accentSoft: "rgba(78, 195, 255, 0.16)",
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
