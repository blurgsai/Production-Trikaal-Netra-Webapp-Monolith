import axiosInstance from "@/shared/api/client";
import type { LloydsVesselData } from "../model/types";

export interface VesselDataUploadApi {
  _id: string;
  database_name: string;
  mmsi: string;
  data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface VesselDataUploadsResponseApi {
  items: VesselDataUploadApi[];
  total: number;
}

export async function fetchVesselDataUploads(mmsi: string): Promise<VesselDataUploadsResponseApi> {
  const res = await axiosInstance.get<VesselDataUploadsResponseApi>(
    `/vessels/${mmsi}/uploads`,
  );
  return res.data;
}

export async function fetchLloydsData(imo: string): Promise<LloydsVesselData> {
  const res = await axiosInstance.get<LloydsVesselData>(`/vessels/imo/${imo}/lloyds`);
  return res.data;
}
