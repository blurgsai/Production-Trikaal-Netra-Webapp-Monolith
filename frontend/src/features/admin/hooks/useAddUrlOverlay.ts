import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUrlOverlay } from "../api/overlaysApi";
import type { OverlayAdminApiResponse } from "../api/overlaysApi";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useAddUrlOverlay() {
  const queryClient = useQueryClient();
  return useMutation<
    OverlayAdminApiResponse,
    Error,
    { name: string; tileUrl: string; overlayType: string; attribution: string; color: string; opacity: number }
  >({
    mutationFn: ({ name, tileUrl, overlayType, attribution, color, opacity }) =>
      addUrlOverlay(name, tileUrl, overlayType, attribution, color, opacity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERLAYS_QUERY_KEY });
    },
  });
}
