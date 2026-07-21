import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadOverlayFile } from "../api/overlaysApi";
import type { OverlayAdminApiResponse, DensityUploadOptions } from "../api/overlaysApi";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useUploadOverlay() {
  const queryClient = useQueryClient();
  return useMutation<
    OverlayAdminApiResponse,
    Error,
    { name: string; file: File; attribution: string; color: string; opacity: number; density?: DensityUploadOptions }
  >({
    mutationFn: ({ name, file, attribution, color, opacity, density }) =>
      uploadOverlayFile(name, file, attribution, color, opacity, density),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERLAYS_QUERY_KEY });
    },
  });
}
