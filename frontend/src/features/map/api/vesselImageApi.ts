import axiosInstance from "@/shared/api/client";
import type { VesselImageApiResponse } from "./types";

export async function fetchVesselImage(imo: string): Promise<VesselImageApiResponse> {
  const res = await axiosInstance.get(`/vessels/imo/${imo}/image`, {
    responseType: "blob",
  });
  const imageUrl = URL.createObjectURL(res.data);
  return { image_url: imageUrl };
}
