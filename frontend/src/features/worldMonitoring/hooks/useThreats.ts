import { useQuery } from "@tanstack/react-query";

import {
  getThreatEvents,
  getThreatMapEvents,
  getThreatMetadata,
} from "../api/threatsApi";

import {
  mapThreatEvents,
  mapThreatMarkers,
  mapThreatMetadata,
} from "../model/mappers";

import type { ThreatFilters } from "../model/types";

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
          getThreatMetadata(),
          getThreatEvents(filters, page, pageSize),
          getThreatMapEvents(filters),
        ],
      );

      return {
        metadata: mapThreatMetadata(metadataResponse),
        events: mapThreatEvents(eventsResponse.data),
        mapMarkers: mapThreatMarkers(mapResponse.data),
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

