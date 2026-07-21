import { useQuery } from '@tanstack/react-query'
import { pingFocusMode } from '../api/focusModeApi'

export const usePingFocusMode = () =>
  useQuery({
    queryKey: ['focus-mode-ping'],
    queryFn: pingFocusMode,
    retry: false,
    staleTime: Infinity,
  })
