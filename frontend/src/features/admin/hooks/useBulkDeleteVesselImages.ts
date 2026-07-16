import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteVesselImages } from "../api/vesselImagesApi";
import { VESSEL_IMAGES_QUERY_KEY } from "./useVesselImages";
import { VESSEL_IMAGE_TYPES_QUERY_KEY } from "./useVesselImageTypes";

export function useBulkDeleteVesselImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return await bulkDeleteVesselImages(ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VESSEL_IMAGES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: VESSEL_IMAGE_TYPES_QUERY_KEY });
    },
  });
}
