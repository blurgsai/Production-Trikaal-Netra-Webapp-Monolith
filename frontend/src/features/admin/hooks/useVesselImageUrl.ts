import { useCallback } from "react";
import { getVesselImageUrl } from "../api/dataManagementApi";

export function useVesselImageUrl() {
  return useCallback((imo: string) => getVesselImageUrl(imo), []);
}
