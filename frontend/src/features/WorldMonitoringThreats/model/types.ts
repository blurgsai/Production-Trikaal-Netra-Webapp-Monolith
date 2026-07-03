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

export type ThreatLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";
  
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
