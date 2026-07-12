import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminOverlays,
  uploadOverlayFile,
  addUrlOverlay,
  deleteOverlay,
} from "../api/overlaysApi";
import type { OverlayAdminApiResponse } from "../api/overlaysApi";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useAdminOverlays() {
  return useQuery<OverlayAdminApiResponse[]>({
    queryKey: OVERLAYS_QUERY_KEY,
    queryFn: fetchAdminOverlays,
  });
}

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

export function useDeleteOverlay() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteOverlay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERLAYS_QUERY_KEY });
    },
  });
}
