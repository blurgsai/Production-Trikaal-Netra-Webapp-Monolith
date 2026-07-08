import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventMetadata } from '../hooks/useEventMetadata';
import { fetchEventMetadata } from '../api/eventTableApi';
import { mapMetadataColumnFromApi } from '../model/mappers';
import type { EventMetadataApiResponse, MetadataColumnRaw } from '../api/types';
import type { EventMetadataColumn } from '../model/types';

vi.mock('../api/eventTableApi');
vi.mock('../model/mappers');

const mockFetchEventMetadata = vi.mocked(fetchEventMetadata);
const mockMapMetadataColumnFromApi = vi.mocked(mapMetadataColumnFromApi);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(
  QueryClientProvider,
  { client: queryClient },
  children
);

const mockRawColumn: MetadataColumnRaw = {
  field: 'test_field',
  label: 'Test Field',
  type: 'string',
  filterable: true,
  unique_values: ['a', 'b', 'c'],
};

const mockMappedColumn: EventMetadataColumn = {
  field: 'test_field',
  label: 'Test Field',
  type: 'string',
  uniqueValues: ['a', 'b', 'c'],
};

describe('useEventMetadata', () => {
  beforeEach(() => {
    mockFetchEventMetadata.mockReset();
    mockMapMetadataColumnFromApi.mockReset();
    queryClient.clear();
  });

  // Success Scenarios
  it('Should fetch metadata successfully on mount', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should call fetchEventMetadata once', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should return mapped metadata columns', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockMappedColumn]);
  });

  it('Should return correct number of metadata columns', async () => {
    const rawColumns = [mockRawColumn, { ...mockRawColumn, field: 'field2' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('Should expose data after successful fetch', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
    expect(result.current.data).toEqual([mockMappedColumn]);
  });

  it('Should set isSuccess to true after successful fetch', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should set isLoading to false after successful fetch', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it('Should handle a single metadata column', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('Should handle multiple metadata columns', async () => {
    const rawColumns = [
      mockRawColumn,
      { ...mockRawColumn, field: 'field2' },
      { ...mockRawColumn, field: 'field3' },
    ];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });

  it('Should preserve column order after mapping', async () => {
    const rawColumns = [
      { ...mockRawColumn, field: 'first' },
      { ...mockRawColumn, field: 'second' },
      { ...mockRawColumn, field: 'third' },
    ];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('first');
    expect(result.current.data?.[1].field).toBe('second');
    expect(result.current.data?.[2].field).toBe('third');
  });

  // API Call Tests
  it('Should invoke fetchEventMetadata on initial render', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1));
  });

  it('Should await API response before returning data', async () => {
    let resolve: ((v: EventMetadataApiResponse) => void) | undefined;
    mockFetchEventMetadata.mockImplementation(() => new Promise(r => (resolve = r)) as never);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    expect(result.current.data).toBeUndefined();
    resolve?.({ columns: [mockRawColumn] });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Should not call API multiple times during same render', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should use correct query function', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(mockFetchEventMetadata).toHaveBeenCalled());
  });

  it('Should handle delayed API responses', async () => {
    let resolve: ((v: EventMetadataApiResponse) => void) | undefined;
    mockFetchEventMetadata.mockImplementation(() => new Promise(r => (resolve = r)) as never);
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await new Promise(r => setTimeout(r, 100));
    resolve?.({ columns: [mockRawColumn] });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle immediate API responses', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch data only once for same query', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should support mocked API responses', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockMappedColumn]);
  });

  it('Should receive expected API payload', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(mockFetchEventMetadata).toHaveBeenCalled());
  });

  it('Should process returned API data correctly', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockMappedColumn]);
  });

  // Mapper Tests
  it('Should call mapMetadataColumnFromApi once per column', async () => {
    const rawColumns = [mockRawColumn, { ...mockRawColumn, field: 'field2' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMapMetadataColumnFromApi).toHaveBeenCalledTimes(2);
  });

  it('Should call mapper for single column', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMapMetadataColumnFromApi).toHaveBeenCalledTimes(1);
  });

  it('Should call mapper for multiple columns', async () => {
    const rawColumns = [mockRawColumn, { ...mockRawColumn, field: 'field2' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMapMetadataColumnFromApi).toHaveBeenCalledTimes(2);
  });

  it('Should pass raw column data to mapper', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMapMetadataColumnFromApi).toHaveBeenCalledWith(mockRawColumn, 0, [mockRawColumn]);
  });

  it('Should return mapper output', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockMappedColumn]);
  });

  it('Should preserve mapper-transformed values', async () => {
    const customMapped = { ...mockMappedColumn, field: 'custom_field' };
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(customMapped);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([customMapped]);
  });

  it('Should maintain array length after mapping', async () => {
    const rawColumns = [mockRawColumn, { ...mockRawColumn, field: 'field2' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('Should preserve mapped object structure', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toHaveProperty('field');
    expect(result.current.data?.[0]).toHaveProperty('label');
    expect(result.current.data?.[0]).toHaveProperty('type');
    expect(result.current.data?.[0]).toHaveProperty('uniqueValues');
  });

  it('Should handle mapper returning custom values', async () => {
    const customMapped = { field: 'custom', label: 'Custom', type: 'number' as const, uniqueValues: [1, 2, 3] };
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(customMapped);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([customMapped]);
  });

  it('Should preserve order of mapped columns', async () => {
    const rawColumns = [
      { ...mockRawColumn, field: 'first' },
      { ...mockRawColumn, field: 'second' },
    ];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('first');
    expect(result.current.data?.[1].field).toBe('second');
  });

  // Empty Data Tests
  it('Should handle empty columns array', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('Should return empty array when columns are empty', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('Should not throw error on empty array', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('Should call mapper zero times when array is empty', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMapMetadataColumnFromApi).not.toHaveBeenCalled();
  });

  it('Should remain successful with empty data', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isError).toBe(false);
  });

  it('Should expose empty array as data', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('Should cache empty array result', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should support rerender with empty data', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('Should maintain query success state', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle repeated empty responses', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  // Error Handling Tests
  it('Should handle API rejection', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('API Error'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('Should handle network error', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('Network Error'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle timeout error', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('Timeout'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 400 error', async () => {
    const error = new Error('Bad Request') as any;
    error.status = 400;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 401 error', async () => {
    const error = new Error('Unauthorized') as any;
    error.status = 401;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 403 error', async () => {
    const error = new Error('Forbidden') as any;
    error.status = 403;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 404 error', async () => {
    const error = new Error('Not Found') as any;
    error.status = 404;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 500 error', async () => {
    const error = new Error('Internal Server Error') as any;
    error.status = 500;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 502 error', async () => {
    const error = new Error('Bad Gateway') as any;
    error.status = 502;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle HTTP 503 error', async () => {
    const error = new Error('Service Unavailable') as any;
    error.status = 503;
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should set error state correctly', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('Error'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });

  it('Should expose error object', async () => {
    const error = new Error('Test Error');
    mockFetchEventMetadata.mockRejectedValue(error);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('Should stop loading after error', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('Error'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });

  it('Should not return data after error', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('Error'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('Should handle malformed API response', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: null } as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle unexpected API structure', async () => {
    mockFetchEventMetadata.mockResolvedValue({ unexpected: 'data' } as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should not crash component on failure', async () => {
    mockFetchEventMetadata.mockRejectedValue(new Error('Error'));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toBeDefined();
  });

  it('Should handle thrown exceptions', async () => {
    mockFetchEventMetadata.mockImplementation(() => { throw new Error('Exception'); });
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // React Query Cache Tests
  it('Should cache successful response', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should reuse cached data on rerender', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(firstData);
  });

  it('Should reuse cached data on remount', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, unmount } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    unmount();
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result2.current.data).toBe(firstData);
  });

  it('Should avoid duplicate requests', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should share cache across components', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should create cache using query key', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'metadata'])).toBeDefined();
  });

  it('Should reuse cache for identical query key', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should preserve cache after rerender', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'metadata'])).toBeDefined();
  });

  it('Should maintain cache consistency', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cachedData = queryClient.getQueryData(['events', 'metadata']);
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'metadata'])).toEqual(cachedData);
  });

  it('Should return cached data immediately', async () => {
    queryClient.setQueryData(['events', 'metadata'], [mockMappedColumn]);
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    expect(result.current.data).toEqual([mockMappedColumn]);
  });

  // staleTime Tests
  it('Should set staleTime to Infinity', async () => {
    renderHook(() => useEventMetadata(), { wrapper });
    const query = queryClient.getQueryCache().find({ queryKey: ['events', 'metadata'] });
    expect((query?.options as any)?.staleTime).toBe(Infinity);
  });

  it('Should not refetch on component remount', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, unmount } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    unmount();
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should not refetch on rerender', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should not refetch on window focus', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    window.dispatchEvent(new Event('focus'));
    await new Promise(r => setTimeout(r, 100));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should not refetch after tab switch', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(r => setTimeout(r, 100));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should not refetch after route change', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise(r => setTimeout(r, 100));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should remain fresh indefinitely', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await new Promise(r => setTimeout(r, 1000));
    expect(result.current.isStale).toBe(false);
  });

  it('Should continue using cache', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should avoid background refetch', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await new Promise(r => setTimeout(r, 500));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should prevent unnecessary network requests', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    rerender();
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  // Query Key Tests
  it('Should use query key ["events", "metadata"]', async () => {
    renderHook(() => useEventMetadata(), { wrapper });
    const query = queryClient.getQueryCache().find({ queryKey: ['events', 'metadata'] });
    expect(query?.queryKey).toEqual(['events', 'metadata']);
  });

  it('Should maintain stable query key', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query1 = queryClient.getQueryCache().find({ queryKey: ['events', 'metadata'] });
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query2 = queryClient.getQueryCache().find({ queryKey: ['events', 'metadata'] });
    expect(query1?.queryKey).toEqual(query2?.queryKey);
  });

  it('Should not generate dynamic query keys', async () => {
    renderHook(() => useEventMetadata(), { wrapper });
    const query = queryClient.getQueryCache().find({ queryKey: ['events', 'metadata'] });
    expect(query?.queryKey).toEqual(['events', 'metadata']);
  });

  it('Should reuse same cache entry', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result1.current.data).toBe(result2.current.data);
  });

  it('Should isolate cache from other hooks', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'list'])).toBeUndefined();
  });

  it('Should separate cache from events query', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'metadata'])).toBeDefined();
    expect(queryClient.getQueryData(['events', 'list'])).toBeUndefined();
  });

  it('Should separate cache from compound configs query', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'metadata'])).toBeDefined();
    expect(queryClient.getQueryData(['events', 'compound-configs'])).toBeUndefined();
  });

  it('Should separate cache from compound instances query', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(['events', 'metadata'])).toBeDefined();
    expect(queryClient.getQueryData(['events', 'compound-instances'])).toBeUndefined();
  });

  it('Should preserve cache identity', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = queryClient.getQueryCache().find({ queryKey: ['events', 'metadata'] });
    expect(query?.queryKey).toEqual(['events', 'metadata']);
  });

  it('Should support multiple hook consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  // Data Integrity Tests
  it('Should preserve column count', async () => {
    const rawColumns = [mockRawColumn, { ...mockRawColumn, field: 'field2' }, { ...mockRawColumn, field: 'field3' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });

  it('Should preserve metadata names', async () => {
    const rawColumns = [{ ...mockRawColumn, field: 'custom_field' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('custom_field');
  });

  it('Should preserve metadata types', async () => {
    const rawColumns = [{ ...mockRawColumn, type: 'number' as const }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, type: raw.type }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].type).toBe('number');
  });

  it('Should preserve metadata IDs', async () => {
    const rawColumns = [{ ...mockRawColumn, field: 'unique_id' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('unique_id');
  });

  it('Should preserve optional fields', async () => {
    const rawColumns = [{ ...mockRawColumn, unique_values: undefined }] as unknown as MetadataColumnRaw[];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, uniqueValues: raw.unique_values ?? [] }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].uniqueValues).toEqual([]);
  });

  it('Should preserve nested values', async () => {
    const rawColumns = [{ ...mockRawColumn, unique_values: ['a', 'b', 'c'] }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].uniqueValues).toEqual(['a', 'b', 'c']);
  });

  it('Should preserve field order', async () => {
    const rawColumns = [
      { ...mockRawColumn, field: 'first' },
      { ...mockRawColumn, field: 'second' },
      { ...mockRawColumn, field: 'third' },
    ];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('first');
    expect(result.current.data?.[1].field).toBe('second');
    expect(result.current.data?.[2].field).toBe('third');
  });

  it('Should preserve unique records', async () => {
    const rawColumns = [mockRawColumn, { ...mockRawColumn, field: 'field2' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).not.toBe(result.current.data?.[1].field);
  });

  it('Should preserve transformed values', async () => {
    const customMapped = { field: 'transformed', label: 'Transformed', type: 'number' as const, uniqueValues: [1, 2, 3] };
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(customMapped);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([customMapped]);
  });

  it('Should maintain response consistency', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(firstData);
  });

  // Edge Cases
  it('Should handle columns array with one item', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('Should handle columns array with 100 items', async () => {
    const rawColumns = Array.from({ length: 100 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(100);
  });

  it('Should handle columns array with 1000 items', async () => {
    const rawColumns = Array.from({ length: 1000 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1000);
  });

  it('Should handle duplicate columns', async () => {
    const rawColumns = [mockRawColumn, mockRawColumn];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('Should handle duplicate IDs', async () => {
    const rawColumns = [{ ...mockRawColumn, field: 'same' }, { ...mockRawColumn, field: 'same' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('Should handle duplicate names', async () => {
    const rawColumns = [{ ...mockRawColumn, label: 'Same' }, { ...mockRawColumn, label: 'Same' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, label: raw.label }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it('Should handle null values inside column objects', async () => {
    const rawColumns = [{ ...mockRawColumn, unique_values: null }] as unknown as MetadataColumnRaw[];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('Should handle undefined values inside column objects', async () => {
    const rawColumns = [{ ...mockRawColumn, unique_values: undefined }] as unknown as MetadataColumnRaw[];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('Should handle empty object columns', async () => {
    const rawColumns = [{ field: '', label: '', type: 'string' as const, filterable: false, unique_values: [] }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('Should handle columns with missing fields', async () => {
    const rawColumns = [{ field: 'test', label: 'Test', type: 'string' as const, filterable: true, unique_values: [] }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  // Invalid Response Tests
  it('Should handle missing columns property', async () => {
    mockFetchEventMetadata.mockResolvedValue({} as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle columns as null', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: null } as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle columns as undefined', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: undefined } as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle columns as string', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: 'invalid' as any });
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle columns as object', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: { invalid: 'data' } as any });
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle columns as number', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: 123 as any });
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle malformed response body', async () => {
    mockFetchEventMetadata.mockResolvedValue(null as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle unexpected response shape', async () => {
    mockFetchEventMetadata.mockResolvedValue({ unexpected: 'data' } as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle nested invalid structures', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [{ invalid: 'data' }] as any });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('Should handle mixed valid and invalid column objects', async () => {
    const rawColumns = [mockRawColumn, { invalid: 'data' } as any];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  // Performance Tests
  it('Should process 100 columns efficiently', async () => {
    const rawColumns = Array.from({ length: 100 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(100);
  });

  it('Should process 500 columns efficiently', async () => {
    const rawColumns = Array.from({ length: 500 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(500);
  });

  it('Should process 1000 columns efficiently', async () => {
    const rawColumns = Array.from({ length: 1000 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1000);
  });

  it('Should handle large mapper output', async () => {
    const rawColumns = Array.from({ length: 1000 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1000);
  });

  it('Should avoid excessive rerenders', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    rerender();
    rerender();
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it('Should maintain stable performance', async () => {
    const rawColumns = Array.from({ length: 500 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(500);
  });

  it('Should reuse cached results efficiently', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should handle repeated hook usage', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should maintain memory stability', async () => {
    const rawColumns = Array.from({ length: 1000 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1000);
  });

  it('Should process large datasets correctly', async () => {
    const rawColumns = Array.from({ length: 10000 }, (_, i) => ({ ...mockRawColumn, field: `field${i}` }));
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(10000);
  });

  // Multiple Consumer Tests
  it('Should share cached data between two components', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result1.current.data).toBe(result2.current.data);
  });

  it('Should share cached data between three components', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(result1.current.data).toBe(result2.current.data);
    expect(result2.current.data).toBe(result3.current.data);
  });

  it('Should perform one request for multiple consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should synchronize data across consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result1.current.data).toEqual(result2.current.data);
  });

  it('Should preserve cache when one consumer unmounts', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1, unmount } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    unmount();
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result2.current.data).toBeDefined();
  });

  it('Should preserve cache when all consumers rerender', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1, rerender: rerender1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2, rerender: rerender2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    rerender1();
    rerender2();
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should keep data consistent across consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(result1.current.data).toEqual(result2.current.data);
  });

  it('Should prevent duplicate requests from consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(mockFetchEventMetadata).toHaveBeenCalledTimes(1);
  });

  it('Should support concurrent consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(result1.current.data).toBe(result2.current.data);
    expect(result2.current.data).toBe(result3.current.data);
  });

  it('Should return same cached data to all consumers', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result: result1 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result2 } = renderHook(() => useEventMetadata(), { wrapper });
    const { result: result3 } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    await waitFor(() => expect(result3.current.isSuccess).toBe(true));
    expect(result1.current.data).toBe(result2.current.data);
    expect(result2.current.data).toBe(result3.current.data);
  });

  // Additional Edge Cases
  it('Should handle mapper returning empty object', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue({} as EventMetadataColumn);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('Should handle mapper returning null', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(null as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([null]);
  });

  it('Should handle mapper returning undefined', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(undefined as any);
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([undefined]);
  });

  it('Should handle special characters in metadata names', async () => {
    const rawColumns = [{ ...mockRawColumn, field: 'field@#$%' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('field@#$%');
  });

  it('Should handle Unicode metadata names', async () => {
    const rawColumns = [{ ...mockRawColumn, field: '字段名' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('字段名');
  });

  it('Should handle emoji metadata names', async () => {
    const rawColumns = [{ ...mockRawColumn, field: 'emoji😀' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('emoji😀');
  });

  it('Should handle long metadata names', async () => {
    const longName = 'a'.repeat(1000);
    const rawColumns = [{ ...mockRawColumn, field: longName }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe(longName);
  });

  it('Should handle HTML strings in metadata names', async () => {
    const rawColumns = [{ ...mockRawColumn, field: '<div>field</div>' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('<div>field</div>');
  });

  it('Should handle script-like strings in metadata names', async () => {
    const rawColumns = [{ ...mockRawColumn, field: '<script>alert(1)</script>' }];
    mockFetchEventMetadata.mockResolvedValue({ columns: rawColumns });
    mockMapMetadataColumnFromApi.mockImplementation((raw) => ({ ...mockMappedColumn, field: raw.field }));
    const { result } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].field).toBe('<script>alert(1)</script>');
  });

  it('Should remain stable during long-running session', async () => {
    mockFetchEventMetadata.mockResolvedValue({ columns: [mockRawColumn] });
    mockMapMetadataColumnFromApi.mockReturnValue(mockMappedColumn);
    const { result, rerender } = renderHook(() => useEventMetadata(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data;
    for (let i = 0; i < 10; i++) {
      rerender();
      await new Promise(r => setTimeout(r, 10));
    }
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
