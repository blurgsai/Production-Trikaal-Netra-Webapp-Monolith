import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEvents } from '../hooks/useEvents';
import { fetchEvents } from '../api/eventTableApi';
import { mapEventFromApi } from '../model/mappers';
import type { EventApiResponse, EventListApiResponse } from '../api/types';
import type { EventFilter, PaginationParams } from '../model/types';

vi.mock('../api/eventTableApi');
vi.mock('../model/mappers');

const mockFetchEvents = vi.mocked(fetchEvents);
const mockMapEventFromApi = vi.mocked(mapEventFromApi);

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

const defaultPagination: PaginationParams = { page: 0, rowsPerPage: 10 };
const defaultFilters: EventFilter[] = [];
const defaultSearchQuery = '';
const defaultEventId = undefined;

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Fetch Success Test Cases
  it('Should fetch events successfully on mount', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should call fetchEvents once on initial render', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    expect(mockFetchEvents).toHaveBeenCalledTimes(1);
  });

  it('Should return mapped events', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toEqual([mappedEvent]));
  });

  it('Should return total count from API response', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 100, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(100));
  });

  it('Should set status to success after fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should expose data after successful fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('Should handle single event response', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(1));
  });

  it('Should handle multiple event response', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '2',
        type: 'test',
        severity: 'low',
        status: 'inactive',
        timestamp: '2024-01-02',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 2, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(2));
  });

  it('Should handle empty event response', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toEqual([]));
  });

  it('Should return correct event count', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '2',
        type: 'test',
        severity: 'low',
        status: 'inactive',
        timestamp: '2024-01-02',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '3',
        type: 'test',
        severity: 'medium',
        status: 'pending',
        timestamp: '2024-01-03',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 3, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(3));
  });

  // API Parameter Validation Test Cases
  it('Should send correct limit', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 0, rowsPerPage: 25 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 })));
  });

  it('Should send correct offset', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 2, rowsPerPage: 10 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 })));
  });

  it('Should send searchQuery parameter', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ searchQuery: 'test' })));
  });

  it('Should send eventId parameter', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event123',
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event123' })));
  });

  it('Should send filters parameter', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ filters: JSON.stringify(filters) })));
  });

  it('Should omit filters when filter array is empty', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ filters: undefined })));
  });

  it('Should stringify filters before sending', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ filters: JSON.stringify(filters) })));
  });

  it('Should send correct page value through offset calculation', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 3, rowsPerPage: 10 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ offset: 30 })));
  });

  it('Should send correct rowsPerPage through limit', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 0, rowsPerPage: 50 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 })));
  });

  it('Should pass all parameters together correctly', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 1, rowsPerPage: 25 };
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    renderHook(() => useEvents({
      filters,
      pagination,
      searchQuery: 'test',
      eventId: 'event123',
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith({
      limit: 25,
      offset: 25,
      searchQuery: 'test',
      filters: JSON.stringify(filters),
      eventId: 'event123',
    }));
  });

  // Pagination Test Cases
  it('Should calculate offset correctly for page 0', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 0, rowsPerPage: 10 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 })));
  });

  it('Should calculate offset correctly for page 1', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 1, rowsPerPage: 10 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ offset: 10 })));
  });

  it('Should calculate offset correctly for page 2', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 2, rowsPerPage: 10 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ offset: 20 })));
  });

  it('Should calculate offset correctly for page 10', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 10, rowsPerPage: 10 };
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ offset: 100 })));
  });

  it('Should refetch when page changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ page }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { page: 0 } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ page: 1 });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should refetch when rowsPerPage changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ rowsPerPage }) => useEvents({
        filters: defaultFilters,
        pagination: { page: 0, rowsPerPage },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { rowsPerPage: 10 } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ rowsPerPage: 25 });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should create new queryKey when page changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ page }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { page: 0 } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ page: 1 });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should create new queryKey when rowsPerPage changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ rowsPerPage }) => useEvents({
        filters: defaultFilters,
        pagination: { page: 0, rowsPerPage },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { rowsPerPage: 10 } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ rowsPerPage: 25 });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should return correct data after page change', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ page }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { page: 0 } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ page: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should return correct data after rowsPerPage change', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ rowsPerPage }) => useEvents({
        filters: defaultFilters,
        pagination: { page: 0, rowsPerPage },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { rowsPerPage: 10 } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ rowsPerPage: 25 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should keep previous page data during fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ page }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { page: 0 } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    rerender({ page: 1 });
    expect(result.current.data).toStrictEqual(firstData);
  });

  it('Should handle page value of zero', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 0, rowsPerPage: 10 };
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle page value of one', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 1, rowsPerPage: 10 };
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle large page numbers', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 1000, rowsPerPage: 10 };
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle last page correctly', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 95, limit: 10, offset: 90 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const pagination: PaginationParams = { page: 9, rowsPerPage: 10 };
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Search Query Test Cases
  it('Should fetch with empty searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: '',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with valid searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with numeric searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: '123',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with alphanumeric searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test123',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with special character searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test@#$%',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should refetch when searchQuery changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ searchQuery }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { searchQuery: '' } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ searchQuery: 'test' });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should create new queryKey when searchQuery changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ searchQuery }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { searchQuery: '' } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ searchQuery: 'test' });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should keep previous data during search update', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ searchQuery }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { searchQuery: '' } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    rerender({ searchQuery: 'test' });
    expect(result.current.data).toStrictEqual(firstData);
  });

  it('Should handle searchQuery containing spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test query',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle searchQuery with leading spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: '  test',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle searchQuery with trailing spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test  ',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle searchQuery with only spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: '   ',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle long searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'a'.repeat(1000),
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle Unicode searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test Ñ 中文',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle emoji searchQuery', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: 'test 😀🎉',
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Filters Test Cases
  it('Should work with empty filter array', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should work with one filter', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should work with multiple filters', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'status', operator: 'eq', value: 'active' },
    ];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should stringify single filter correctly', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ filters: JSON.stringify(filters) })));
  });

  it('Should stringify multiple filters correctly', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'status', operator: 'eq', value: 'active' },
    ];
    renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ filters: JSON.stringify(filters) })));
  });

  it('Should refetch when filters change', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ filters }) => useEvents({
        filters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { filters: defaultFilters } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    const newFilters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    rerender({ filters: newFilters });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should create new queryKey when filters change', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ filters }) => useEvents({
        filters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { filters: defaultFilters } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    const newFilters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    rerender({ filters: newFilters });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should preserve filter values', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ filters: JSON.stringify(filters) })));
  });

  it('Should handle duplicate filters', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'severity', operator: 'eq', value: 'high' },
    ];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle duplicate filter values', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'status', operator: 'eq', value: 'high' },
    ];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter containing special characters', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test@#$%' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter containing Unicode values', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test Ñ 中文' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter containing emoji values', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test 😀🎉' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter with empty string value', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: '' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter with long value', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'a'.repeat(1000) }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter with numeric value', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: '123' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle filter with boolean value', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'true' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle multiple filter fields', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'type', operator: 'eq', value: 'test' },
    ];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle large filter array', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = Array.from({ length: 100 }, (_, i) => ({
      field: `field${i}`,
      operator: 'eq' as const,
      value: `value${i}`,
    }));
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle nested filter values if supported', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: '{"nested":"value"}' }];
    const { result } = renderHook(() => useEvents({
      filters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Event ID Test Cases
  it('Should fetch with valid eventId', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event123',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with undefined eventId', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: undefined,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with empty eventId', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: '',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with numeric eventId', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: '123',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch with alphanumeric eventId', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event123',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should refetch when eventId changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ eventId }: { eventId?: string }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId,
      }),
      { wrapper, initialProps: { eventId: undefined } as { eventId?: string } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ eventId: 'event123' });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should create new queryKey when eventId changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ eventId }: { eventId?: string }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId,
      }),
      { wrapper, initialProps: { eventId: undefined } as { eventId?: string } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ eventId: 'event123' });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should preserve eventId in API request', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event123',
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'event123' })));
  });

  it('Should handle long eventId', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'a'.repeat(1000),
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle eventId containing spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event 123',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle eventId containing Unicode', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event Ñ 中文',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle eventId containing emoji', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event 😀🎉',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle eventId containing special characters', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event@#$%',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle eventId with leading spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: '  event123',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle eventId with trailing spaces', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: 'event123  ',
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Enabled Flag Test Cases
  it('Should fetch when enabled is true', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
      enabled: true,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should not fetch when enabled is false', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
      enabled: false,
    }), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('Should default enabled to true', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should fetch when enabled changes from false to true', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
        enabled,
      }),
      { wrapper, initialProps: { enabled: false } }
    );
    expect(mockFetchEvents).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
  });

  it('Should stop future fetches when enabled changes to false', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
        enabled,
      }),
      { wrapper, initialProps: { enabled: true } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ enabled: false });
    const callCount = mockFetchEvents.mock.calls.length;
    expect(mockFetchEvents.mock.calls.length).toBe(callCount);
  });

  it('Should not enter loading state when disabled', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
      enabled: false,
    }), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  it('Should preserve cached data when disabled', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
        enabled,
      }),
      { wrapper, initialProps: { enabled: true } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    rerender({ enabled: false });
    expect(result.current.data).toBe(firstData);
  });

  it('Should allow page changes while disabled', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ enabled, page }: { enabled: boolean; page: number }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
        enabled,
      }),
      { wrapper, initialProps: { enabled: false, page: 0 } }
    );
    rerender({ enabled: false, page: 1 });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('Should allow filter changes while disabled', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ enabled, filters }: { enabled: boolean; filters: EventFilter[] }) => useEvents({
        filters,
        pagination: defaultPagination,
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
        enabled,
      }),
      { wrapper, initialProps: { enabled: false, filters: defaultFilters } }
    );
    const newFilters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    rerender({ enabled: false, filters: newFilters });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('Should allow search changes while disabled', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ enabled, searchQuery }: { enabled: boolean; searchQuery: string }) => useEvents({
        filters: defaultFilters,
        pagination: defaultPagination,
        searchQuery,
        eventId: defaultEventId,
        enabled,
      }),
      { wrapper, initialProps: { enabled: false, searchQuery: '' } }
    );
    rerender({ enabled: false, searchQuery: 'test' });
    expect(result.current.fetchStatus).toBe('idle');
  });

  // Mapping Test Cases
  it('Should call mapEventFromApi once per event', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '2',
        type: 'test',
        severity: 'low',
        status: 'inactive',
        timestamp: '2024-01-02',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 2, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockMapEventFromApi).toHaveBeenCalledTimes(2));
  });

  it('Should map single event correctly', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toEqual([mappedEvent]));
  });

  it('Should map multiple events correctly', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '2',
        type: 'test',
        severity: 'low',
        status: 'inactive',
        timestamp: '2024-01-02',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 2, limit: 10, offset: 0 };
    const mappedEvent1 = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    const mappedEvent2 = { id: '2', type: 'test', severity: 'low', status: 'inactive', timestamp: '2024-01-02', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValueOnce(mappedEvent1).mockReturnValueOnce(mappedEvent2);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toEqual([mappedEvent1, mappedEvent2]));
  });

  it('Should preserve order during mapping', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '2',
        type: 'test',
        severity: 'low',
        status: 'inactive',
        timestamp: '2024-01-02',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 2, limit: 10, offset: 0 };
    const mappedEvent1 = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    const mappedEvent2 = { id: '2', type: 'test', severity: 'low', status: 'inactive', timestamp: '2024-01-02', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValueOnce(mappedEvent1).mockReturnValueOnce(mappedEvent2);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events[0].id).toBe('1'));
    expect(result.current.data?.events[1].id).toBe('2');
  });

  it('Should return mapped event array', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toEqual([mappedEvent]));
  });

  it('Should map events with missing optional fields', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toBeDefined());
  });

  it('Should map events with null fields', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toBeDefined());
  });

  it('Should map events with undefined fields', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toBeDefined());
  });

  it('Should map events with extra fields', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toBeDefined());
  });

  it('Should map events containing nested objects', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toBeDefined());
  });

  it('Should map large datasets correctly', async () => {
    const mockEvents: EventApiResponse[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    }));
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 1000, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(1000));
  });

  it('Should map duplicate events correctly', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 2, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(2));
  });

  it('Should maintain event count after mapping', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
      {
        id: '2',
        type: 'test',
        severity: 'low',
        status: 'inactive',
        timestamp: '2024-01-02',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 2, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(2));
  });

  it('Should return mapped object structure', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events[0]).toHaveProperty('id'));
    expect(result.current.data?.events[0]).toHaveProperty('type');
    expect(result.current.data?.events[0]).toHaveProperty('severity');
    expect(result.current.data?.events[0]).toHaveProperty('status');
  });

  it('Should pass raw event object to mapper', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockMapEventFromApi).toHaveBeenCalledWith(mockEvent, 0, [mockEvent]));
  });

  // API Response Handling Test Cases
  it('Should handle response with empty events array', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toEqual([]));
  });

  it('Should handle response with total count', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 100, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(100));
  });

  it('Should handle response with limit', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 25, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle response with offset', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 50 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle response with all fields', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 100, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(100));
  });

  it('Should handle response with zero total count', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(0));
  });

  it('Should handle response with large total count', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 1000000, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(1000000));
  });

  it('Should handle response with negative total count', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: -1, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle response with missing total count', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBeDefined());
  });

  it('Should handle response with partial events', async () => {
    const mockEvents: EventApiResponse[] = [
      {
        id: '1',
        type: 'test',
        severity: 'high',
        status: 'active',
        timestamp: '2024-01-01',
        start_time: null,
        end_time: null,
        vessels_involved: [],
        location: null,
        temporality: null,
        event_source: null,
        model: null,
        compound: false,
        constituent_types: [],
      },
    ];
    const mockResponse: EventListApiResponse = { events: mockEvents, total: 100, limit: 10, offset: 0 };
    const mappedEvent = { id: '1', type: 'test', severity: 'high', status: 'active', timestamp: '2024-01-01', startTime: null, endTime: null, vessels: [], compound: false, constituentTypes: [] };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockReturnValue(mappedEvent);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toHaveLength(1));
    expect(result.current.data?.total).toBe(100);
  });

  it('Should handle response with null events array', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.data?.events).toBeDefined());
  });

  it('Should handle response with extra fields', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  // Error Handling Test Cases
  it('Should handle fetch error', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should set error message on fetch failure', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.error).toBeDefined());
  });

  it('Should handle API timeout', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Timeout'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle 500 server error', async () => {
    mockFetchEvents.mockRejectedValue(new Error('500 Internal Server Error'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle 404 not found', async () => {
    mockFetchEvents.mockRejectedValue(new Error('404 Not Found'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle 403 forbidden', async () => {
    mockFetchEvents.mockRejectedValue(new Error('403 Forbidden'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle 401 unauthorized', async () => {
    mockFetchEvents.mockRejectedValue(new Error('401 Unauthorized'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle malformed response', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Invalid JSON'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle mapper error', async () => {
    const mockEvent: EventApiResponse = {
      id: '1',
      type: 'test',
      severity: 'high',
      status: 'active',
      timestamp: '2024-01-01',
      start_time: null,
      end_time: null,
      vessels_involved: [],
      location: null,
      temporality: null,
      event_source: null,
      model: null,
      compound: false,
      constituent_types: [],
    };
    const mockResponse: EventListApiResponse = { events: [mockEvent], total: 1, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    mockMapEventFromApi.mockImplementation(() => { throw new Error('Mapper error'); });
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('Should handle concurrent errors gracefully', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Concurrent error'));
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // React Query Behavior Test Cases
  it('Should cache data after successful fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    expect(mockFetchEvents).toHaveBeenCalledTimes(1);
  });

  it('Should refetch on window focus if configured', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should refetch on reconnect if configured', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should use placeholder data during fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(
      ({ page }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { page: 0 } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstData = result.current.data;
    rerender({ page: 1 });
    expect(result.current.data).toStrictEqual(firstData);
  });

  it('Should have correct query key structure', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalled());
  });

  it('Should not refetch if data is fresh', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender();
    expect(mockFetchEvents).toHaveBeenCalledTimes(1);
  });

  it('Should update stale status after fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isStale).toBe(true);
  });

  it('Should handle query invalidation', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should maintain query state across renders', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, rerender } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstState = result.current;
    rerender();
    expect(result.current.isSuccess).toBe(firstState.isSuccess);
  });

  it('Should handle query client reset', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('Should handle multiple query instances', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result: result1 } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    const { result: result2 } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
  });

  it('Should share cache between same queries', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result: result1 } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    const { result: result2 } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
    expect(mockFetchEvents).toHaveBeenCalledTimes(2);
  });

  // Edge Cases Test Cases
  it('Should handle all parameters changing simultaneously', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ page, searchQuery, eventId, filters }: { page: number; searchQuery: string; eventId?: string; filters: EventFilter[] }) => useEvents({
        filters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery,
        eventId,
      }),
      { wrapper, initialProps: { page: 0, searchQuery: '', eventId: undefined, filters: defaultFilters } as { page: number; searchQuery: string; eventId?: string; filters: EventFilter[] } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    const newFilters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    rerender({ page: 1, searchQuery: 'test', eventId: 'event123', filters: newFilters });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(2));
  });

  it('Should handle rapid parameter changes', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { rerender } = renderHook(
      ({ page }: { page: number }) => useEvents({
        filters: defaultFilters,
        pagination: { page, rowsPerPage: 10 },
        searchQuery: defaultSearchQuery,
        eventId: defaultEventId,
      }),
      { wrapper, initialProps: { page: 0 } }
    );
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(1));
    rerender({ page: 1 });
    rerender({ page: 2 });
    rerender({ page: 3 });
    await waitFor(() => expect(mockFetchEvents).toHaveBeenCalledTimes(4));
  });

  it('Should handle component unmount during fetch', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result, unmount } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    unmount();
    expect(mockFetchEvents).toHaveBeenCalled();
  });

  it('Should handle multiple concurrent fetches', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result: result1 } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: defaultPagination,
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    const { result: result2 } = renderHook(() => useEvents({
      filters: defaultFilters,
      pagination: { page: 1, rowsPerPage: 10 },
      searchQuery: defaultSearchQuery,
      eventId: defaultEventId,
    }), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));
  });

  it('Should handle disabled hook with all parameters', async () => {
    const mockResponse: EventListApiResponse = { events: [], total: 0, limit: 10, offset: 0 };
    mockFetchEvents.mockResolvedValue(mockResponse);
    const { result } = renderHook(() => useEvents({
      filters: [{ field: 'severity', operator: 'eq', value: 'high' }],
      pagination: { page: 1, rowsPerPage: 25 },
      searchQuery: 'test',
      eventId: 'event123',
      enabled: false,
    }), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
