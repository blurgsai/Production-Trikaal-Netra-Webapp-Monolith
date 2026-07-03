export interface MetadataFieldApi {
  label: string;
  type: string;
}

export interface MetadataApiResponse {
  success: boolean;
  fields: Record<string, MetadataFieldApi>;
  total_fields: number;
}

export interface PaginationApiResponse {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface LloydsTableApiResponse {
  success: boolean;
  data: Record<string, unknown>[];
  pagination: PaginationApiResponse;
}

export interface ExportFieldRequest {
  field: string;
  label: string;
}

export interface DistinctValuesResponse {
  success: boolean;
  field: string;
  values: string[];
  total: number;
}
