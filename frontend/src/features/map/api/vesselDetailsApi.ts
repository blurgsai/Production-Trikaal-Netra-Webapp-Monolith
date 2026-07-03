import axiosInstance from "@/shared/api/client";
import type { VesselDetailsApi } from "./types";

export async function fetchVesselDetails(vesselId: string): Promise<VesselDetailsApi> {
  const res = await axiosInstance.get<VesselDetailsApi>(`/vessels/${vesselId}`);
  return res.data;
}
