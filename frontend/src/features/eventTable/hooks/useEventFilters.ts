import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseUrlToFilters, filtersToUrlParams } from '../model/filterHelpers';
import type { EventFilter } from '../model/types';

export function useEventFilters(metaFields: string[]) {
  const [searchParams, setSearchParams] = useSearchParams();

  const appliedFilters = useMemo(
    () => (metaFields.length > 0 ? parseUrlToFilters(searchParams, metaFields) : []),
    [searchParams, metaFields],
  );

  // Writes new filters to URL, preserving the search query param
  const applyFilters = useCallback((filters: EventFilter[]) => {
    const urlEntries = filtersToUrlParams(filters);
    setSearchParams(prev => {
      const next = new URLSearchParams();
      const q = prev.get('q');
      if (q) next.set('q', q);
      for (const [key, values] of Object.entries(urlEntries)) {
        values.forEach(v => next.append(key, v));
      }
      return next;
    });
  }, [setSearchParams]);

  return { appliedFilters, applyFilters };
}
