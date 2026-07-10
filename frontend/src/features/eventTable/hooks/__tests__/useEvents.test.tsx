import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEvents } from '../useEvents';
import type { EventFilter, PaginationParams } from '../../model/types';
import type { EventApiResponse, EventListApiResponse } from '../../api/types';

vi.mock('../../api/eventTableApi', () => ({
  fetchEvents: vi.fn(),
}));

import { fetchEvents } from '../../api/eventTableApi';

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

function makeRawEvent(overrides?: Partial<EventApiResponse>): EventApiResponse {
  return {
    id: 'evt-1',
    type: 'geofence_intrusion',
    severity: 'high',
    status: 'active',
    timestamp: '2024-01-01T00:00:00Z',
    start_time: '2024-01-01T01:00:00Z',
    end_time: '2024-01-01T02:00:00Z',
    vessels_involved: ['v1'],
    location: null,
    temporality: 'bounded',
    event_source: 'radar',
    model: 'test-model',
    compound: false,
    constituent_types: [],
    ...overrides,
  };
}

function makeRawResponse(overrides?: Partial<EventListApiResponse>): EventListApiResponse {
  return {
    events: [makeRawEvent()],
    total: 1,
    limit: 10,
    offset: 0,
    ...overrides,
  };
}

const mockedFetch = vi.mocked(fetchEvents);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEvents', () => {
  // ── T-01: Returns mapped events on success ───────────────────────────────────
  it('returns mapped events on success', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events).toHaveLength(1);
    expect(result.current.data?.events[0].id).toBe('evt-1');
  });

  // ── T-02: Maps id correctly ──────────────────────────────────────────────────
  it('maps id correctly', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].id).toBe('evt-1');
  });

  // ── T-03: Maps type correctly ────────────────────────────────────────────────
  it('maps type correctly', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].type).toBe('geofence_intrusion');
  });

  // ── T-04: Maps severity correctly ────────────────────────────────────────────
  it('maps severity correctly', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].severity).toBe('high');
  });

  // ── T-05: Maps status correctly ──────────────────────────────────────────────
  it('maps status correctly', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].status).toBe('active');
  });

  // ── T-06: Maps timestamp correctly ───────────────────────────────────────────
  it('maps timestamp correctly', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].timestamp).toBe('2024-01-01T00:00:00Z');
  });

  // ── T-07: Maps start_time to startTime ───────────────────────────────────────
  it('maps start_time to startTime', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].startTime).toBe('2024-01-01T01:00:00Z');
  });

  // ── T-08: Maps end_time to endTime ───────────────────────────────────────────
  it('maps end_time to endTime', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].endTime).toBe('2024-01-01T02:00:00Z');
  });

  // ── T-09: Maps vessels_involved with fallback ────────────────────────────────
  it('maps vessels_involved with fallback to empty array', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ vessels_involved: undefined as unknown as string[] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].vessels).toEqual([]);
  });

  // ── T-10: Maps compound with fallback ────────────────────────────────────────
  it('maps compound with fallback to false', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ compound: undefined as unknown as boolean })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].compound).toBe(false);
  });

  // ── T-11: Maps constituent_types with fallback ───────────────────────────────
  it('maps constituent_types with fallback to empty array', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ constituent_types: undefined as unknown as string[] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].constituentTypes).toEqual([]);
  });

  // ── T-12: Maps compound true ─────────────────────────────────────────────────
  it('maps compound true', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ compound: true, constituent_types: ['a', 'b'] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].compound).toBe(true);
    expect(result.current.data?.events[0].constituentTypes).toEqual(['a', 'b']);
  });

  // ── T-13: Returns total count ────────────────────────────────────────────────
  it('returns total count', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ total: 42 }));
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(42);
  });

  // ── T-14: Loading state is true initially ────────────────────────────────────
  it('loading state is true initially', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isLoading).toBe(true);
  });

  // ── T-15: Error state on API failure ─────────────────────────────────────────
  it('error state on API failure', async () => {
    mockedFetch.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  // ── T-16: Passes correct limit ───────────────────────────────────────────────
  it('passes correct limit from rowsPerPage', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination({ rowsPerPage: 25 }), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });

  // ── T-17: Computes offset as page * rowsPerPage ──────────────────────────────
  it('computes offset as page * rowsPerPage', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination({ page: 3, rowsPerPage: 10 }), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 30 }));
  });

  // ── T-18: Passes searchQuery to API ──────────────────────────────────────────
  it('passes searchQuery to API', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: 'vessel1' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'vessel1' }));
  });

  // ── T-19: Empty searchQuery is passed as empty string ────────────────────────
  it('empty searchQuery is passed as empty string', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '' }));
  });

  // ── T-20: Filters are JSON-stringified when non-empty ────────────────────────
  it('filters are JSON-stringified when non-empty', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    const { result } = renderHook(
      () => useEvents({ filters, pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({
      filters: JSON.stringify(filters),
    }));
  });

  // ── T-21: Filters are undefined when empty ───────────────────────────────────
  it('filters are undefined when empty', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ filters: undefined }));
  });

  // ── T-22: eventId is passed to API ───────────────────────────────────────────
  it('eventId is passed to API', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '', eventId: 'evt-123' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'evt-123' }));
  });

  // ── T-23: eventId is undefined when not provided ─────────────────────────────
  it('eventId is undefined when not provided', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ eventId: undefined }));
  });

  // ── T-24: enabled defaults to true ───────────────────────────────────────────
  it('enabled defaults to true', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-25: Query is disabled when enabled is false ────────────────────────────
  it('query is disabled when enabled is false', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '', enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  // ── T-26: Maps multiple events ───────────────────────────────────────────────
  it('maps multiple events', async () => {
    mockedFetch.mockResolvedValue({
      events: [
        makeRawEvent({ id: 'e1', type: 'a' }),
        makeRawEvent({ id: 'e2', type: 'b' }),
        makeRawEvent({ id: 'e3', type: 'c' }),
      ],
      total: 3,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events).toHaveLength(3);
    expect(result.current.data?.events[1].id).toBe('e2');
  });

  // ── T-27: Empty events list ──────────────────────────────────────────────────
  it('handles empty events list', async () => {
    mockedFetch.mockResolvedValue({ events: [], total: 0, limit: 10, offset: 0 });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  // ── T-28: Changing pagination triggers refetch ───────────────────────────────
  it('changing pagination triggers refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ pagination }) => useEvents({ filters: [], pagination, searchQuery: '' }),
      { wrapper, initialProps: { pagination: makePagination({ page: 0 }) } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender({ pagination: makePagination({ page: 1 }) });
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 10 }));
  });

  // ── T-29: Changing searchQuery triggers refetch ──────────────────────────────
  it('changing searchQuery triggers refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ searchQuery }) => useEvents({ filters: [], pagination: makePagination(), searchQuery }),
      { wrapper, initialProps: { searchQuery: '' } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender({ searchQuery: 'test' });
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
    expect(mockedFetch).toHaveBeenLastCalledWith(expect.objectContaining({ searchQuery: 'test' }));
  });

  // ── T-30: Changing filters triggers refetch ──────────────────────────────────
  it('changing filters triggers refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ filters }) => useEvents({ filters, pagination: makePagination(), searchQuery: '' }),
      { wrapper, initialProps: { filters: [] as EventFilter[] } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const newFilters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'low' }];
    rerender({ filters: newFilters });
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(2));
  });

  // ── T-31: placeholderData keeps previous data during refetch ──────────────────
  it('placeholderData keeps previous data during refetch', async () => {
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ total: 1 }));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ total: 99 }));
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ pagination }) => useEvents({ filters: [], pagination, searchQuery: '' }),
      { wrapper, initialProps: { pagination: makePagination({ page: 0 }) } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total).toBe(1);
    rerender({ pagination: makePagination({ page: 1 }) });
    expect(result.current.data?.total).toBe(1);
  });

  // ── T-32: Maps event with null start_time ────────────────────────────────────
  it('maps event with null start_time', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ start_time: null })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].startTime).toBeNull();
  });

  // ── T-33: Maps event with null end_time ──────────────────────────────────────
  it('maps event with null end_time', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ end_time: null })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].endTime).toBeNull();
  });

  // ── T-34: Maps event with multiple vessels ───────────────────────────────────
  it('maps event with multiple vessels', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ vessels_involved: ['v1', 'v2', 'v3'] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].vessels).toHaveLength(3);
  });

  // ── T-35: Maps event with empty vessels ──────────────────────────────────────
  it('maps event with empty vessels', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ vessels_involved: [] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].vessels).toEqual([]);
  });

  // ── T-36: Maps event with multiple constituent types ─────────────────────────
  it('maps event with multiple constituent types', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ constituent_types: ['a', 'b', 'c', 'd'] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].constituentTypes).toHaveLength(4);
  });

  // ── T-37: Maps event with low severity ───────────────────────────────────────
  it('maps event with low severity', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ severity: 'low' })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].severity).toBe('low');
  });

  // ── T-38: Maps event with inactive status ────────────────────────────────────
  it('maps event with inactive status', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ status: 'inactive' })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].status).toBe('inactive');
  });

  // ── T-39: Large number of events ─────────────────────────────────────────────
  it('handles large number of events', async () => {
    const events = Array.from({ length: 100 }, (_, i) =>
      makeRawEvent({ id: `e-${i}`, type: `type_${i}` }),
    );
    mockedFetch.mockResolvedValue({ events, total: 100, limit: 100, offset: 0 });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination({ rowsPerPage: 100 }), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events).toHaveLength(100);
    expect(result.current.data?.events[99].id).toBe('e-99');
  });

  // ── T-40: Transition from disabled to enabled triggers fetch ─────────────────
  it('transition from disabled to enabled triggers fetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ enabled }) => useEvents({ filters: [], pagination: makePagination(), searchQuery: '', enabled }),
      { wrapper, initialProps: { enabled: false } },
    );
    expect(mockedFetch).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-41: Transition from enabled to disabled does not refetch ───────────────
  it('transition from enabled to disabled does not refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ enabled }) => useEvents({ filters: [], pagination: makePagination(), searchQuery: '', enabled }),
      { wrapper, initialProps: { enabled: true } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender({ enabled: false });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-42: Multiple filters are stringified ───────────────────────────────────
  it('multiple filters are stringified', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'status', operator: 'ne', value: 'inactive' },
    ];
    const { result } = renderHook(
      () => useEvents({ filters, pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({
      filters: JSON.stringify(filters),
    }));
  });

  // ── T-43: Filter with between operator ───────────────────────────────────────
  it('filter with between operator is stringified', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const filters: EventFilter[] = [
      { field: 'timestamp', operator: 'between', value: '2024-01-01', value2: '2024-12-31' },
    ];
    const { result } = renderHook(
      () => useEvents({ filters, pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({
      filters: JSON.stringify(filters),
    }));
  });

  // ── T-44: Error message is preserved ─────────────────────────────────────────
  it('error message is preserved', async () => {
    mockedFetch.mockRejectedValue(new Error('Server down'));
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Server down');
  });

  // ── T-45: Data is undefined when disabled ────────────────────────────────────
  it('data is undefined when disabled', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '', enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.data).toBeUndefined();
  });

  // ── T-46: Page 0 offset is 0 ─────────────────────────────────────────────────
  it('page 0 offset is 0', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination({ page: 0 }), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  // ── T-47: Page 5 rowsPerPage 20 offset is 100 ────────────────────────────────
  it('page 5 rowsPerPage 20 offset is 100', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination({ page: 5, rowsPerPage: 20 }), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ offset: 100, limit: 20 }));
  });

  // ── T-48: Rerender with same params does not refetch ─────────────────────────
  it('rerender with same params does not refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    rerender();
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  // ── T-49: Maps event with empty string type ──────────────────────────────────
  it('maps event with empty string type', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ type: '' })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].type).toBe('');
  });

  // ── T-50: Maps event with special characters in id ───────────────────────────
  it('maps event with special characters in id', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ id: 'evt-"special"&<id>' })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].id).toBe('evt-"special"&<id>');
  });

  // ── T-51: Maps event with unicode vessel IDs ─────────────────────────────────
  it('maps event with unicode vessel IDs', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ vessels_involved: ['船A', '船B'] })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].vessels).toEqual(['船A', '船B']);
  });

  // ── T-52: Maps event with very long ID ───────────────────────────────────────
  it('maps event with very long ID', async () => {
    const longId = 'a'.repeat(200);
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ id: longId })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].id).toBe(longId);
  });

  // ── T-53: Maps event with medium severity ────────────────────────────────────
  it('maps event with medium severity', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ severity: 'medium' })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].severity).toBe('medium');
  });

  // ── T-54: Maps event with pending status ─────────────────────────────────────
  it('maps event with pending status', async () => {
    mockedFetch.mockResolvedValue({
      events: [makeRawEvent({ status: 'pending' })],
      total: 1,
      limit: 10,
      offset: 0,
    });
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination(), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.events[0].status).toBe('pending');
  });

  // ── T-55: RowsPerPage 1 ──────────────────────────────────────────────────────
  it('rowsPerPage 1 passes limit 1', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(
      () => useEvents({ filters: [], pagination: makePagination({ rowsPerPage: 1 }), searchQuery: '' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
  });
});
