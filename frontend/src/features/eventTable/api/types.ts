// ── Atomic Events ─────────────────────────────────────────────────────────────

export interface EventApiResponse {
  id: string;
  type: string;
  severity: string;
  status: string;
  timestamp: string;
  start_time: string | null;
  end_time: string | null;
  vessels_involved: string[];
  location: unknown;
  temporality: string | null;
  event_source: string | null;
  model: string | null;
  compound: boolean;
  constituent_types: string[];
}

export interface EventListApiResponse {
  events: EventApiResponse[];
  total: number;
  limit: number;
  offset: number;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export interface MetadataColumnRaw {
  field: string;
  label: string;
  type: 'string' | 'number' | 'timestamp' | 'boolean';
  filterable: boolean;
  unique_values: (string | number)[];
}

export interface EventMetadataApiResponse {
  columns: MetadataColumnRaw[];
}

export interface MetadataValueApiResponse {
  field: string;
  values: (string | number)[];
}

// ── Compound Configs ──────────────────────────────────────────────────────────
// /api/compound-events/list returns the same envelope as atomic events

export interface CompoundConfigApiResponse {
  id: string;
  type: string;
  constituent_types: string[];
  description: string | null;
  severity: string;
  start_time: string | null;
  end_time: string | null;
  timestamp: string;
  compound: boolean;
}

export interface CompoundConfigListApiResponse {
  events: CompoundConfigApiResponse[];   // API key is "events", not "configs"
  total: number;
}

// ── Compound Instances ────────────────────────────────────────────────────────

export interface CompoundInstanceApiResponse {
  id: string;
  config_id: string;
  config_name: string;
  constituent_types: string[];
  vessels_involved: string[];
  start_time: string;
  end_time: string;
  severity: string;
  constituent_events: Record<string, string>;
}

export interface CompoundInstanceListApiResponse {
  instances: CompoundInstanceApiResponse[];
  total: number;
}
