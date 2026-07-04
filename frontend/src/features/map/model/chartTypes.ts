export type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

export type ChartAggregation = "count" | "sum" | "avg" | "min" | "max";

export interface ChartConfig {
  id: string;
  title: string;
  chartType: ChartType;
  xAxisColumn: string;
  yAxisColumn: string;
  aggregation: ChartAggregation;
  maxDataPoints?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartDataResult {
  points: ChartDataPoint[];
  total: number;
}
