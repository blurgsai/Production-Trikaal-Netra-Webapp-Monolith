import { useQuery } from '@tanstack/react-query';
import { fetchCompoundInstances } from '../api/eventTableApi';
import { mapCompoundInstanceFromApi } from '../model/mappers';
import type { PaginationParams } from '../model/types';

interface UseCompoundInstancesParams {
  configId: string | null;
  pagination: PaginationParams;
  enabled?: boolean;
}

export function useCompoundInstances({
  configId,
  pagination,
  enabled = true,
}: UseCompoundInstancesParams) {
  return useQuery({
    queryKey: ['events', 'compound-instances', configId, pagination],
    queryFn: async () => {
      const raw = await fetchCompoundInstances({
        configId: configId!,
        limit:    pagination.rowsPerPage,
        offset:   pagination.page * pagination.rowsPerPage,
      });
      return {
        instances: (raw.instances ?? []).map(mapCompoundInstanceFromApi),
        total:     raw.total ?? 0,
      };
    },
    enabled: enabled && !!configId,
    placeholderData: (prev) => prev,
  });
}
