import type { TableMetadata } from "@/shared/model/table/types";

export interface LloydsPagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LloydsTableData {
  rows: Record<string, unknown>[];
  pagination: LloydsPagination;
}

export type LloydsMetadata = TableMetadata;
