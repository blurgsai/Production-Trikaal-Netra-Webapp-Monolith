import axiosInstance from "@/shared/api/client";
import type {
  DatabaseUploadApiResponse,
  DatabaseUploadCreateApiRequest,
  DatabaseUploadUpdateApiRequest,
  PaginatedDatabaseUploadApiResponse,
} from "./types";

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
