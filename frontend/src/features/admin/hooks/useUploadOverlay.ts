import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadOverlayFile } from "../api/overlaysApi";
import type { OverlayAdminApiResponse } from "../api/overlaysApi";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useUploadOverlay() {
  const queryClient = useQueryClient();
  return useMutation<
    OverlayAdminApiResponse,
    Error,
    { name: string; file: File; attribution: string; color: string; opacity: number }
  >({
    mutationFn: ({ name, file, attribution, color, opacity }) =>
      uploadOverlayFile(name, file, attribution, color, opacity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERLAYS_QUERY_KEY });
    },
  });
}
