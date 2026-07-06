// ── Atomic Event ──────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  type: string;
  severity: string;
  status: string;
  timestamp: string;
  startTime: string | null;
  endTime: string | null;
  vessels: string[];
  compound: boolean;
  constituentTypes: string[];
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export type FilterableFieldType = 'string' | 'number' | 'timestamp' | 'boolean';

export interface EventMetadataColumn {
  field: string;
  label: string;
  type: FilterableFieldType;
  uniqueValues: (string | number)[];
}

// ── Filters ───────────────────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

export interface EventFilter {
  field: string;
  operator: FilterOperator;
  value: string;
  value2?: string;   // used only for 'between'
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  rowsPerPage: number;
}

// ── Compound ──────────────────────────────────────────────────────────────────

export interface CompoundConfig {
  id: string;
  type: string;
  constituentTypes: string[];
  description: string | null;
  severity: string;
  startTime: string | null;
  endTime: string | null;
  timestamp: string;
}

export interface CompoundInstance {
  id: string;
  configId: string;
  configName: string;
  constituentTypes: string[];
  vessels: string[];
  startTime: string;
  endTime: string;
  severity: string;
}
