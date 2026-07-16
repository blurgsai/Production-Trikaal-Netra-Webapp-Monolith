import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteVesselImage } from "../api/vesselImagesApi";
import { VESSEL_IMAGES_QUERY_KEY } from "./useVesselImages";

export function useDeleteVesselImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteVesselImage(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VESSEL_IMAGES_QUERY_KEY });
    },
  });
}
