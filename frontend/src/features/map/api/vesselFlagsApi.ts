import axiosInstance from "@/shared/api/client";
import type {
  VesselFlagApi,
  VesselFlagCreateRequestApi,
  VesselFlagListResponseApi,
} from "./types";

export async function fetchVesselFlags(vesselId: string): Promise<VesselFlagListResponseApi> {
  const res = await axiosInstance.get<VesselFlagListResponseApi>(`/vessel-flags/${vesselId}`);
  return res.data;
}

export async function createVesselFlag(
  payload: VesselFlagCreateRequestApi,
): Promise<VesselFlagApi> {
  const res = await axiosInstance.post<VesselFlagApi>("/vessel-flags", payload);
  return res.data;
}

export async function deleteVesselFlag(flagId: string): Promise<void> {
  await axiosInstance.delete(`/vessel-flags/${flagId}`);
}
