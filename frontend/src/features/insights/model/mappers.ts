import type { InsightsSummaryApiResponse } from "../api/types";
import type { InsightCard } from "./types";

export function formatTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function mapInsightsSummaryToCards(
  raw: InsightsSummaryApiResponse,
): InsightCard[] {
  const vesselCard: InsightCard = {
    key: "total-vessels",
    label: "Total Vessels",
    value: raw.vessel_count,
    helper: "Total vessels currently tracked",
  };

  const eventCards: InsightCard[] = [...raw.event_type_counts]
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      key: item.type,
      label: formatTypeLabel(item.type),
      value: item.count,
      helper: `Count of ${item.type} events`,
    }));

  return [vesselCard, ...eventCards];
}
