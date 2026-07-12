import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOverlay } from "../api/overlaysApi";

const OVERLAYS_QUERY_KEY = ["admin", "overlays"];

export function useDeleteOverlay() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteOverlay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERLAYS_QUERY_KEY });
    },
  });
}
