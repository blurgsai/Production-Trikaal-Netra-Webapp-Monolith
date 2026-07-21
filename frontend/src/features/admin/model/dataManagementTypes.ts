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
  timestampField?: string;
  timestampFormat?: string;
  file: File;
}

export interface DatabaseUploadUpdateRequest {
  databaseName?: string;
  mmsi?: string;
  data?: Record<string, unknown>;
}

export interface VesselImage {
  id: string;
  imo: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface PaginatedVesselImages {
  items: VesselImage[];
  total: number;
}

export interface VesselImageCreateRequest {
  files: File[];
  imos: string[];
}

export interface VesselImageUpdateRequest {
  imo: string;
}
