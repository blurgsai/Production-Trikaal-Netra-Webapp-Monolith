import axiosInstance from "@/shared/api/client";
import type { VesselImageApiResponse } from "./types";

export async function fetchVesselImage(imo: string): Promise<VesselImageApiResponse> {
  const res = await axiosInstance.get<VesselImageApiResponse>(`/admin/vessel-images/${imo}`);
  return res.data;
}
