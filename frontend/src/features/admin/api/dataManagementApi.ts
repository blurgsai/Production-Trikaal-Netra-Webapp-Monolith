import axiosInstance from "@/shared/api/client";

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
  timestamp_field?: string;
  timestamp_format?: string;
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

// Database Uploads API
export async function fetchDatabaseUploads(params?: {
  database_name?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedDatabaseUploadApiResponse> {
  const res = await axiosInstance.get<PaginatedDatabaseUploadApiResponse>(
    "/admin/data-management/database-uploads",
    { params },
  );
  return res.data;
}

export async function fetchDatabaseUpload(
  id: string,
): Promise<DatabaseUploadApiResponse> {
  const res = await axiosInstance.get<DatabaseUploadApiResponse>(
    `/admin/data-management/database-uploads/${id}`,
  );
  return res.data;
}

export async function createDatabaseUpload(
  data: DatabaseUploadCreateApiRequest,
): Promise<DatabaseUploadApiResponse[]> {
  const formData = new FormData();
  formData.append("database_name", data.database_name);
  formData.append("mmsi_field", data.mmsi_field);
  if (data.timestamp_field) {
    formData.append("timestamp_field", data.timestamp_field);
  }
  if (data.timestamp_format) {
    formData.append("timestamp_format", data.timestamp_format);
  }
  if (data.file) {
    formData.append("file", data.file);
  }

  const res = await axiosInstance.post<DatabaseUploadApiResponse[]>(
    "/admin/data-management/database-uploads",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data;
}

export async function updateDatabaseUpload(
  id: string,
  data: DatabaseUploadUpdateApiRequest,
): Promise<DatabaseUploadApiResponse> {
  const res = await axiosInstance.patch<DatabaseUploadApiResponse>(
    `/admin/data-management/database-uploads/${id}`,
    data,
  );
  return res.data;
}

export async function deleteDatabaseUpload(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/data-management/database-uploads/${id}`);
}

export async function bulkDeleteDatabaseUploads(ids: string[]): Promise<{ deleted: number }> {
  const res = await axiosInstance.post<{ deleted: number }>(
    "/admin/data-management/database-uploads/bulk-delete",
    ids,
  );
  return res.data;
}

export async function fetchDatabaseNames(): Promise<string[]> {
  const res = await axiosInstance.get<string[]>(
    "/admin/data-management/database-names",
  );
  return res.data;
}

export async function fetchVesselImageTypes(): Promise<string[]> {
  const res = await axiosInstance.get<string[]>(
    "/admin/data-management/vessel-image-types",
  );
  return res.data;
}

// Vessel Images API
export async function fetchVesselImages(params?: {
  search?: string;
  mime_type?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedVesselImageApiResponse> {
  const res = await axiosInstance.get<PaginatedVesselImageApiResponse>(
    "/admin/data-management/vessel-images",
    { params },
  );
  return res.data;
}

export async function fetchVesselImage(id: string): Promise<VesselImageApiResponse> {
  const res = await axiosInstance.get<VesselImageApiResponse>(
    `/admin/data-management/vessel-images/${id}`,
  );
  return res.data;
}

export async function createVesselImage(
  data: VesselImageCreateApiRequest,
): Promise<VesselImageApiResponse[]> {
  const formData = new FormData();
  formData.append("imos", data.imos.join(","));
  for (const file of data.files) {
    formData.append("files", file);
  }

  const res = await axiosInstance.post<VesselImageApiResponse[]>(
    "/admin/data-management/vessel-images",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data;
}

export async function updateVesselImage(
  id: string,
  data: VesselImageUpdateApiRequest,
): Promise<VesselImageApiResponse> {
  const res = await axiosInstance.patch<VesselImageApiResponse>(
    `/admin/data-management/vessel-images/${id}`,
    data,
  );
  return res.data;
}

export async function deleteVesselImage(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/data-management/vessel-images/${id}`);
}

export async function bulkDeleteVesselImages(ids: string[]): Promise<{ deleted: number }> {
  const res = await axiosInstance.post<{ deleted: number }>(
    "/admin/data-management/vessel-images/bulk-delete",
    ids,
  );
  return res.data;
}

export async function getVesselImageUrl(imo: string): Promise<string> {
  const res = await axiosInstance.get(
    `/admin/data-management/vessel-images/imo/${imo}/file`,
    { responseType: "blob" },
  );
  return URL.createObjectURL(res.data);
}
