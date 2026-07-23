export interface InsightsKpiApiResponse {
  id: string;
  label: string;
  value: number;
}

export interface InsightsEventTypeShareApiResponse {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface InsightsTimelinePointApiResponse {
  date: string;
  count: number;
}

export interface InsightsCategoryItemApiResponse {
  key: string;
  label: string;
  count: number;
}

export interface InsightsCategoryApiResponse {
  id: string;
  title: string;
  total: number;
  items: InsightsCategoryItemApiResponse[];
}

export interface InsightsDashboardApiResponse {
  kpis: InsightsKpiApiResponse[];
  event_type_shares: InsightsEventTypeShareApiResponse[];
  event_type_total: number;
  timeline: InsightsTimelinePointApiResponse[];
  categories: InsightsCategoryApiResponse[];
}

export interface InsightsTimelineApiResponse {
  timeline: InsightsTimelinePointApiResponse[];
}
