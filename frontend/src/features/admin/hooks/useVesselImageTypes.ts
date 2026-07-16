import { useQuery } from "@tanstack/react-query";
import { fetchVesselImageTypes } from "../api/dataManagementApi";

export const VESSEL_IMAGE_TYPES_QUERY_KEY = ["admin", "data-management", "vessel-image-types"];

export function useVesselImageTypes() {
  return useQuery<string[]>({
    queryKey: VESSEL_IMAGE_TYPES_QUERY_KEY,
    queryFn: fetchVesselImageTypes,
  });
}
