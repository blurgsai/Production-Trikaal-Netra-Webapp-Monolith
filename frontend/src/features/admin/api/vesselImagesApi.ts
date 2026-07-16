import axiosInstance from "@/shared/api/client";
import type {
  PaginatedVesselImageApiResponse,
  VesselImageApiResponse,
  VesselImageCreateApiRequest,
  VesselImageUpdateApiRequest,
} from "./types";

export async function fetchVesselImageTypes(): Promise<string[]> {
  const res = await axiosInstance.get<string[]>(
    "/admin/data-management/vessel-image-types",
  );
  return res.data;
}

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
