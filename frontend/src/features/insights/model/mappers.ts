import type {
  InsightsDashboardApiResponse,
  InsightsTimelineApiResponse,
} from "../api/types";
import type { InsightsDashboard, InsightsTimelinePoint } from "./types";

export function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function mapInsightsTimeline(
  raw: InsightsTimelineApiResponse,
): InsightsTimelinePoint[] {
  return raw.timeline.map((t) => ({
    date: t.date,
    count: t.count,
  }));
}

export function mapInsightsDashboard(
  raw: InsightsDashboardApiResponse,
): InsightsDashboard {
  return {
    kpis: raw.kpis.map((k) => ({
      id: k.id,
      label: k.label,
      value: k.value,
    })),
    eventTypeTotal: raw.event_type_total,
    eventTypeShares: raw.event_type_shares.map((s) => ({
      key: s.key,
      label: s.label || formatTypeLabel(s.key),
      count: s.count,
      percent: s.percent,
    })),
    timeline: raw.timeline.map((t) => ({
      date: t.date,
      count: t.count,
    })),
    categories: raw.categories.map((c) => ({
      id: c.id,
      title: c.title,
      total: c.total,
      items: c.items.map((item) => ({
        key: item.key,
        label: item.label || formatTypeLabel(item.key),
        count: item.count,
      })),
    })),
  };
}
