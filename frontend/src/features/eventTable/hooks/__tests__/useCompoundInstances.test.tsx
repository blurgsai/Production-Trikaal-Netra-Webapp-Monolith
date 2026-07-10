import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCompoundInstances } from '../useCompoundInstances';
import type { PaginationParams } from '../../model/types';
import type {
  CompoundInstanceApiResponse,
  CompoundInstanceListApiResponse,
} from '../../api/types';

vi.mock('../../api/eventTableApi', () => ({
  fetchCompoundInstances: vi.fn(),
}));

import { fetchCompoundInstances } from '../../api/eventTableApi';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function makePagination(overrides?: Partial<PaginationParams>): PaginationParams {
  return { page: 0, rowsPerPage: 10, ...overrides };
}

function makeRawInstance(overrides?: Partial<CompoundInstanceApiResponse>): CompoundInstanceApiResponse {
  return {
    id: 'inst-1',
    config_id: 'cfg-1',
    config_name: 'Test Config',
    constituent_types: ['geofence_intrusion'],
    vessels_involved: ['v1', 'v2'],
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-01T01:00:00Z',
    severity: 'high',
    constituent_events: {},
    ...overrides,
  };
}

function makeRawResponse(
  overrides?: Partial<CompoundInstanceListApiResponse>,
): CompoundInstanceListApiResponse {
  return {
    instances: [makeRawInstance()],
    total: 1,
    ...overrides,
  };
}

const mockedFetch = vi.mocked(fetchCompoundInstances);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCompoundInstances', () => {
  // ── T-01: Returns mapped instances on success ────────────────────────────────
  it('returns mapped instances on success', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances).toHaveLength(1);
    expect(result.current.data?.instances[0].id).toBe('inst-1');
  });

  // ── T-02: Maps config_id to configId ─────────────────────────────────────────
  it('maps config_id to configId', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].configId).toBe('cfg-1');
  });

  // ── T-03: Maps config_name to configName ─────────────────────────────────────
  it('maps config_name to configName', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].configName).toBe('Test Config');
  });

  // ── T-04: Maps constituent_types with fallback ───────────────────────────────
  it('maps constituent_types with fallback to empty array', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ constituent_types: undefined as unknown as string[] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].constituentTypes).toEqual([]);
  });

  // ── T-05: Maps vessels_involved with fallback ────────────────────────────────
  it('maps vessels_involved with fallback to empty array', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ vessels_involved: undefined as unknown as string[] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].vessels).toEqual([]);
  });

  // ── T-06: Maps start_time and end_time ───────────────────────────────────────
  it('maps start_time and end_time', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].startTime).toBe('2024-01-01T00:00:00Z');
    expect(result.current.data?.instances[0].endTime).toBe('2024-01-01T01:00:00Z');
  });

  // ── T-07: Maps severity ──────────────────────────────────────────────────────
  it('maps severity', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].severity).toBe('high');
  });

  // ── T-08: Returns total count ────────────────────────────────────────────────
  it('returns total count', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ total: 42 }));
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(42);
  });

  // ── T-09: Total defaults to 0 when missing ───────────────────────────────────
  it('total defaults to 0 when missing', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance()],
      total: undefined as unknown as number,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(0);
  });

  // ── T-10: instances default to empty array when null ─────────────────────────
  it('instances default to empty array when null', async () => {
    mockedFetch.mockResolvedValue({
      instances: null as unknown as CompoundInstanceApiResponse[],
      total: 0,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances).toEqual([]);
  });

  // ── T-11: Loading state is true initially ────────────────────────────────────
  it('loading state is true initially', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isLoading).toBe(true);
  });

  // ── T-12: Error state on API failure ─────────────────────────────────────────
  it('error state on API failure', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  // ── T-13: Query is disabled when configId is null ────────────────────────────
  it('query is disabled when configId is null', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: null, pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // ── T-14: Query is disabled when enabled is false ────────────────────────────
  it('query is disabled when enabled is false', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination(), enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // ── T-15: Query is enabled when configId and enabled are both truthy ─────────
  it('query is enabled when configId and enabled are both truthy', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination(), enabled: true }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-16: Passes correct configId to API ─────────────────────────────────────
  it('passes correct configId to API', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-99', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith({ configId: 'cfg-99', limit: 10, offset: 0 });
  });

  // ── T-17: Passes correct limit from rowsPerPage ──────────────────────────────
  it('passes correct limit from rowsPerPage', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ rowsPerPage: 25 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });

  // ── T-18: Computes offset as page * rowsPerPage ──────────────────────────────
  it('computes offset as page * rowsPerPage', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ page: 3, rowsPerPage: 10 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 30 }));
  });

  // ── T-19: Offset is 0 for page 0 ─────────────────────────────────────────────
  it('offset is 0 for page 0', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ page: 0 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  // ── T-20: Offset for page 5 with rowsPerPage 20 ──────────────────────────────
  it('offset for page 5 with rowsPerPage 20', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ page: 5, rowsPerPage: 20 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 100 }));
  });

  // ── T-21: Maps multiple instances ────────────────────────────────────────────
  it('maps multiple instances', async () => {
    mockedFetch.mockResolvedValue({
      instances: [
        makeRawInstance({ id: 'i1', config_name: 'A' }),
        makeRawInstance({ id: 'i2', config_name: 'B' }),
        makeRawInstance({ id: 'i3', config_name: 'C' }),
      ],
      total: 3,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances).toHaveLength(3);
    expect(result.current.data?.instances[1].configName).toBe('B');
  });

  // ── T-22: Empty instances list ───────────────────────────────────────────────
  it('handles empty instances list', async () => {
    mockedFetch.mockResolvedValue({ instances: [], total: 0 });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  // ── T-23: Fetch is called with correct configId ─────────────────────────────
  it('fetch is called with correct configId', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-unique', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ configId: 'cfg-unique' }));
  });

  // ── T-24: Fetch is called with correct pagination params ─────────────────────
  it('fetch is called with correct pagination params', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const pagination = makePagination({ page: 2, rowsPerPage: 15 });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 15, offset: 30 }));
  });

  // ── T-25: Different configId triggers separate fetch ─────────────────────────
  it('different configId triggers separate fetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ configId }) => useCompoundInstances({ configId, pagination: makePagination() }),
      { wrapper, initialProps: { configId: 'cfg-1' } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender({ configId: 'cfg-2' });
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch).toHaveBeenLastCalledWith(expect.objectContaining({ configId: 'cfg-2' }));
  });

  // ── T-26: Changing pagination triggers refetch ───────────────────────────────
  it('changing pagination triggers refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ pagination }) => useCompoundInstances({ configId: 'cfg-1', pagination }),
      { wrapper, initialProps: { pagination: makePagination({ page: 0 }) } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender({ pagination: makePagination({ page: 1 }) });
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 }));
  });

  // ── T-27: placeholderData keeps previous data during refetch ──────────────────
  it('placeholderData keeps previous data during refetch', async () => {
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ total: 1 }));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ total: 99 }));
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ pagination }) => useCompoundInstances({ configId: 'cfg-1', pagination }),
      { wrapper, initialProps: { pagination: makePagination({ page: 0 }) } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(1);
    rerender({ pagination: makePagination({ page: 1 }) });
    expect(result.current.data?.total).toBe(1);
  });

  // ── T-28: Maps instance with empty constituent_types ─────────────────────────
  it('maps instance with empty constituent_types', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ constituent_types: [] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].constituentTypes).toEqual([]);
  });

  // ── T-29: Maps instance with empty vessels ───────────────────────────────────
  it('maps instance with empty vessels', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ vessels_involved: [] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].vessels).toEqual([]);
  });

  // ── T-30: Maps instance with multiple constituent types ──────────────────────
  it('maps instance with multiple constituent types', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ constituent_types: ['a', 'b', 'c'] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].constituentTypes).toEqual(['a', 'b', 'c']);
  });

  // ── T-31: Maps instance with multiple vessels ────────────────────────────────
  it('maps instance with multiple vessels', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ vessels_involved: ['v1', 'v2', 'v3', 'v4'] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].vessels).toHaveLength(4);
  });

  // ── T-32: Maps instance with low severity ────────────────────────────────────
  it('maps instance with low severity', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ severity: 'low' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].severity).toBe('low');
  });

  // ── T-33: Maps instance with null start_time ─────────────────────────────────
  it('maps instance with null start_time', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ start_time: null as unknown as string, end_time: '2024-01-01T01:00:00Z' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].startTime).toBeNull();
  });

  // ── T-34: Maps instance with null end_time ───────────────────────────────────
  it('maps instance with null end_time', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ end_time: null as unknown as string })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].endTime).toBeNull();
  });

  // ── T-35: Large number of instances ──────────────────────────────────────────
  it('handles large number of instances', async () => {
    const instances = Array.from({ length: 100 }, (_, i) =>
      makeRawInstance({ id: `i-${i}`, config_name: `Config ${i}` }),
    );
    mockedFetch.mockResolvedValue({ instances, total: 100 });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ rowsPerPage: 100 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances).toHaveLength(100);
    expect(result.current.data?.instances[99].id).toBe('i-99');
  });

  // ── T-36: enabled defaults to true ───────────────────────────────────────────
  it('enabled defaults to true', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-37: enabled false overrides configId being set ─────────────────────────
  it('enabled false overrides configId being set', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination(), enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // ── T-38: Transition from disabled to enabled triggers fetch ─────────────────
  it('transition from disabled to enabled triggers fetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ enabled }) => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination(), enabled }),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(mockedFetch).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-39: Transition from enabled to disabled does not refetch ───────────────
  it('transition from enabled to disabled does not refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ enabled }) => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination(), enabled }),
      { wrapper, initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-40: Transition from null configId to valid triggers fetch ──────────────
  it('transition from null configId to valid triggers fetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ configId }: { configId: string | null }) => useCompoundInstances({ configId, pagination: makePagination() }),
      { wrapper, initialProps: { configId: null as string | null } },
    );
    expect(mockedFetch).not.toHaveBeenCalled();
    rerender({ configId: 'cfg-1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-41: Maps instance with empty string config_name ────────────────────────
  it('maps instance with empty string config_name', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ config_name: '' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].configName).toBe('');
  });

  // ── T-42: Maps instance with special characters in config_name ───────────────
  it('maps instance with special characters in config_name', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ config_name: 'Config "Special" & <Co>' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].configName).toBe('Config "Special" & <Co>');
  });

  // ── T-43: Maps instance with very long ID ────────────────────────────────────
  it('maps instance with very long ID', async () => {
    const longId = 'a'.repeat(200);
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ id: longId })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].id).toBe(longId);
  });

  // ── T-44: Maps instance with numeric severity ────────────────────────────────
  it('maps instance with numeric severity', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ severity: '5' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].severity).toBe('5');
  });

  // ── T-45: Maps instance with unicode vessels ─────────────────────────────────
  it('maps instance with unicode vessel IDs', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ vessels_involved: ['船A', '船B'] })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].vessels).toEqual(['船A', '船B']);
  });

  // ── T-46: Error message is preserved ─────────────────────────────────────────
  it('error message is preserved', async () => {
    mockedFetch.mockRejectedValue(new Error('Server down'));
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Server down');
  });

  // ── T-47: Data is undefined when disabled ────────────────────────────────────
  it('data is undefined when disabled', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: null, pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    expect(result.current.data).toBeUndefined();
  });

  // ── T-48: RowsPerPage 1 ──────────────────────────────────────────────────────
  it('rowsPerPage 1 passes limit 1', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ rowsPerPage: 1 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
  });

  // ── T-49: Page 10 with rowsPerPage 50 ────────────────────────────────────────
  it('page 10 with rowsPerPage 50 computes offset 500', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination({ page: 10, rowsPerPage: 50 }) }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 500, limit: 50 }));
  });

  // ── T-50: Refetch on same params does not duplicate call ─────────────────────
  it('refetch on same params returns cached data', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-51: Maps instance with empty string id ─────────────────────────────────
  it('maps instance with empty string id', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ id: '' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].id).toBe('');
  });

  // ── T-52: Maps instance with very long constituent_types list ────────────────
  it('maps instance with very long constituent_types list', async () => {
    const types = Array.from({ length: 50 }, (_, i) => `type_${i}`);
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ constituent_types: types })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].constituentTypes).toHaveLength(50);
  });

  // ── T-53: Maps instance with ISO date strings ────────────────────────────────
  it('maps instance with ISO date strings', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({
        start_time: '2024-06-15T08:30:00.123Z',
        end_time: '2024-06-15T10:00:00.456Z',
      })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].startTime).toBe('2024-06-15T08:30:00.123Z');
    expect(result.current.data?.instances[0].endTime).toBe('2024-06-15T10:00:00.456Z');
  });

  // ── T-54: Fetch is called exactly once on mount ────────────────────────────
  it('fetch is called exactly once on mount', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-55: Maps instance with medium severity ─────────────────────────────────
  it('maps instance with medium severity', async () => {
    mockedFetch.mockResolvedValue({
      instances: [makeRawInstance({ severity: 'medium' })],
      total: 1,
    });
    const { result } = renderHook(
      () => useCompoundInstances({ configId: 'cfg-1', pagination: makePagination() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.instances[0].severity).toBe('medium');
  });
});
