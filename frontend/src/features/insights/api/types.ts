export interface EventTypeCountApiResponse {
  type: string;
  count: number;
}

export interface InsightsSummaryApiResponse {
  vessel_count: number;
  event_type_counts: EventTypeCountApiResponse[];
}
