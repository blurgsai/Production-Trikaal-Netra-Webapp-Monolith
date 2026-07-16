import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVesselImage } from "../api/vesselImagesApi";
import { VESSEL_IMAGES_QUERY_KEY } from "./useVesselImages";
import type { VesselImageCreateRequest } from "../model/vesselImageTypes";

export function useCreateVesselImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VesselImageCreateRequest) => {
      return await createVesselImage(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VESSEL_IMAGES_QUERY_KEY });
    },
  });
}
