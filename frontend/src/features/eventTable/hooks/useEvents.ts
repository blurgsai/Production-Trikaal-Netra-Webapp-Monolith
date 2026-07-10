import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/eventTableApi';
import { mapEventFromApi } from '../model/mappers';
import type { EventFilter, PaginationParams } from '../model/types';

interface UseEventsParams {
  filters: EventFilter[];
  pagination: PaginationParams;
  searchQuery: string;
  eventId?: string;
  enabled?: boolean;
}

export function useEvents({
  filters,
  pagination,
  searchQuery,
  eventId,
  enabled = true,
}: UseEventsParams) {
  return useQuery({
    queryKey: ['events', 'list', filters, pagination, searchQuery, eventId],
    queryFn: async () => {
      const raw = await fetchEvents({
        limit:  pagination.rowsPerPage,
        offset: pagination.page * pagination.rowsPerPage,
        searchQuery,
        filters: filters.length > 0 ? JSON.stringify(filters) : undefined,
        eventId,
      });
      return {
        events: raw.events.map(mapEventFromApi),
        total:  raw.total,
      };
    },
    enabled,
    placeholderData: (prev) => prev,
  });
}
