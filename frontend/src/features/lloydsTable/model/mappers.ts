import type { MetadataApiResponse, LloydsTableApiResponse } from "../api/types";

import type { LloydsMetadata, LloydsTableData } from "./types";

export const mapMetadata = (response: MetadataApiResponse): LloydsMetadata => ({
  columns: Object.entries(response.fields).map(([field, config]) => ({
    field,
    label: config.label,
    type: config.type,
  })),
});

export const mapTableData = (
  response: LloydsTableApiResponse,
): LloydsTableData => ({
  rows: response.data,
  pagination: {
    page: response.pagination.page,
    pageSize: response.pagination.page_size,
    totalRecords: response.pagination.total_records,
    totalPages: response.pagination.total_pages,
    hasNext: response.pagination.has_next,
    hasPrev: response.pagination.has_prev,
  },
});
