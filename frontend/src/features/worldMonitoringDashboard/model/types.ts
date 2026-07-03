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
