import { useQuery } from "@tanstack/react-query";

import {
  getEvents,
  getMapEvents,
  getMetadata,
} from "../api/worldMonitoringThreatsApi";

import { mapEvents, mapMarkers, mapMetadata } from "../model/mappers";

import type { ThreatFilters } from "../model/types";
import { getEventDetail } from "../api/worldMonitoringThreatsApi";
import { mapEventDetail } from "../model/mappers";

const THREATS_KEY = "world-monitor-threats";

export const useThreats = (
  filters: ThreatFilters,
  page: number,
  pageSize: number,
) => {
  return useQuery({
    queryKey: [THREATS_KEY, filters, page, pageSize],

    queryFn: async () => {
      const [metadataResponse, eventsResponse, mapResponse] = await Promise.all(
        [
          getMetadata(),
          getEvents(filters, page, pageSize),
          getMapEvents(filters),
        ],
      );

      return {
        metadata: mapMetadata(metadataResponse),
        events: mapEvents(eventsResponse.data),

        mapMarkers: mapMarkers(mapResponse.data),

        pagination: {
          page: eventsResponse.pagination.page,

          pageSize: eventsResponse.pagination.page_size,

          totalPages: eventsResponse.pagination.total_pages,

          total: eventsResponse.pagination.total,
        },
      };
    },
  });
};

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