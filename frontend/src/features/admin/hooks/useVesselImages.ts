import { useQuery } from "@tanstack/react-query";
import { fetchVesselImages } from "../api/dataManagementApi";
import { mapVesselImagesFromApi } from "../model/mappers";
import type { PaginatedVesselImages } from "../model/dataManagementTypes";

export const VESSEL_IMAGES_QUERY_KEY = ["admin", "data-management", "vessel-images"];

export interface VesselImagesParams {
  search?: string;
  mimeType?: string;
  page?: number;
  pageSize?: number;
}

export function useVesselImages(params: VesselImagesParams = {}) {
  const { search, mimeType, page = 0, pageSize = 25 } = params;

  return useQuery<PaginatedVesselImages>({
    queryKey: [...VESSEL_IMAGES_QUERY_KEY, search, mimeType, page, pageSize],
    queryFn: async () => {
      const raw = await fetchVesselImages({
        search: search || undefined,
        mime_type: mimeType || undefined,
        page,
        page_size: pageSize,
      });
      return {
        items: mapVesselImagesFromApi(raw.items),
        total: raw.total,
      };
    },
  });
}
