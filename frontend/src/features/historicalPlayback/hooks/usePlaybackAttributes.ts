import { useQuery } from "@tanstack/react-query";

import { fetchPlaybackAttributes } from "../api/historicalPlaybackApi";
import { mapPlaybackAttributes } from "../model/mappers";

const PLAYBACK_ATTRIBUTES_KEY = ["historical-playback-attributes"];

export function usePlaybackAttributes() {
  return useQuery({
    queryKey: PLAYBACK_ATTRIBUTES_KEY,
    queryFn: async () => {
      const response = await fetchPlaybackAttributes();
      return mapPlaybackAttributes(response);
    },
  });
}
