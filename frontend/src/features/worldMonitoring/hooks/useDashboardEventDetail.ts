import { useQuery } from "@tanstack/react-query";

import { getEventDetail } from "../api/overviewApi";

import { mapEventDetail } from "../model/mappers";

export const useDashboardEventDetail = (eventId?: string) => {
  return useQuery({
    queryKey: ["dashboard-event-detail", eventId],

    enabled: Boolean(eventId),

    queryFn: async () => {
      const response = await getEventDetail(eventId!);

      return mapEventDetail(response);
    },
  });
};
