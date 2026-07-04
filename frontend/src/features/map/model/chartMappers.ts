import type { ChartAggregation, ChartConfig, ChartDataFeature, ChartDataPoint, ChartDataResult } from "./chartTypes";

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

function aggregateValues(values: number[], aggregation: ChartAggregation): number {
  if (aggregation === "count") return values.length;
  if (values.length === 0) return 0;
  switch (aggregation) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
    default: return values.length;
  }
}

export function mapFeaturesToChartData(
  features: ChartDataFeature[],
  config: ChartConfig
): ChartDataResult {
  const groups = new Map<string, number[]>();

  for (const feature of features) {
    const rawLabel = feature.properties?.[config.xAxisColumn];
    const label = rawLabel === null || rawLabel === undefined ? "Unknown" : String(rawLabel);

    if (config.aggregation === "count") {
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(1);
    } else {
      const numValue = toNumber(feature.properties?.[config.yAxisColumn]);
      if (numValue === null) continue;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(numValue);
    }
  }

  let points: ChartDataPoint[] = Array.from(groups.entries()).map(([label, values]) => ({
    label,
    value: aggregateValues(values, config.aggregation),
  }));

  points.sort((a, b) => b.value - a.value);

  const maxPoints = config.maxDataPoints ?? 50;
  if (points.length > maxPoints) {
    const top = points.slice(0, maxPoints - 1);
    const rest = points.slice(maxPoints - 1);
    const otherSum = rest.reduce((a, p) => a + p.value, 0);
    top.push({ label: "Other", value: otherSum });
    points = top;
  }

  return {
    points,
    total: points.length,
  };
}
