import { useCallback, useRef, useState } from 'react';
import { fetchEventMetadataValues } from '../api/eventTableApi';
import { mapMetadataValuesFromApi } from '../model/mappers';

export function useFieldValueLoader() {
  const cache   = useRef<Record<string, (string | number)[]>>({});
  const loading = useRef<Record<string, boolean>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, (string | number)[]>>({});

  const loadValues = useCallback(async (field: string) => {
    if (!field || field === 'information' || field.startsWith('information.')) return;
    if (cache.current[field] !== undefined || loading.current[field]) return;

    loading.current[field] = true;
    try {
      const raw = await fetchEventMetadataValues(field);
      const values = mapMetadataValuesFromApi(raw);
      cache.current[field] = values;
      setFieldValues(prev => ({ ...prev, [field]: values }));
    } catch {
      cache.current[field] = [];
    } finally {
      loading.current[field] = false;
    }
  }, []);

  return { fieldValues, loadValues };
}
