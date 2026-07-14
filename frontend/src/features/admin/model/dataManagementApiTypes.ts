export interface DatabaseUploadApiResponse {
  _id: string;
  database_name: string;
  mmsi: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PaginatedDatabaseUploadApiResponse {
  items: DatabaseUploadApiResponse[];
  total: number;
}

export interface DatabaseUploadCreateApiRequest {
  database_name: string;
  mmsi_field: string;
  file: File;
}

export interface DatabaseUploadUpdateApiRequest {
  database_name?: string;
  mmsi?: string;
  data?: Record<string, any>;
}

export interface VesselImageApiResponse {
  _id: string;
  imo: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  updated_at: string;
}

export interface PaginatedVesselImageApiResponse {
  items: VesselImageApiResponse[];
  total: number;
}

export interface VesselImageCreateApiRequest {
  files: File[];
  imos: string[];
}

export interface VesselImageUpdateApiRequest {
  imo: string;
}
