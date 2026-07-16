export interface DatabaseUpload {
  id: string;
  databaseName: string;
  mmsi: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDatabaseUploads {
  items: DatabaseUpload[];
  total: number;
}

export interface DatabaseUploadCreateRequest {
  databaseName: string;
  mmsiField: string;
  file: File;
}

export interface DatabaseUploadUpdateRequest {
  databaseName?: string;
  mmsi?: string;
  data?: Record<string, unknown>;
}
