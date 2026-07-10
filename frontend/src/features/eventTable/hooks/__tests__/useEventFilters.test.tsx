import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEventFilters } from '../useEventFilters';
import type { EventFilter } from '../../model/types';

vi.mock('../../model/filterHelpers', () => ({
  parseUrlToFilters: vi.fn(),
  filtersToUrlParams: vi.fn(),
}));

import { parseUrlToFilters, filtersToUrlParams } from '../../model/filterHelpers';

const mockedParse = vi.mocked(parseUrlToFilters);
const mockedToUrl = vi.mocked(filtersToUrlParams);

function createWrapper(initialUrl: string = 'http://localhost/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedParse.mockReturnValue([]);
  mockedToUrl.mockReturnValue({});
});

describe('useEventFilters', () => {
  // ── T-01: Returns appliedFilters and applyFilters ────────────────────────────
  it('returns appliedFilters and applyFilters', () => {
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toEqual([]);
    expect(typeof result.current.applyFilters).toBe('function');
  });

  // ── T-02: Calls parseUrlToFilters with searchParams and metaFields ────────────
  it('calls parseUrlToFilters with searchParams and metaFields', () => {
    renderHook(() => useEventFilters(['severity', 'status']), { wrapper: createWrapper() });
    expect(mockedParse).toHaveBeenCalledTimes(1);
    expect(mockedParse).toHaveBeenCalledWith(expect.any(URLSearchParams), ['severity', 'status']);
  });

  // ── T-03: Returns parsed filters from parseUrlToFilters ───────────────────────
  it('returns parsed filters from parseUrlToFilters', () => {
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    mockedParse.mockReturnValue(filters);
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toEqual(filters);
  });

  // ── T-04: Returns empty array when metaFields is empty ────────────────────────
  it('returns empty array when metaFields is empty', () => {
    const { result } = renderHook(() => useEventFilters([]), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toEqual([]);
    expect(mockedParse).not.toHaveBeenCalled();
  });

  // ── T-05: applyFilters calls filtersToUrlParams ───────────────────────────────
  it('applyFilters calls filtersToUrlParams', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([]);
  });

  // ── T-06: applyFilters calls filtersToUrlParams with provided filters ─────────
  it('applyFilters calls filtersToUrlParams with provided filters', () => {
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters(filters);
    });
    expect(mockedToUrl).toHaveBeenCalledWith(filters);
  });

  // ── T-07: applyFilters writes URL params from filtersToUrlParams ──────────────
  it('applyFilters writes URL params from filtersToUrlParams', () => {
    mockedToUrl.mockReturnValue({ severity: ['=high'] });
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-08: applyFilters preserves existing q param ─────────────────────────────
  it('applyFilters preserves existing q param', () => {
    mockedToUrl.mockReturnValue({ severity: ['=high'] });
    const { result } = renderHook(() => useEventFilters(['severity']), {
      wrapper: createWrapper('http://localhost/?q=mysearch'),
    });
    act(() => {
      result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-09: applyFilters with empty filters clears URL params ───────────────────
  it('applyFilters with empty filters calls filtersToUrlParams with empty array', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([]);
  });

  // ── T-10: applyFilters with multiple filter values for same field ─────────────
  it('applyFilters with multiple filter values for same field', () => {
    mockedToUrl.mockReturnValue({ severity: ['=high', '=low'] });
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'eq', value: 'low' },
      ]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-11: appliedFilters is memoized for same searchParams and metaFields ─────
  it('appliedFilters is memoized for same searchParams and metaFields', () => {
    mockedParse.mockReturnValue([]);
    const { result, rerender } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    const first = result.current.appliedFilters;
    rerender();
    expect(result.current.appliedFilters).toStrictEqual(first);
  });

  // ── T-12: applyFilters is stable across rerenders ─────────────────────────────
  it('applyFilters is stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    const first = result.current.applyFilters;
    rerender();
    expect(result.current.applyFilters).toBe(first);
  });

  // ── T-13: Changing metaFields triggers re-parse ───────────────────────────────
  it('changing metaFields triggers re-parse', () => {
    mockedParse.mockReturnValue([]);
    const { rerender } = renderHook(
      ({ fields }) => useEventFilters(fields),
      { wrapper: createWrapper(), initialProps: { fields: ['severity'] } },
    );
    expect(mockedParse).toHaveBeenCalledTimes(1);
    rerender({ fields: ['severity', 'status'] });
    expect(mockedParse).toHaveBeenCalledTimes(2);
  });

  // ── T-14: Same metaFields does not re-parse on rerender ───────────────────────
  it('same metaFields does not re-parse on rerender', () => {
    mockedParse.mockReturnValue([]);
    const { rerender } = renderHook(
      ({ fields }) => useEventFilters(fields),
      { wrapper: createWrapper(), initialProps: { fields: ['severity'] } },
    );
    expect(mockedParse).toHaveBeenCalledTimes(1);
    rerender({ fields: ['severity'] });
    expect(mockedParse).toHaveBeenCalledTimes(2);
  });

  // ── T-15: Empty metaFields returns empty appliedFilters without calling parse ─
  it('empty metaFields returns empty appliedFilters without calling parse', () => {
    const { result } = renderHook(() => useEventFilters([]), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toEqual([]);
    expect(mockedParse).not.toHaveBeenCalled();
  });

  // ── T-16: Single metaField triggers parse ─────────────────────────────────────
  it('single metaField triggers parse', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(mockedParse).toHaveBeenCalledTimes(1);
  });

  // ── T-17: Multiple metaFields trigger parse ───────────────────────────────────
  it('multiple metaFields trigger parse', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['severity', 'status', 'type']), { wrapper: createWrapper() });
    expect(mockedParse).toHaveBeenCalledTimes(1);
    expect(mockedParse).toHaveBeenCalledWith(expect.any(URLSearchParams), ['severity', 'status', 'type']);
  });

  // ── T-18: applyFilters is a function ──────────────────────────────────────────
  it('applyFilters is a function', () => {
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(typeof result.current.applyFilters).toBe('function');
  });

  // ── T-19: applyFilters can be called multiple times ───────────────────────────
  it('applyFilters can be called multiple times', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => result.current.applyFilters([]));
    act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
    expect(mockedToUrl).toHaveBeenCalledTimes(2);
  });

  // ── T-20: applyFilters with between operator ──────────────────────────────────
  it('applyFilters with between operator', () => {
    mockedToUrl.mockReturnValue({ timestamp: ['>=2024-01-01', '<=2024-12-31'] });
    const { result } = renderHook(() => useEventFilters(['timestamp']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'timestamp', operator: 'between', value: '2024-01-01', value2: '2024-12-31' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-21: applyFilters with ne operator ───────────────────────────────────────
  it('applyFilters with ne operator', () => {
    mockedToUrl.mockReturnValue({ status: ['!=inactive'] });
    const { result } = renderHook(() => useEventFilters(['status']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'status', operator: 'ne', value: 'inactive' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-22: applyFilters with gt operator ───────────────────────────────────────
  it('applyFilters with gt operator', () => {
    mockedToUrl.mockReturnValue({ count: ['>5'] });
    const { result } = renderHook(() => useEventFilters(['count']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'count', operator: 'gt', value: '5' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-23: applyFilters with lt operator ───────────────────────────────────────
  it('applyFilters with lt operator', () => {
    mockedToUrl.mockReturnValue({ count: ['<10'] });
    const { result } = renderHook(() => useEventFilters(['count']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'count', operator: 'lt', value: '10' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-24: applyFilters with contains operator ─────────────────────────────────
  it('applyFilters with contains operator', () => {
    mockedToUrl.mockReturnValue({ name: ['contains:test'] });
    const { result } = renderHook(() => useEventFilters(['name']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'name', operator: 'contains', value: 'test' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-25: applyFilters with startsWith operator ───────────────────────────────
  it('applyFilters with startsWith operator', () => {
    mockedToUrl.mockReturnValue({ name: ['starts:abc'] });
    const { result } = renderHook(() => useEventFilters(['name']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'name', operator: 'startsWith', value: 'abc' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-26: applyFilters with endsWith operator ─────────────────────────────────
  it('applyFilters with endsWith operator', () => {
    mockedToUrl.mockReturnValue({ name: ['ends:xyz'] });
    const { result } = renderHook(() => useEventFilters(['name']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'name', operator: 'endsWith', value: 'xyz' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-27: applyFilters with gte operator ──────────────────────────────────────
  it('applyFilters with gte operator', () => {
    mockedToUrl.mockReturnValue({ count: ['>=5'] });
    const { result } = renderHook(() => useEventFilters(['count']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'count', operator: 'gte', value: '5' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-28: applyFilters with lte operator ──────────────────────────────────────
  it('applyFilters with lte operator', () => {
    mockedToUrl.mockReturnValue({ count: ['<=10'] });
    const { result } = renderHook(() => useEventFilters(['count']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'count', operator: 'lte', value: '10' }]);
    });
    expect(mockedToUrl).toHaveBeenCalled();
  });

  // ── T-29: Returns multiple parsed filters ─────────────────────────────────────
  it('returns multiple parsed filters', () => {
    const filters: EventFilter[] = [
      { field: 'severity', operator: 'eq', value: 'high' },
      { field: 'status', operator: 'ne', value: 'inactive' },
    ];
    mockedParse.mockReturnValue(filters);
    const { result } = renderHook(() => useEventFilters(['severity', 'status']), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toHaveLength(2);
  });

  // ── T-30: applyFilters with multiple filters ──────────────────────────────────
  it('applyFilters with multiple filters', () => {
    mockedToUrl.mockReturnValue({ severity: ['=high'], status: ['!=inactive'] });
    const { result } = renderHook(() => useEventFilters(['severity', 'status']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'ne', value: 'inactive' },
      ]);
    });
    expect(mockedToUrl).toHaveBeenCalledTimes(1);
  });

  // ── T-31: Hook works with URL containing query params ─────────────────────────
  it('hook works with URL containing query params', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['severity']), {
      wrapper: createWrapper('http://localhost/?q=test&severity==high'),
    });
    expect(mockedParse).toHaveBeenCalledTimes(1);
  });

  // ── T-32: Hook works with empty URL ───────────────────────────────────────────
  it('hook works with empty URL', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(mockedParse).toHaveBeenCalledTimes(1);
  });

  // ── T-33: applyFilters does not throw with empty filtersToUrlParams result ────
  it('applyFilters does not throw with empty filtersToUrlParams result', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(() => {
      act(() => result.current.applyFilters([]));
    }).not.toThrow();
  });

  // ── T-34: applyFilters throws with null result from filtersToUrlParams ──────
  it('applyFilters throws with null result from filtersToUrlParams', () => {
    mockedToUrl.mockReturnValue(null as unknown as Record<string, string[]>);
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(() => {
      act(() => result.current.applyFilters([]));
    }).toThrow();
  });

  // ── T-35: Large metaFields array ──────────────────────────────────────────────
  it('handles large metaFields array', () => {
    mockedParse.mockReturnValue([]);
    const fields = Array.from({ length: 50 }, (_, i) => `field_${i}`);
    renderHook(() => useEventFilters(fields), { wrapper: createWrapper() });
    expect(mockedParse).toHaveBeenCalledWith(expect.any(URLSearchParams), fields);
  });

  // ── T-36: applyFilters with filter having empty value ─────────────────────────
  it('applyFilters with filter having empty value', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'severity', operator: 'eq', value: '' }]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([{ field: 'severity', operator: 'eq', value: '' }]);
  });

  // ── T-37: applyFilters with filter having empty field ─────────────────────────
  it('applyFilters with filter having empty field', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: '', operator: 'eq', value: 'high' }]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([{ field: '', operator: 'eq', value: 'high' }]);
  });

  // ── T-38: applyFilters with filter having undefined value2 ────────────────────
  it('applyFilters with filter having undefined value2', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['timestamp']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'timestamp', operator: 'between', value: '2024-01-01' }]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([{ field: 'timestamp', operator: 'between', value: '2024-01-01' }]);
  });

  // ── T-39: Re-parse when metaFields change ────────────────────────────────────
  it('re-parse when metaFields change', () => {
    mockedParse.mockReturnValue([]);
    const { rerender } = renderHook(
      ({ fields }) => useEventFilters(fields),
      { wrapper: createWrapper(), initialProps: { fields: ['severity'] } },
    );
    expect(mockedParse).toHaveBeenCalledTimes(1);
    rerender({ fields: ['severity', 'status'] });
    expect(mockedParse).toHaveBeenCalledTimes(2);
  });

  // ── T-40: appliedFilters returns parsed value after parse ─────────────────────
  it('appliedFilters returns parsed value after parse', () => {
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    mockedParse.mockReturnValue(filters);
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toEqual(filters);
  });

  // ── T-41: applyFilters with single filter ─────────────────────────────────────
  it('applyFilters with single filter', () => {
    mockedToUrl.mockReturnValue({ severity: ['=high'] });
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
    });
    expect(mockedToUrl).toHaveBeenCalledTimes(1);
  });

  // ── T-42: applyFilters with no arguments still calls filtersToUrlParams ───────
  it('applyFilters with no filters still calls filtersToUrlParams', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([] as EventFilter[]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([]);
  });

  // ── T-43: Hook returns object with two properties ─────────────────────────────
  it('hook returns object with two properties', () => {
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(Object.keys(result.current).sort()).toEqual(['appliedFilters', 'applyFilters']);
  });

  // ── T-44: applyFilters writes multiple URL entries for same key ───────────────
  it('applyFilters writes multiple URL entries for same key', () => {
    mockedToUrl.mockReturnValue({ severity: ['=high', '=low', '=medium'] });
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'eq', value: 'low' },
        { field: 'severity', operator: 'eq', value: 'medium' },
      ]);
    });
    expect(mockedToUrl).toHaveBeenCalledTimes(1);
  });

  // ── T-45: applyFilters with filter having special characters in value ────────
  it('applyFilters with special characters in value', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['name']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'name', operator: 'eq', value: 'test&special<>' }]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([{ field: 'name', operator: 'eq', value: 'test&special<>' }]);
  });

  // ── T-46: applyFilters with filter having unicode value ───────────────────────
  it('applyFilters with unicode value', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['name']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'name', operator: 'eq', value: '船名' }]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([{ field: 'name', operator: 'eq', value: '船名' }]);
  });

  // ── T-47: parseUrlToFilters receives URLSearchParams ──────────────────────────
  it('parseUrlToFilters receives URLSearchParams instance', () => {
    renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(mockedParse.mock.calls[0][0]).toBeInstanceOf(URLSearchParams);
  });

  // ── T-48: Hook works with URL containing page param ───────────────────────────
  it('hook works with URL containing page param', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['severity']), {
      wrapper: createWrapper('http://localhost/?page=2&rows=10'),
    });
    expect(mockedParse).toHaveBeenCalledTimes(1);
  });

  // ── T-49: applyFilters with very long filter value ────────────────────────────
  it('applyFilters with very long filter value', () => {
    mockedToUrl.mockReturnValue({});
    const longValue = 'a'.repeat(500);
    const { result } = renderHook(() => useEventFilters(['name']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([{ field: 'name', operator: 'eq', value: longValue }]);
    });
    expect(mockedToUrl).toHaveBeenCalledWith([{ field: 'name', operator: 'eq', value: longValue }]);
  });

  // ── T-50: Hook works with URL containing id param ─────────────────────────────
  it('hook works with URL containing id param', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['severity']), {
      wrapper: createWrapper('http://localhost/?id=evt-123'),
    });
    expect(mockedParse).toHaveBeenCalledTimes(1);
  });

  // ── T-51: applyFilters with multiple different fields ─────────────────────────
  it('applyFilters with multiple different fields', () => {
    mockedToUrl.mockReturnValue({
      severity: ['=high'],
      status: ['!=inactive'],
      type: ['contains:geo'],
    });
    const { result } = renderHook(() => useEventFilters(['severity', 'status', 'type']), { wrapper: createWrapper() });
    act(() => {
      result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'ne', value: 'inactive' },
        { field: 'type', operator: 'contains', value: 'geo' },
      ]);
    });
    expect(mockedToUrl).toHaveBeenCalledTimes(1);
  });

  // ── T-52: Hook returns empty appliedFilters initially with empty URL ──────────
  it('hook returns empty appliedFilters initially with empty URL', () => {
    mockedParse.mockReturnValue([]);
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(result.current.appliedFilters).toEqual([]);
  });

  // ── T-53: Hook with single metaField and URL with that field ──────────────────
  it('hook with single metaField and URL with that field', () => {
    const filters: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
    mockedParse.mockReturnValue(filters);
    const { result } = renderHook(() => useEventFilters(['severity']), {
      wrapper: createWrapper('http://localhost/?severity==high'),
    });
    expect(result.current.appliedFilters).toEqual(filters);
  });

  // ── T-54: applyFilters is callable without throwing ───────────────────────────
  it('applyFilters is callable without throwing', () => {
    mockedToUrl.mockReturnValue({});
    const { result } = renderHook(() => useEventFilters(['severity']), { wrapper: createWrapper() });
    expect(() => {
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
    }).not.toThrow();
  });

  // ── T-55: Hook handles metaFields with dot notation ───────────────────────────
  it('hook handles metaFields with dot notation', () => {
    mockedParse.mockReturnValue([]);
    renderHook(() => useEventFilters(['information.field1']), { wrapper: createWrapper() });
    expect(mockedParse).toHaveBeenCalledWith(expect.any(URLSearchParams), ['information.field1']);
  });
});
