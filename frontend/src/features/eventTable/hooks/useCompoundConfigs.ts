import { useQuery } from '@tanstack/react-query';
import { fetchCompoundConfigs } from '../api/eventTableApi';
import { mapCompoundConfigFromApi } from '../model/mappers';
import type { PaginationParams } from '../model/types';

interface UseCompoundConfigsParams {
  pagination: PaginationParams;
  searchQuery: string;
  enabled?: boolean;
}

export function useCompoundConfigs({
  pagination,
  searchQuery,
  enabled = true,
}: UseCompoundConfigsParams) {
  return useQuery({
    queryKey: ['events', 'compound-configs', pagination, searchQuery],
    queryFn: async () => {
      const raw = await fetchCompoundConfigs({
        limit:  pagination.rowsPerPage,
        offset: pagination.page * pagination.rowsPerPage,
        searchQuery,
      });
      return {
        configs: (raw.events ?? []).map(mapCompoundConfigFromApi),
        total:   raw.total ?? 0,
      };
    },
    enabled,
    placeholderData: (prev) => prev,
  });
}
