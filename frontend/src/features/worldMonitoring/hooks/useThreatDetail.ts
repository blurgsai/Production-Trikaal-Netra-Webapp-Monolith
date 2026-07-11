import { useQuery } from "@tanstack/react-query";

import { getEventDetail } from "../api/overviewApi";

import { mapEventDetail } from "../model/mappers";

export const useThreatDetail = (eventId?: string) => {
  return useQuery({
    queryKey: ["world-monitor-event-detail", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const response = await getEventDetail(eventId!);
      return mapEventDetail(response);
    },
  });
};
