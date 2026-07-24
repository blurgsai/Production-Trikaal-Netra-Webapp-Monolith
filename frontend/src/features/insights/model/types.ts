export interface InsightsKpi {
  id: string;
  label: string;
  value: number;
}

export interface InsightsEventTypeShare {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export type InsightsTimelineRange = "1y" | "6m" | "3m" | "1m" | "1w";

export interface InsightsTimelinePoint {
  date: string;
  count: number;
}

export interface InsightsCategoryItem {
  key: string;
  label: string;
  count: number;
}

export interface InsightsCategory {
  id: string;
  title: string;
  total: number;
  items: InsightsCategoryItem[];
}

export interface InsightsDashboard {
  kpis: InsightsKpi[];
  eventTypeShares: InsightsEventTypeShare[];
  eventTypeTotal: number;
  timeline: InsightsTimelinePoint[];
  categories: InsightsCategory[];
}
