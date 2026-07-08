import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { useCompoundConfigs } from '../hooks/useCompoundConfigs';
import { fetchCompoundConfigs } from '../api/eventTableApi';
import { mapCompoundConfigFromApi } from '../model/mappers';
import type {
  CompoundConfigListApiResponse,
  CompoundConfigApiResponse,
} from '../api/types';
import type { PaginationParams } from '../model/types';

vi.mock('../api/eventTableApi');
vi.mock('../model/mappers');

const mockFetchCompoundConfigs = vi.mocked(fetchCompoundConfigs);
const mockMapCompoundConfigFromApi = vi.mocked(mapCompoundConfigFromApi);

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const rawConfig: CompoundConfigApiResponse = {
  id: 'cfg-1',
  type: 'compound_speed',
  constituent_types: ['speed_violation', 'zone_entry'],
  description: 'Speed + zone compound',
  severity: 'high',
  start_time: '2024-01-01T00:00:00Z',
  end_time: '2024-01-01T01:00:00Z',
  timestamp: '2024-01-01T00:00:00Z',
  compound: true,
};

const rawConfig2: CompoundConfigApiResponse = { ...rawConfig, id: 'cfg-2', type: 'compound_zone' };

const listResponse: CompoundConfigListApiResponse = {
  events: [rawConfig, rawConfig2],
  total: 15,
};

const mappedConfig = {
  id: 'cfg-1',
  type: 'compound_speed',
  constituentTypes: ['speed_violation', 'zone_entry'],
  description: 'Speed + zone compound',
  severity: 'high',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-01T01:00:00Z',
  timestamp: '2024-01-01T00:00:00Z',
};

const mappedConfig2 = { ...mappedConfig, id: 'cfg-2', type: 'compound_zone' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface HookProps {
  pagination: PaginationParams;
  searchQuery: string;
  enabled?: boolean;
}

const defaultProps: HookProps = {
  pagination: { page: 0, rowsPerPage: 10 },
  searchQuery: '',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderConfigs(props: HookProps = defaultProps) {
  return renderHook((p: HookProps) => useCompoundConfigs(p), {
    initialProps: props,
    wrapper: createWrapper(),
  });
}

// ---------------------------------------------------------------------------

describe('useCompoundConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCompoundConfigs.mockResolvedValue(listResponse);
    mockMapCompoundConfigFromApi.mockImplementation((raw: CompoundConfigApiResponse) =>
      raw.id === 'cfg-1' ? mappedConfig : mappedConfig2,
    );
  });

  // -------------------------------------------------------------------------
  // Query enabling
  // -------------------------------------------------------------------------

  it('queries on mount when enabled', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
  });

  it('does not query when enabled is false', () => {
    renderConfigs({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundConfigs).not.toHaveBeenCalled();
  });

  it('defaults enabled to true', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('query enables when enabled transitions false → true', async () => {
    const { result, rerender } = renderConfigs({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundConfigs).not.toHaveBeenCalled();
    rerender({ ...defaultProps, enabled: true });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1));
  });

  // -------------------------------------------------------------------------
  // API call parameters
  // -------------------------------------------------------------------------

  it('passes correct limit and offset', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 3, rowsPerPage: 20 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 60 }),
    );
  });

  it('passes offset 0 for page 0', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
    );
  });

  it('passes searchQuery when provided', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: 'speed' }),
    );
  });

  it('passes empty searchQuery when not provided', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: '' }),
    );
  });

  // -------------------------------------------------------------------------
  // Data transformation
  // -------------------------------------------------------------------------

  it('maps each config through mapCompoundConfigFromApi', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockMapCompoundConfigFromApi).toHaveBeenCalledTimes(2);
    expect(mockMapCompoundConfigFromApi).toHaveBeenCalledWith(rawConfig, 0, [rawConfig, rawConfig2]);
    expect(mockMapCompoundConfigFromApi).toHaveBeenCalledWith(rawConfig2, 1, [rawConfig, rawConfig2]);
  });

  it('returns configs array and total', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([mappedConfig, mappedConfig2]);
    expect(result.current.data?.total).toBe(15);
  });

  it('returns empty configs when API returns empty', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  it('handles missing events field (defaults to [])', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: undefined as unknown as CompoundConfigApiResponse[], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
  });

  it('handles missing total field (defaults to 0)', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: undefined as unknown as number });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('maps a single config correctly', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([mappedConfig]);
  });

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  it('isLoading is true while pending', () => {
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderConfigs();
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading is false after success', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('error is null on success', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.error).toBeNull();
  });

  it('error is populated on failure', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('fail');
  });

  it('data is null before success', () => {
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderConfigs();
    expect(result.current.data).toBeUndefined();
  });

  it('isLoading is false after error', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Refetch behavior
  // -------------------------------------------------------------------------

  it('refetches when page changes', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('refetches when rowsPerPage changes', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 0, rowsPerPage: 50 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('refetches when searchQuery changes', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('does not refetch on identical rerender', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender(defaultProps);
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Disabled state
  // -------------------------------------------------------------------------

  it('data is null when disabled', () => {
    renderConfigs({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundConfigs).not.toHaveBeenCalled();
  });

  it('isLoading is false when disabled', () => {
    const { result } = renderConfigs({ ...defaultProps, enabled: false });
    expect(result.current.isLoading).toBe(false);
  });

  it('error is null when disabled', () => {
    const { result } = renderConfigs({ ...defaultProps, enabled: false });
    expect(result.current.error).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Basic fetch - additional cases
  // -------------------------------------------------------------------------

  it('Verify compound configurations are fetched successfully with valid pagination values', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
  });

  it('Verify hook returns configuration data from API response', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(2);
  });

  it('Verify hook returns total count correctly', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(15);
  });

  it('Verify API is called on initial hook execution', async () => {
    renderConfigs();
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1));
  });

  it('Verify API is called with correct limit value', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('Verify API is called with correct offset value', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 }));
  });

  it('Verify API is called with search query when provided', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed' }));
  });

  it('Verify API is not called when enabled is false', () => {
    renderConfigs({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundConfigs).not.toHaveBeenCalled();
  });

  it('Verify API is called when enabled changes from false to true', async () => {
    const { rerender } = renderConfigs({ ...defaultProps, enabled: false });
    expect(mockFetchCompoundConfigs).not.toHaveBeenCalled();
    rerender({ ...defaultProps, enabled: true });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1));
  });

  it('Verify hook returns empty configs array when no records exist', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
  });

  it('Verify hook handles single record response correctly', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
  });

  it('Verify hook handles multiple record response correctly', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(2);
    expect(result.current.data?.total).toBe(15);
  });

  it('Verify hook returns loading state while fetching data', () => {
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderConfigs();
    expect(result.current.isLoading).toBe(true);
  });

  it('Verify hook returns success state after successful response', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Verify hook returns error state when request fails', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify hook handles response with total count only', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 42 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
    expect(result.current.data?.total).toBe(42);
  });

  it('Verify hook handles response with events only', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: undefined as unknown as number });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify hook works correctly after component re-render', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender(defaultProps);
    expect(result.current.data?.configs).toHaveLength(2);
  });

  it('Verify hook works correctly when called multiple times', async () => {
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    const { result: r2 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(r1.current.data).toBeDefined());
    await waitFor(() => expect(r2.current.data).toBeDefined());
  });

  it('Verify hook fetches fresh data after parameter changes', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  // -------------------------------------------------------------------------
  // Pagination Test Cases
  // -------------------------------------------------------------------------

  it('Verify pagination works for page 0', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  it('Verify pagination works for page 1', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 10 }));
  });

  it('Verify pagination works for page 2', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 }));
  });

  it('Verify correct offset calculation for page 0', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  it('Verify correct offset calculation for page 1', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 10 }));
  });

  it('Verify correct offset calculation for page 5', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 5, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 50 }));
  });

  it('Verify pagination works with rowsPerPage = 5', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 5 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
  });

  it('Verify pagination works with rowsPerPage = 10', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('Verify pagination works with rowsPerPage = 25', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });

  it('Verify pagination works with rowsPerPage = 50', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 50 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });

  it('Verify changing page triggers new API request', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify changing rowsPerPage triggers new API request', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify pagination returns correct records for each page', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([mappedConfig, mappedConfig2]);
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify first page loads correctly', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 10 }));
  });

  it('Verify middle page loads correctly', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 20, limit: 10 }));
  });

  it('Verify last page loads correctly', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 10, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 100, limit: 10 }));
  });

  it('Verify pagination works when total records equal page size', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 10 });
    const { result } = renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(10);
  });

  it('Verify pagination works when total records exceed page size', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig, rawConfig2], total: 25 });
    const { result } = renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(25);
  });

  it('Verify pagination works when total records are less than page size', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 3 });
    const { result } = renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(3);
  });

  it('Verify pagination works when total records are zero', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 0 });
    const { result } = renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
    expect(result.current.data?.configs).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Search Test Cases
  // -------------------------------------------------------------------------

  it('Verify search with valid search text', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed' }));
  });

  it('Verify search with invalid search text', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '!!!invalid!!!' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '!!!invalid!!!' }));
  });

  it('Verify search with exact match', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1 });
    renderConfigs({ ...defaultProps, searchQuery: 'compound_speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'compound_speed' }));
  });

  it('Verify search with partial match', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed' }));
  });

  it('Verify search with uppercase characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'SPEED' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'SPEED' }));
  });

  it('Verify search with lowercase characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed' }));
  });

  it('Verify search with mixed-case characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'SpEeD' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'SpEeD' }));
  });

  it('Verify search with numbers only', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '12345' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '12345' }));
  });

  it('Verify search with alphabets only', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed' }));
  });

  it('Verify search with alphanumeric text', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed123' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed123' }));
  });

  it('Verify search with special characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed@#$%' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed@#$%' }));
  });

  it('Verify search returns matching results', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1 });
    const { result } = renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
  });

  it('Verify search returns no results for invalid text', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 0 });
    const { result } = renderConfigs({ ...defaultProps, searchQuery: 'xyznonexistent' });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify search query is included in API request', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'zone' }));
  });

  it('Verify search updates results after query change', async () => {
    const { result, rerender } = renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
    expect(mockFetchCompoundConfigs).toHaveBeenLastCalledWith(expect.objectContaining({ searchQuery: 'zone' }));
  });

  it('Verify search works with repeated searches', async () => {
    const { result, rerender } = renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'speed' });
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
  });

  it('Verify search works after pagination change', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 }, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
    expect(mockFetchCompoundConfigs).toHaveBeenLastCalledWith(expect.objectContaining({ searchQuery: 'zone', offset: 10 }));
  });

  it('Verify search works after page refresh', async () => {
    const { result, rerender } = renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'speed' });
    expect(result.current.data?.configs).toHaveLength(2);
  });

  it('Verify search works with one character', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 's' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 's' }));
  });

  it('Verify search works with two characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'sp' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'sp' }));
  });

  // -------------------------------------------------------------------------
  // Search Edge Cases
  // -------------------------------------------------------------------------

  it('Verify search with empty string', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '' }));
  });

  it('Verify search with only spaces', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '   ' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '   ' }));
  });

  it('Verify search with leading spaces', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '  speed' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '  speed' }));
  });

  it('Verify search with trailing spaces', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed  ' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed  ' }));
  });

  it('Verify search with leading and trailing spaces', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '  speed  ' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '  speed  ' }));
  });

  it('Verify search with tab characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed\tzone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed\tzone' }));
  });

  it('Verify search with newline characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed\nzone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed\nzone' }));
  });

  it('Verify search with multiple consecutive spaces', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed    zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed    zone' }));
  });

  it('Verify search with Unicode characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'spëéd' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'spëéd' }));
  });

  it('Verify search with emojis', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'speed🚀' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'speed🚀' }));
  });

  it('Verify search with accented characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'café' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'café' }));
  });

  it('Verify search with non-English text', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '速度' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '速度' }));
  });

  it('Verify search with a very long string (500+ characters)', async () => {
    const longQuery = 'a'.repeat(500);
    renderConfigs({ ...defaultProps, searchQuery: longQuery });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: longQuery }));
  });

  it('Verify search with a very long string (1000+ characters)', async () => {
    const longQuery = 'b'.repeat(1000);
    renderConfigs({ ...defaultProps, searchQuery: longQuery });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: longQuery }));
  });

  it('Verify search with SQL injection payload', async () => {
    renderConfigs({ ...defaultProps, searchQuery: "'; DROP TABLE configs; --" });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: "'; DROP TABLE configs; --" }));
  });

  it('Verify search with script injection payload', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '<script>alert("xss")</script>' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '<script>alert("xss")</script>' }));
  });

  it('Verify search with HTML tags', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '<div>speed</div>' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '<div>speed</div>' }));
  });

  it('Verify search with URL values', async () => {
    renderConfigs({ ...defaultProps, searchQuery: 'https://example.com' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'https://example.com' }));
  });

  it('Verify search with encoded characters', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '%20speed%20' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '%20speed%20' }));
  });

  it('Verify search with unsupported symbols', async () => {
    renderConfigs({ ...defaultProps, searchQuery: '§±¡¿™®©' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: '§±¡¿™®©' }));
  });

  // -------------------------------------------------------------------------
  // Pagination Edge Cases
  // -------------------------------------------------------------------------

  it('Verify behavior when page number is negative', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: -1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: -10 }));
  });

  it('Verify behavior when page number is extremely large', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 999999, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 9999990 }));
  });

  it('Verify behavior when page number is undefined', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: undefined as unknown as number, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
  });

  it('Verify behavior when page number is null', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: null as unknown as number, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  });

  it('Verify behavior when rowsPerPage is zero', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 0 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 0, offset: 0 }));
  });

  it('Verify behavior when rowsPerPage is negative', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: -5 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: -5 }));
  });

  it('Verify behavior when rowsPerPage is undefined', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: undefined as unknown as number } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
  });

  it('Verify behavior when rowsPerPage is null', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: null as unknown as number } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
  });

  it('Verify behavior when rowsPerPage is extremely large', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: 0, rowsPerPage: 999999 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ limit: 999999 }));
  });

  it('Verify behavior when page and rowsPerPage are both invalid', async () => {
    renderConfigs({ ...defaultProps, pagination: { page: -1, rowsPerPage: -10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalled());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledWith(expect.objectContaining({ offset: 10, limit: -10 }));
  });

  // -------------------------------------------------------------------------
  // API Response Test Cases
  // -------------------------------------------------------------------------

  it('Verify behavior when API returns empty events array', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
  });

  it('Verify behavior when API returns null events', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: null as unknown as CompoundConfigApiResponse[], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
  });

  it('Verify behavior when API returns undefined events', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: undefined as unknown as CompoundConfigApiResponse[], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
  });

  it('Verify behavior when API returns null total', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: null as unknown as number });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify behavior when API returns undefined total', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: undefined as unknown as number });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify behavior when API returns total as zero', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify behavior when API returns negative total', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [], total: -5 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.total).toBe(-5);
  });

  it('Verify behavior when API returns duplicate records', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig, rawConfig], total: 2 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(2);
  });

  it('Verify behavior when API returns malformed data', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [{ id: 'x' } as CompoundConfigApiResponse], total: 1 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
  });

  it('Verify behavior when API returns unexpected fields', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1, extra: 'field' } as unknown as CompoundConfigListApiResponse);
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
  });

  it('Verify behavior when API returns missing fields', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({} as unknown as CompoundConfigListApiResponse);
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify behavior when API returns nested unexpected objects', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [{ ...rawConfig, nested: { deep: 'object' } } as unknown as CompoundConfigApiResponse], total: 1 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
  });

  it('Verify behavior when API returns large dataset', async () => {
    const largeEvents = Array.from({ length: 100 }, (_, i) => ({ ...rawConfig, id: `cfg-${i}` }));
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: largeEvents, total: 100 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(100);
    expect(result.current.data?.total).toBe(100);
  });

  it('Verify behavior when API returns empty response body', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({} as unknown as CompoundConfigListApiResponse);
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify behavior when API returns partial response', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig] } as unknown as CompoundConfigListApiResponse);
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toHaveLength(1);
    expect(result.current.data?.total).toBe(0);
  });

  it('Verify behavior when API returns invalid data types', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: 'not-an-array' as unknown as CompoundConfigApiResponse[], total: 'not-a-number' as unknown as number });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify behavior when API returns string instead of array', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: 'string-not-array' as unknown as CompoundConfigApiResponse[], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify behavior when API returns object instead of array', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: { not: 'array' } as unknown as CompoundConfigApiResponse[], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify behavior when API returns boolean values unexpectedly', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: true as unknown as CompoundConfigApiResponse[], total: 0 });
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Verify behavior when API response structure changes', async () => {
    mockFetchCompoundConfigs.mockResolvedValueOnce({ data: [rawConfig], count: 1 } as unknown as CompoundConfigListApiResponse);
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.configs).toEqual([]);
    expect(result.current.data?.total).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Error Handling Test Cases
  // -------------------------------------------------------------------------

  const httpStatuses: Array<[string, number]> = [
    ['HTTP 400', 400], ['HTTP 401', 401], ['HTTP 403', 403], ['HTTP 404', 404],
    ['HTTP 408', 408], ['HTTP 429', 429], ['HTTP 500', 500], ['HTTP 502', 502],
    ['HTTP 503', 503], ['HTTP 504', 504],
  ];

  httpStatuses.forEach(([label, status]) => {
    it(`Verify handling of ${label} response`, async () => {
      mockFetchCompoundConfigs.mockRejectedValueOnce(new Error(`Request failed with status code ${status}`));
      const { result } = renderConfigs();
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.error?.message).toContain(String(status));
    });
  });

  it('Verify handling of network timeout', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('timeout');
  });

  it('Verify handling of connection refused error', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('ECONNREFUSED');
  });

  it('Verify handling of DNS resolution failure', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toContain('ENOTFOUND');
  });

  it('Verify handling of server unavailable error', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('Service Unavailable'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it('Verify handling of interrupted connection', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('socket hang up'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it('Verify loading state is cleared after error', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isLoading).toBe(false);
  });

  it('Verify error state is populated correctly', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('custom error'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('custom error');
  });

  it('Verify hook recovers after successful retry', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('fail'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
    mockFetchCompoundConfigs.mockResolvedValueOnce(listResponse);
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Verify retry works after temporary failure', async () => {
    mockFetchCompoundConfigs.mockRejectedValueOnce(new Error('temporary'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
    mockFetchCompoundConfigs.mockResolvedValueOnce(listResponse);
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Verify repeated failures do not crash application', async () => {
    mockFetchCompoundConfigs.mockRejectedValue(new Error('persistent'));
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.isError).toBe(true));
    await act(async () => { await result.current.refetch().catch(() => {}); });
    expect(result.current.isError).toBe(true);
  });

  // -------------------------------------------------------------------------
  // React Query & Cache Test Cases
  // -------------------------------------------------------------------------

  it('Verify identical query parameters reuse cache', async () => {
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(r1.current.data).toBeDefined());
    const { result: r2 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
    expect(r2.current.data).toBeDefined();
  });

  it('Verify different page values create different cache entries', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify different rowsPerPage values create different cache entries', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 0, rowsPerPage: 25 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify different search values create different cache entries', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify query key changes after page update', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify query key changes after rowsPerPage update', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 0, rowsPerPage: 50 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify query key changes after search update', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
  });

  it('Verify cached data is displayed immediately', async () => {
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(r1.current.data).toBeDefined());
    const { result: r2 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    expect(r2.current.data).toBeDefined();
    expect(r2.current.isLoading).toBe(false);
  });

  it('Verify stale cache is updated after refetch', async () => {
    const { result } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1 });
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data?.total).toBe(1));
  });

  it('Verify duplicate requests are not sent for same query', async () => {
    const wrapper = createWrapper();
    const { result: r1 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(r1.current.data).toBeDefined());
    const { result: r2 } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(r2.current.data).toBeDefined());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
  });

  it('Verify placeholderData shows previous data while loading', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    expect(result.current.data).toBeDefined();
  });

  it('Verify previous page data remains visible during pagination', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    const firstPageData = result.current.data;
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    expect(result.current.data).toEqual(firstPageData);
  });

  it('Verify previous search results remain visible during search update', async () => {
    const { result, rerender } = renderConfigs({ ...defaultProps, searchQuery: 'speed' });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const firstSearchData = result.current.data;
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    rerender({ ...defaultProps, searchQuery: 'zone' });
    expect(result.current.data).toEqual(firstSearchData);
  });

  it('Verify placeholder data is replaced after successful fetch', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig], total: 1 });
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data?.total).toBe(1));
  });

  it('Verify cache works correctly after component remount', async () => {
    const wrapper = createWrapper();
    const { unmount } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1));
    unmount();
    const { result } = renderHook(() => useCompoundConfigs(defaultProps), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Concurrency & Race Condition Edge Cases
  // -------------------------------------------------------------------------

  it('Verify rapid page changes display latest page results only', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    rerender({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    rerender({ ...defaultProps, pagination: { page: 3, rowsPerPage: 10 } });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(4));
    expect(mockFetchCompoundConfigs).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 30 }));
  });

  it('Verify rapid search changes display latest search results only', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, searchQuery: 'a' });
    rerender({ ...defaultProps, searchQuery: 'b' });
    rerender({ ...defaultProps, searchQuery: 'c' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenLastCalledWith(expect.objectContaining({ searchQuery: 'c' })));
  });

  it('Verify stale API responses do not overwrite newer responses', async () => {
    let resolveSlow!: (value: CompoundConfigListApiResponse) => void;
    const slowPromise = new Promise<CompoundConfigListApiResponse>(r => { resolveSlow = r; });
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    mockFetchCompoundConfigs.mockReturnValueOnce(slowPromise);
    rerender({ ...defaultProps, pagination: { page: 1, rowsPerPage: 10 } });
    mockFetchCompoundConfigs.mockResolvedValueOnce({ events: [rawConfig2], total: 5 });
    rerender({ ...defaultProps, pagination: { page: 2, rowsPerPage: 10 } });
    await waitFor(() => expect(result.current.data?.total).toBe(5));
    resolveSlow({ events: [rawConfig], total: 99 });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(3));
    expect(result.current.data?.total).toBe(5);
  });

  it('Verify component unmount during request does not cause errors', () => {
    mockFetchCompoundConfigs.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = renderConfigs();
    expect(() => unmount()).not.toThrow();
  });

  it('Verify simultaneous pagination and search changes return correct data', async () => {
    const { result, rerender } = renderConfigs();
    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender({ ...defaultProps, pagination: { page: 2, rowsPerPage: 25 }, searchQuery: 'zone' });
    await waitFor(() => expect(mockFetchCompoundConfigs).toHaveBeenCalledTimes(2));
    expect(mockFetchCompoundConfigs).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50, limit: 25, searchQuery: 'zone' }));
  });
});
