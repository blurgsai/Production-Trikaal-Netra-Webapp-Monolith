import { useQuery } from '@tanstack/react-query';
import { fetchEventMetadata } from '../api/eventTableApi';
import { mapMetadataColumnFromApi } from '../model/mappers';

export function useEventMetadata() {
  return useQuery({
    queryKey: ['events', 'metadata'],
    queryFn: async () => {
      const raw = await fetchEventMetadata();
      return raw.columns.map(mapMetadataColumnFromApi);
    },
    staleTime: Infinity,   // metadata schema does not change during a session
  });
}
