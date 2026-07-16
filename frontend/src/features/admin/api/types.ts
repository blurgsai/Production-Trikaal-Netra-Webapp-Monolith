export interface UserApiResponse {
  id: string;
  username: string;
  role: string;
}

export interface UserCreateApiRequest {
  username: string;
  password: string;
  role: string;
}

export interface UserUpdateApiRequest {
  username?: string;
  password?: string;
  role?: string;
}

export interface DatabaseUploadApiResponse {
  _id: string;
  database_name: string;
  mmsi: string;
  data: Record<string, unknown>;
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
  data?: Record<string, unknown>;
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
