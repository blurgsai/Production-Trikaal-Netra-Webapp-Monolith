import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVesselImage } from "../api/vesselImagesApi";
import { VESSEL_IMAGES_QUERY_KEY } from "./useVesselImages";
import type { VesselImageUpdateRequest } from "../model/vesselImageTypes";

export function useUpdateVesselImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VesselImageUpdateRequest }) => {
      return await updateVesselImage(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VESSEL_IMAGES_QUERY_KEY });
    },
  });
}
