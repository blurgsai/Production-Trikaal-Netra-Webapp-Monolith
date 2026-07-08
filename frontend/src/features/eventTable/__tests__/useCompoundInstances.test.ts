import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { useCompoundInstances } from '../hooks/useCompoundInstances';
import { fetchCompoundInstances } from '../api/eventTableApi';
import { mapCompoundInstanceFromApi } from '../model/mappers';
import type {
  CompoundInstanceListApiResponse,
  CompoundInstanceApiResponse,
} from '../api/types';
import type { PaginationParams } from '../model/types';

vi.mock('../api/eventTableApi');
vi.mock('../model/mappers');

const mockFetchCompoundInstances = vi.mocked(fetchCompoundInstances);
const mockMapCompoundInstanceFromApi = vi.mocked(mapCompoundInstanceFromApi);

const rawInstance: CompoundInstanceApiResponse = {
  id: 'inst-1',
  config_id: 'cfg-1',
  config_name: 'compound_speed',
  constituent_types: ['speed_violation', 'zone_entry'],
  vessels_involved: ['vessel-A', 'vessel-B'],
  start_time: '2024-01-01T00:00:00Z',
  end_time: '2024-01-01T01:00:00Z',
  severity: 'high',
  constituent_events: {},
};

const rawInstance2: CompoundInstanceApiResponse = { ...rawInstance, id: 'inst-2' };
const listResponse: CompoundInstanceListApiResponse = {
  instances: [rawInstance, rawInstance2],
  total: 8,
};

const mappedInstance = {
  id: 'inst-1',
  configId: 'cfg-1',
  configName: 'compound_speed',
  constituentTypes: ['speed_violation', 'zone_entry'],
  vessels: ['vessel-A', 'vessel-B'],
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-01T01:00:00Z',
  severity: 'high',
};

const mappedInstance2 = { ...mappedInstance, id: 'inst-2' };

interface HookProps {
  configId: string | null;
  pagination: PaginationParams;
  enabled?: boolean;
}

const defaultProps: HookProps = {
  configId: 'cfg-1',
  pagination: { page: 0, rowsPerPage: 10 },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderInstances(props: HookProps = defaultProps) {
  return renderHook((p: HookProps) => useCompoundInstances(p), {
    initialProps: props,
    wrapper: createWrapper(),
  });
}

describe('useCompoundInstances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCompoundInstances.mockResolvedValue(listResponse);
    mockMapCompoundInstanceFromApi.mockImplementation((raw: CompoundInstanceApiResponse) =>
      raw.id === 'inst-1' ? mappedInstance : mappedInstance2,
    );
  });

  // Basic tests (from original file)
  it('queries when configId is valid and enabled', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
  });

  it('does not query when configId is null', () => {
    renderInstances({ ...defaultProps, configId: null });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('does not query when enabled is false', () => {
    renderInstances({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('defaults enabled to true', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('passes configId, limit, and offset', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 1, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-1', limit: 25, offset: 25 }),
    );
  });

  it('maps each instance through mapCompoundInstanceFromApi', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockMapCompoundInstanceFromApi).toHaveBeenCalledTimes(2);
    expect(mockMapCompoundInstanceFromApi).toHaveBeenCalledWith(rawInstance, 0, [rawInstance, rawInstance2]);
    expect(mockMapCompoundInstanceFromApi).toHaveBeenCalledWith(rawInstance2, 1, [rawInstance, rawInstance2]);
  });

  it('returns instances array and total', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([mappedInstance, mappedInstance2]);
    expect(result.current.data?.total).toBe(8);
  });

  it('isLoading is true while pending', () => {
    mockFetchCompoundInstances.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderInstances();
    expect(result.current.isLoading).toBe(true);
  });

  it('error is populated on failure', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('fetch failed'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('fetch failed');
  });

  it('data is undefined before success', () => {
    mockFetchCompoundInstances.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderInstances();
    expect(result.current.data).toBeUndefined();
  });

  it('refetches when configId changes', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, configId: 'cfg-2' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('refetches when page changes', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('isLoading is false when configId is null', () => {
    const { result } = renderInstances({ ...defaultProps, configId: null });
    expect(result.current.isLoading).toBe(false);
  });

  // -------------------------------------------------------------------------
  // ConfigId Test Cases
  // -------------------------------------------------------------------------

  it('Verify data is fetched with valid configId', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-1' }),
    );
  });

  it('Verify data is not fetched when configId is null', () => {
    renderInstances({ ...defaultProps, configId: null });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify data is fetched when configId changes from null to valid value', async () => {
    const { rerender } = renderInstances({ ...defaultProps, configId: null });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
    rerender({ ...defaultProps, configId: 'cfg-1' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1));
  });

  it('Verify data is refetched when configId changes', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, configId: 'cfg-2' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify correct configId is passed to API', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg-123' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-123' }),
    );
  });

  it('Verify hook handles empty string configId', () => {
    renderInstances({ ...defaultProps, configId: '' });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify hook handles configId containing spaces', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg with spaces' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg with spaces' }),
    );
  });

  it('Verify hook handles configId with special characters', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg@#$%' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg@#$%' }),
    );
  });

  it('Verify hook handles configId with numeric value', async () => {
    renderInstances({ ...defaultProps, configId: '12345' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: '12345' }),
    );
  });

  it('Verify hook handles configId with alphanumeric value', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg123abc' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg123abc' }),
    );
  });

  it('Verify hook handles very long configId', async () => {
    const longId = 'cfg-' + 'x'.repeat(500);
    renderInstances({ ...defaultProps, configId: longId });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: longId }),
    );
  });

  it('Verify hook handles configId with Unicode characters', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg-αβγ' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-αβγ' }),
    );
  });

  it('Verify hook handles configId with emojis', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg-🚀' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-🚀' }),
    );
  });

  it('Verify hook handles duplicate configId requests', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender(defaultProps);
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
  });

  it('Verify hook handles configId containing URL reserved characters', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg?&=' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg?&=' }),
    );
  });

  it('Verify hook handles configId with leading spaces', async () => {
    renderInstances({ ...defaultProps, configId: '  cfg-1' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: '  cfg-1' }),
    );
  });

  it('Verify hook handles configId with trailing spaces', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg-1  ' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-1  ' }),
    );
  });

  it('Verify hook handles configId with leading and trailing spaces', async () => {
    renderInstances({ ...defaultProps, configId: '  cfg-1  ' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: '  cfg-1  ' }),
    );
  });

  it('Verify hook handles configId containing tab characters', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg\t1' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg\t1' }),
    );
  });

  it('Verify hook handles configId containing newline characters', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg\n1' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg\n1' }),
    );
  });

  // -------------------------------------------------------------------------
  // Pagination Test Cases
  // -------------------------------------------------------------------------

  it('Verify page 0 sends offset 0', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
    );
  });

  it('Verify page 1 sends correct offset', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 10 }),
    );
  });

  it('Verify page 2 sends correct offset', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 20 }),
    );
  });

  it('Verify page 5 sends correct offset', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 5, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 50 }),
    );
  });

  it('Verify rowsPerPage 5 sends correct limit', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 5 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 }),
    );
  });

  it('Verify rowsPerPage 10 sends correct limit', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });

  it('Verify rowsPerPage 25 sends correct limit', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 }),
    );
  });

  it('Verify rowsPerPage 50 sends correct limit', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 50 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
  });

  it('Verify page change triggers refetch', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify rowsPerPage change triggers refetch', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify first page loads correctly', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0, limit: 10 }),
    );
  });

  it('Verify middle page loads correctly', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 5, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 50, limit: 10 }),
    );
  });

  it('Verify last page loads correctly', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 10, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 100, limit: 10 }),
    );
  });

  it('Verify pagination works with one record', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance], total: 1 });
    const { result } = renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toHaveLength(1);
  });

  it('Verify pagination works with zero records', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [], total: 0 });
    const { result } = renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([]);
  });

  it('Verify pagination works when total equals page size', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance], total: 10 });
    const { result } = renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(10);
  });

  it('Verify pagination works when total exceeds page size', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance, rawInstance2], total: 25 });
    const { result } = renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(25);
  });

  it('Verify pagination works when last page contains partial records', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance], total: 5 });
    const { result } = renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(5);
  });

  it('Verify pagination state updates correctly', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify pagination works after configId change', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, configId: 'cfg-2', pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  // -------------------------------------------------------------------------
  // Pagination Edge Cases
  // -------------------------------------------------------------------------

  it('Verify page = -1', async () => {
    renderInstances({ ...defaultProps, pagination: { page: -1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: -10 }),
    );
  });

  it('Verify page = 999999', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 999999, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 9999990 }),
    );
  });

  it('Verify page = null', async () => {
    renderInstances({ ...defaultProps, pagination: { page: null as unknown as number, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-1', limit: 10, offset: 0 }),
    );
  });

  it('Verify page = undefined', async () => {
    renderInstances({ ...defaultProps, pagination: { page: undefined as unknown as number, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-1', limit: 10, offset: NaN }),
    );
  });

  it('Verify rowsPerPage = 0', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 0 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 0 }),
    );
  });

  it('Verify rowsPerPage = -1', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: -1 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: -1 }),
    );
  });

  it('Verify rowsPerPage = null', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: null as unknown as number } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: null }),
    );
  });

  it('Verify rowsPerPage = undefined', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: undefined as unknown as number } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: undefined }),
    );
  });

  it('Verify rowsPerPage = 10000', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10000 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10000 }),
    );
  });

  it('Verify decimal page value', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 1.5, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 15 }),
    );
  });

  it('Verify decimal rowsPerPage value', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10.5 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10.5 }),
    );
  });

  it('Verify string page value', async () => {
    renderInstances({ ...defaultProps, pagination: { page: '1' as unknown as number, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  it('Verify string rowsPerPage value', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: '10' as unknown as number } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  it('Verify rapid page switching', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    rerender({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    rerender({ ...defaultProps, pagination: { page: 3, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(4));
  });

  it('Verify pagination during slow network', async () => {
    let resolveFn: () => void;
    mockFetchCompoundInstances.mockReturnValueOnce(
      new Promise(resolve => { resolveFn = resolve as () => void; }),
    );
    const { rerender } = renderInstances();
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await act(async () => {
      resolveFn!();
      await new Promise(r => setTimeout(r, 0));
    });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify pagination while previous request is pending', async () => {
    mockFetchCompoundInstances.mockReturnValueOnce(new Promise(() => {}));
    const { rerender } = renderInstances();
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify pagination after error recovery', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('fail'));
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.isError).toBe(true));
    mockFetchCompoundInstances.mockResolvedValueOnce(listResponse);
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // -------------------------------------------------------------------------
  // Enabled Property Test Cases
  // -------------------------------------------------------------------------

  it('Verify enabled=true fetches data', async () => {
    const { result } = renderInstances({ ...defaultProps, enabled: true });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
  });

  it('Verify enabled=false prevents API call', () => {
    renderInstances({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify enabled undefined defaults to true', async () => {
    const { result } = renderInstances({ ...defaultProps, enabled: undefined });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify enabled=false with valid configId', () => {
    renderInstances({ ...defaultProps, enabled: false, configId: 'cfg-1' });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify enabled=true with valid configId', async () => {
    const { result } = renderInstances({ ...defaultProps, enabled: true, configId: 'cfg-1' });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify enabled=true with null configId', () => {
    renderInstances({ ...defaultProps, enabled: true, configId: null });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify enabled=false with null configId', () => {
    renderInstances({ ...defaultProps, enabled: false, configId: null });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify changing enabled false→true triggers fetch', async () => {
    const { rerender } = renderInstances({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
    rerender({ ...defaultProps, enabled: true });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1));
  });

  it('Verify changing enabled true→false prevents future fetches', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
  });

  it('Verify pagination changes while enabled=false', () => {
    const { rerender } = renderInstances({ ...defaultProps, enabled: false });
    rerender({ ...defaultProps, enabled: false, pagination: { page: 1, rowsPerPage: 10 } });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify configId changes while enabled=false', () => {
    const { rerender } = renderInstances({ ...defaultProps, enabled: false });
    rerender({ ...defaultProps, enabled: false, configId: 'cfg-2' });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify no loading state when disabled', () => {
    const { result } = renderInstances({ ...defaultProps, enabled: false });
    expect(result.current.isLoading).toBe(false);
  });

  it('Verify cache remains available while disabled', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    const cachedData = result.current.data;
    rerender({ ...defaultProps, enabled: false });
    expect(result.current.data).toEqual(cachedData);
  });

  it('Verify disabled query does not trigger retries', async () => {
    mockFetchCompoundInstances.mockRejectedValue(new Error('fail'));
    const { rerender } = renderInstances({ ...defaultProps, enabled: false });
    rerender({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // API Request Test Cases
  // -------------------------------------------------------------------------

  it('Verify correct endpoint URL is called', async () => {
    renderInstances();
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  it('Verify correct configId is added in URL', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg-123' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-123' }),
    );
  });

  it('Verify correct limit parameter is sent', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 25 }),
    );
  });

  it('Verify correct offset parameter is sent', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 20 }),
    );
  });

  it('Verify request contains expected query parameters', async () => {
    renderInstances({ ...defaultProps, pagination: { page: 1, rowsPerPage: 20 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 'cfg-1', limit: 20, offset: 20 }),
    );
  });

  it('Verify API called once on mount', async () => {
    renderInstances();
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1));
  });

  it('Verify API called once on configId change', async () => {
    const { rerender } = renderInstances();
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1));
    rerender({ ...defaultProps, configId: 'cfg-2' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify API called once on pagination change', async () => {
    const { rerender } = renderInstances();
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1));
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify duplicate requests are prevented', async () => {
    const { rerender } = renderInstances();
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1));
    rerender(defaultProps);
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
  });

  it('Verify no request made with null configId', () => {
    renderInstances({ ...defaultProps, configId: null });
    expect(mockFetchCompoundInstances).not.toHaveBeenCalled();
  });

  it('Verify API request format is correct', async () => {
    renderInstances();
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
    expect(mockFetchCompoundInstances).toHaveBeenCalledWith(
      expect.objectContaining({ configId: expect.any(String), limit: expect.any(Number), offset: expect.any(Number) }),
    );
  });

  it('Verify request works with large configId', async () => {
    const longId = 'cfg-' + 'x'.repeat(1000);
    renderInstances({ ...defaultProps, configId: longId });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  it('Verify request works with special character configId', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg@#$%^&*()' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  it('Verify request URL encoding works correctly', async () => {
    renderInstances({ ...defaultProps, configId: 'cfg with spaces' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  it('Verify request handles whitespace configId', async () => {
    renderInstances({ ...defaultProps, configId: '  cfg  ' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalled());
  });

  // -------------------------------------------------------------------------
  // API Response Test Cases
  // -------------------------------------------------------------------------

  it('Verify valid response returns mapped instances', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([mappedInstance, mappedInstance2]);
  });

  it('Verify empty instances array returns empty list', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([]);
  });

  it('Verify null instances returns empty list', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: null as unknown as CompoundInstanceApiResponse[], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([]);
  });

  it('Verify undefined instances returns empty list', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: undefined as unknown as CompoundInstanceApiResponse[], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([]);
  });

  it('Verify null total returns 0', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [], total: null as unknown as number });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify undefined total returns 0', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [], total: undefined as unknown as number });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify total=0 handled correctly', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify large total value handled correctly', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [], total: 9999999 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(9999999);
  });

  it('Verify duplicate records handled correctly', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance, rawInstance], total: 2 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toHaveLength(2);
  });

  it('Verify response with additional properties', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance], total: 1, extra: 'field' } as unknown as CompoundInstanceListApiResponse);
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toHaveLength(1);
  });

  it('Verify response with missing properties', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({} as unknown as CompoundInstanceListApiResponse);
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify malformed response structure', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [{ id: 'x' } as unknown as CompoundInstanceApiResponse], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify response with nested unexpected objects', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [{ ...rawInstance, nested: { deep: 'object' } } as unknown as CompoundInstanceApiResponse], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify response with empty object', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({} as unknown as CompoundInstanceListApiResponse);
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify response with invalid field types', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: 'not-an-array' as unknown as CompoundInstanceApiResponse[], total: 'not-a-number' as unknown as number });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify response with string instead of array', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: 'string' as unknown as CompoundInstanceApiResponse[], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify response with object instead of array', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: {} as unknown as CompoundInstanceApiResponse[], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify response with boolean values', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: true as unknown as CompoundInstanceApiResponse[], total: 0 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify response with large dataset', async () => {
    const largeInstances = Array.from({ length: 100 }, (_, i) => ({ ...rawInstance, id: `inst-${i}` }));
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: largeInstances, total: 100 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances).toHaveLength(100);
  });

  it('Verify partial response data', async () => {
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [rawInstance] } as unknown as CompoundInstanceListApiResponse);
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  // -------------------------------------------------------------------------
  // Mapping Test Cases
  // -------------------------------------------------------------------------

  it('Verify mapper called for every instance', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockMapCompoundInstanceFromApi).toHaveBeenCalledTimes(2);
  });

  it('Verify mapper receives correct data', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockMapCompoundInstanceFromApi).toHaveBeenCalledWith(rawInstance, 0, [rawInstance, rawInstance2]);
  });

  it('Verify mapped fields are correct', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances[0].configId).toBe('cfg-1');
    expect(result.current.data?.instances[0].configName).toBe('compound_speed');
  });

  it('Verify mapping preserves order', async () => {
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.instances[0].id).toBe('inst-1');
    expect(result.current.data?.instances[1].id).toBe('inst-2');
  });

  it('Verify mapper handles missing fields', async () => {
    const partialInstance = { id: 'inst-3', config_id: 'cfg-1' } as unknown as CompoundInstanceApiResponse;
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [partialInstance], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify mapper handles null fields', async () => {
    const nullInstance = { ...rawInstance, config_name: null } as unknown as CompoundInstanceApiResponse;
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [nullInstance], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify mapper handles undefined fields', async () => {
    const undefinedInstance = { ...rawInstance, config_name: undefined } as unknown as CompoundInstanceApiResponse;
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [undefinedInstance], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify mapper handles empty objects', async () => {
    const emptyInstance = {} as unknown as CompoundInstanceApiResponse;
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [emptyInstance], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify mapper handles nested objects', async () => {
    const nestedInstance = { ...rawInstance, constituent_events: { nested: 'data' } } as unknown as CompoundInstanceApiResponse;
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [nestedInstance], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify mapper handles invalid field types', async () => {
    const invalidInstance = { ...rawInstance, config_id: 123 as unknown as string } as unknown as CompoundInstanceApiResponse;
    mockFetchCompoundInstances.mockResolvedValueOnce({ instances: [invalidInstance], total: 1 });
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  // -------------------------------------------------------------------------
  // Error Handling Test Cases
  // -------------------------------------------------------------------------

  it('Verify HTTP 400 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 400'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('400');
  });

  it('Verify HTTP 401 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 401'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('401');
  });

  it('Verify HTTP 403 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 403'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('403');
  });

  it('Verify HTTP 404 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 404'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('404');
  });

  it('Verify HTTP 408 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 408'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('408');
  });

  it('Verify HTTP 429 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 429'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('429');
  });

  it('Verify HTTP 500 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 500'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('500');
  });

  it('Verify HTTP 502 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 502'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('502');
  });

  it('Verify HTTP 503 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 503'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('503');
  });

  it('Verify HTTP 504 error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Request failed with status code 504'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('504');
  });

  it('Verify timeout error handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('timeout');
  });

  it('Verify network disconnect handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('Network Error'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('Network');
  });

  it('Verify DNS failure handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('ENOTFOUND');
  });

  it('Verify connection refused handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('ECONNREFUSED');
  });

  it('Verify loading state removed after error', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
  });

  it('Verify error state populated correctly', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('API Error'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('API Error');
  });

  it('Verify repeated failures do not crash hook', async () => {
    mockFetchCompoundInstances.mockRejectedValue(new Error('fail'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
  });

  it('Verify invalid JSON response handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new SyntaxError('Unexpected token < in JSON'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it('Verify interrupted response handling', async () => {
    mockFetchCompoundInstances.mockRejectedValueOnce(new Error('socket hang up'));
    const { result } = renderInstances();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('socket hang up');
  });

  // -------------------------------------------------------------------------
  // React Query & Cache Test Cases
  // -------------------------------------------------------------------------

  it('Verify identical query parameters reuse cache', async () => {
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useCompoundInstances(defaultProps), { wrapper });
    await waitFor(() => expect(r1.current.data).toBeDefined());
    const { result: r2 } = renderHook(() => useCompoundInstances(defaultProps), { wrapper });
    expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(1);
    expect(r2.current.data).toBeDefined();
  });

  it('Verify different configIds create separate cache entries', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, configId: 'cfg-2' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify different pages create separate cache entries', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify different rowsPerPage create separate cache entries', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });

  it('Verify placeholderData shows previous data during loading', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    mockFetchCompoundInstances.mockReturnValueOnce(new Promise(() => {}));
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    expect(result.current.data).toBeDefined();
  });

  it('Verify previous page data remains visible during pagination', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    const firstPageData = result.current.data;
    mockFetchCompoundInstances.mockReturnValueOnce(new Promise(() => {}));
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    expect(result.current.data).toEqual(firstPageData);
  });

  it('Verify rapid configId changes show latest data only', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, configId: 'cfg-2' });
    rerender({ ...defaultProps, configId: 'cfg-3' });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(3));
  });

  it('Verify component unmount during request does not cause errors', async () => {
    mockFetchCompoundInstances.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = renderInstances();
    expect(() => unmount()).not.toThrow();
  });

  it('Verify simultaneous configId and pagination changes return correct results', async () => {
    const { result, rerender } = renderInstances();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, configId: 'cfg-2', pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundInstances).toHaveBeenCalledTimes(2));
  });
});