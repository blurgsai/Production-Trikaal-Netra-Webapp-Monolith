import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEventFilters } from '../hooks/useEventFilters';
import { parseUrlToFilters, filtersToUrlParams } from '../model/filterHelpers';
import type { EventFilter } from '../model/types';

vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));
vi.mock('../model/filterHelpers');

const { useSearchParams } = await import('react-router-dom');
const mockUseSearchParams = vi.mocked(useSearchParams);
const mockParseUrlToFilters = vi.mocked(parseUrlToFilters);
const mockFiltersToUrlParams = vi.mocked(filtersToUrlParams);

function setupSearchParams(initial: Record<string, string> = {}) {
  const params = new URLSearchParams(initial);
  const setParams = vi.fn((updater: (prev: URLSearchParams) => URLSearchParams) => {
    const next = updater(params);
    params.toString();
    return next;
  });
  mockUseSearchParams.mockReturnValue([params, setParams as any]);
  return { params, setParams };
}

function renderFilters(metaFields: string[] = ['severity', 'status', 'vessel']) {
  return renderHook((fields: string[]) => useEventFilters(fields), {
    initialProps: metaFields,
  });
}

describe('useEventFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter Parsing', () => {
    it('Verify filters are parsed correctly from URL parameters', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual(parsed);
    });

    it('Verify single filter is parsed correctly', () => {
      setupSearchParams({ status: '=open' });
      const parsed: EventFilter[] = [{ field: 'status', operator: 'eq', value: 'open' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify multiple filters are parsed correctly', () => {
      setupSearchParams({ severity: '=high', status: '=open' });
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(2);
    });

    it('Verify multiple values for same filter are parsed correctly', () => {
      const params = new URLSearchParams();
      params.append('severity', '=high');
      params.append('severity', '!=low');
      mockUseSearchParams.mockReturnValue([params, vi.fn()]);
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'ne', value: 'low' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(2);
    });

    it('Verify appliedFilters returns empty array when URL has no filters', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify appliedFilters returns empty array when metaFields is empty', () => {
      setupSearchParams({ severity: '=high' });
      const { result } = renderFilters([]);
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify appliedFilters updates when URL changes', () => {
      setupSearchParams({ severity: '=high' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { rerender } = renderFilters();
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
      setupSearchParams({ severity: '=low' });
      mockParseUrlToFilters.mockReturnValue([]);
      rerender(['severity']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(2);
    });

    it('Verify appliedFilters updates when metaFields changes', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const { rerender } = renderFilters(['severity']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
      mockParseUrlToFilters.mockReturnValue([]);
      rerender(['severity', 'status']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(2);
    });

    it('Verify filter key matches metaField', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(['severity']);
      expect(result.current.appliedFilters[0].field).toBe('severity');
    });

    it('Verify filter value matches URL value', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('high');
    });

    it('Verify filters preserve order from URL', () => {
      const params = new URLSearchParams();
      params.append('severity', '=high');
      params.append('status', '=open');
      mockUseSearchParams.mockReturnValue([params, vi.fn()]);
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].field).toBe('severity');
      expect(result.current.appliedFilters[1].field).toBe('status');
    });

    it('Verify duplicate filter values are handled', () => {
      const params = new URLSearchParams();
      params.append('severity', '=high');
      params.append('severity', '=high');
      mockUseSearchParams.mockReturnValue([params, vi.fn()]);
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'eq', value: 'high' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(2);
    });

    it('Verify URL with one parameter', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify URL with multiple parameters', () => {
      setupSearchParams({ severity: '=high', status: '=open', vessel: '=ship1' });
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
        { field: 'vessel', operator: 'eq', value: 'ship1' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(3);
    });

    it('Verify URL with large number of filters', () => {
      const largeParams: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        largeParams[`field${i}`] = `=value${i}`;
      }
      setupSearchParams(largeParams);
      const largeFilters: EventFilter[] = Array.from({ length: 50 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      mockParseUrlToFilters.mockReturnValue(largeFilters);
      const { result } = renderFilters(Array.from({ length: 50 }, (_, i) => `field${i}`));
      expect(result.current.appliedFilters).toHaveLength(50);
    });

    it('Verify URL containing special characters', () => {
      setupSearchParams({ severity: '=high@#$%' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high@#$%' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('high@#$%');
    });

    it('Verify URL containing spaces', () => {
      setupSearchParams({ severity: '=high value' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high value' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('high value');
    });

    it('Verify URL containing encoded characters', () => {
      setupSearchParams({ severity: '=high%20value' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high value' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('high value');
    });

    it('Verify URL containing Unicode values', () => {
      setupSearchParams({ severity: '=αβγ' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'αβγ' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('αβγ');
    });

    it('Verify URL containing emojis', () => {
      setupSearchParams({ severity: '=🚀' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: '🚀' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('🚀');
    });
  });

  describe('MetaFields', () => {
    it('Verify behavior when metaFields contains one field', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(['severity']);
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify behavior when metaFields contains multiple fields', () => {
      setupSearchParams({ severity: '=high', status: '=open' });
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(['severity', 'status']);
      expect(result.current.appliedFilters).toHaveLength(2);
    });

    it('Verify behavior when metaFields is empty', () => {
      setupSearchParams({ severity: '=high' });
      const { result } = renderFilters([]);
      expect(result.current.appliedFilters).toEqual([]);
      expect(mockParseUrlToFilters).not.toHaveBeenCalled();
    });

    it('Verify behavior when metaFields is undefined', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(undefined as any);
      expect(result.current.appliedFilters).toEqual(parsed);
    });

    it('Verify behavior when metaFields contains duplicate fields', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(['severity', 'severity']);
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify behavior when metaFields contains special characters', () => {
      setupSearchParams({ 'field-name': '=value' });
      const parsed: EventFilter[] = [{ field: 'field-name', operator: 'eq', value: 'value' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(['field-name']);
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify behavior when metaFields contains spaces', () => {
      setupSearchParams({ 'field name': '=value' });
      const parsed: EventFilter[] = [{ field: 'field name', operator: 'eq', value: 'value' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters(['field name']);
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify behavior when metaFields changes dynamically', () => {
      setupSearchParams({ severity: '=high' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { rerender } = renderFilters(['severity']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
      mockParseUrlToFilters.mockReturnValue([]);
      rerender(['status']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(2);
    });

    it('Verify behavior when metaFields contains invalid values', () => {
      setupSearchParams({ severity: '=high' });
      const { result } = renderFilters(['', '  ', 'null']);
      expect(result.current.appliedFilters).toEqual([]);
    });
  });

  describe('applyFilters Functional', () => {
    it('Verify applyFilters updates URL correctly', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters adds single filter', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.getAll('severity')).toEqual(['=high']);
    });

    it('Verify applyFilters adds multiple filters', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'], status: ['=open'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.getAll('severity')).toEqual(['=high']);
      expect(next.getAll('status')).toEqual(['=open']);
    });

    it('Verify applyFilters adds multiple values for same filter', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high', '!=low'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'ne', value: 'low' },
      ]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.getAll('severity')).toEqual(['=high', '!=low']);
    });

    it('Verify applyFilters replaces old filters', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ status: ['=open'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'status', operator: 'eq', value: 'open' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams();
      prev.append('severity', '=high');
      const next = updater(prev);
      expect(next.getAll('severity')).toEqual([]);
      expect(next.get('status')).toBe('=open');
    });

    it('Verify applyFilters removes previous filters', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams();
      prev.append('severity', '=high');
      const next = updater(prev);
      expect(next.getAll('severity')).toEqual([]);
    });

    it('Verify applyFilters updates URL immediately', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify applyFilters works with empty filter array', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters works with one filter', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify applyFilters works with many filters', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const manyFilters: EventFilter[] = Array.from({ length: 100 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 100; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 100 }, (_, i) => `field${i}`));
      act(() => result.current.applyFilters(manyFilters));
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify applyFilters works after repeated calls', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]));
      expect(setParams).toHaveBeenCalledTimes(2);
    });

    it('Verify applyFilters works with duplicate values', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high', '=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'eq', value: 'high' },
      ]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.getAll('severity')).toEqual(['=high', '=high']);
    });

    it('Verify applyFilters works with duplicate filter names', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high', '!=low'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'ne', value: 'low' },
      ]));
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify applyFilters preserves URL structure', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
      expect(next.get('severity')).toBe('=high');
    });

    it('Verify applyFilters does not create malformed URL', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.toString()).toBeTruthy();
    });
  });

  describe('Search Query Preservation', () => {
    it('Verify q parameter is preserved when applying filters', () => {
      const { setParams } = setupSearchParams({ q: 'vessel X' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'vessel X' });
      const next = updater(prev);
      expect(next.get('q')).toBe('vessel X');
    });

    it('Verify q parameter remains unchanged', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter with normal text is preserved', () => {
      const { setParams } = setupSearchParams({ q: 'normal text' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'normal text' });
      const next = updater(prev);
      expect(next.get('q')).toBe('normal text');
    });

    it('Verify q parameter with spaces is preserved', () => {
      const { setParams } = setupSearchParams({ q: 'text with spaces' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'text with spaces' });
      const next = updater(prev);
      expect(next.get('q')).toBe('text with spaces');
    });

    it('Verify q parameter with special characters is preserved', () => {
      const { setParams } = setupSearchParams({ q: 'text@#$%' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'text@#$%' });
      const next = updater(prev);
      expect(next.get('q')).toBe('text@#$%');
    });

    it('Verify q parameter with Unicode characters is preserved', () => {
      const { setParams } = setupSearchParams({ q: 'αβγ' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'αβγ' });
      const next = updater(prev);
      expect(next.get('q')).toBe('αβγ');
    });

    it('Verify q parameter with emojis is preserved', () => {
      const { setParams } = setupSearchParams({ q: '🚀' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: '🚀' });
      const next = updater(prev);
      expect(next.get('q')).toBe('🚀');
    });

    it('Verify q parameter with encoded characters is preserved', () => {
      const { setParams } = setupSearchParams({ q: 'text%20encoded' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'text%20encoded' });
      const next = updater(prev);
      expect(next.get('q')).toBe('text%20encoded');
    });

    it('Verify q parameter remains when filters change', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter remains when filters are removed', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search', severity: '=high' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter remains when multiple filters are added', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'], status: ['=open'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter remains when duplicate filters are added', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high', '=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'eq', value: 'high' },
      ]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter remains after repeated updates', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]));
      const updater = setParams.mock.calls[1][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter remains with large filter set', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      const largeFilters: EventFilter[] = Array.from({ length: 100 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 100; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 100 }, (_, i) => `field${i}`));
      act(() => result.current.applyFilters(largeFilters));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });

    it('Verify q parameter remains with empty filter set', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });
  });

  describe('Empty Value', () => {
    it('Verify applyFilters with empty array', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters with empty filter value', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: '' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters with empty filter key', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: '', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters with null filter value', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: null as any }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters with undefined filter value', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: undefined as any }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters with null filter key', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: null as any, operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify applyFilters with undefined filter key', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: undefined as any, operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify parse URL containing empty values', () => {
      setupSearchParams({ severity: '' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify parse URL containing empty keys', () => {
      const params = new URLSearchParams();
      params.append('', '=high');
      mockUseSearchParams.mockReturnValue([params, vi.fn()]);
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify parse URL containing null-like values', () => {
      setupSearchParams({ severity: 'null' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });
  });

  describe('Special Character', () => {
    it('Verify filter value containing @', () => {
      setupSearchParams({ severity: '=test@' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test@' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test@');
    });

    it('Verify filter value containing #', () => {
      setupSearchParams({ severity: '=test#' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test#' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test#');
    });

    it('Verify filter value containing $', () => {
      setupSearchParams({ severity: '=test$' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test$' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test$');
    });

    it('Verify filter value containing %', () => {
      setupSearchParams({ severity: '=test%' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test%' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test%');
    });

    it('Verify filter value containing &', () => {
      setupSearchParams({ severity: '=test&' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test&' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test&');
    });

    it('Verify filter value containing +', () => {
      setupSearchParams({ severity: '=test+' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test+' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test+');
    });

    it('Verify filter value containing /', () => {
      setupSearchParams({ severity: '=test/' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test/' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test/');
    });

    it('Verify filter value containing ?', () => {
      setupSearchParams({ severity: '=test?' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test?' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test?');
    });

    it('Verify filter value containing =', () => {
      setupSearchParams({ severity: '=test=' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test=' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test=');
    });

    it('Verify filter value containing ;', () => {
      setupSearchParams({ severity: '=test;' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test;' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test;');
    });

    it('Verify filter value containing :', () => {
      setupSearchParams({ severity: '=test:' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test:' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test:');
    });

    it('Verify filter value containing quotes', () => {
      setupSearchParams({ severity: "='test'" });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: "'test'" }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe("'test'");
    });

    it('Verify filter value containing double quotes', () => {
      setupSearchParams({ severity: '="test"' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: '"test"' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('"test"');
    });

    it('Verify filter value containing backslashes', () => {
      setupSearchParams({ severity: '=test\\' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test\\' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test\\');
    });

    it('Verify filter value containing HTML tags', () => {
      setupSearchParams({ severity: '=test<b>' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test<b>' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test<b>');
    });

    it('Verify filter value containing script tags', () => {
      setupSearchParams({ severity: '=test<script>' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test<script>' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test<script>');
    });

    it('Verify filter value containing SQL injection strings', () => {
      setupSearchParams({ severity: "=test' OR '1'='1" });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: "test' OR '1'='1" }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe("test' OR '1'='1");
    });

    it('Verify filter value containing emojis', () => {
      setupSearchParams({ severity: '=test🚀' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test🚀' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test🚀');
    });

    it('Verify filter value containing Unicode text', () => {
      setupSearchParams({ severity: '=testαβγ' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'testαβγ' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('testαβγ');
    });

    it('Verify filter value containing line breaks', () => {
      setupSearchParams({ severity: '=test\nline' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'test\nline' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('test\nline');
    });
  });

  describe('URL Edge Cases', () => {
    it('Verify URL with no query parameters', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify URL with only q parameter', () => {
      setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify URL with only filters', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(1);
    });

    it('Verify URL with invalid query string', () => {
      setupSearchParams({ '??invalid': '=value' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify URL with duplicated parameters', () => {
      const params = new URLSearchParams();
      params.append('severity', '=high');
      params.append('severity', '=low');
      mockUseSearchParams.mockReturnValue([params, vi.fn()]);
      const parsed: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'severity', operator: 'eq', value: 'low' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toHaveLength(2);
    });

    it('Verify URL with very long query string', () => {
      const longValue = 'a'.repeat(1000);
      setupSearchParams({ severity: `=${longValue}` });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: longValue }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe(longValue);
    });

    it('Verify URL with encoded spaces', () => {
      setupSearchParams({ severity: '=high%20value' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high value' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('high value');
    });

    it('Verify URL with malformed encoding', () => {
      setupSearchParams({ severity: '=%ZZ' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify URL with unsupported characters', () => {
      setupSearchParams({ severity: '=\x00' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify URL with thousands of parameters', () => {
      const largeParams: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeParams[`field${i}`] = `=value${i}`;
      }
      setupSearchParams(largeParams);
      const largeFilters: EventFilter[] = Array.from({ length: 1000 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      mockParseUrlToFilters.mockReturnValue(largeFilters);
      const { result } = renderFilters(Array.from({ length: 1000 }, (_, i) => `field${i}`));
      expect(result.current.appliedFilters).toHaveLength(1000);
    });
  });

  describe('useMemo', () => {
    it('Verify appliedFilters is memoized', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      const first = result.current.appliedFilters;
      expect(result.current.appliedFilters).toBe(first);
    });

    it('Verify appliedFilters recalculates when searchParams changes', () => {
      setupSearchParams({ severity: '=high' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { rerender } = renderFilters();
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
      setupSearchParams({ severity: '=low' });
      mockParseUrlToFilters.mockReturnValue([]);
      rerender(['severity']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(2);
    });

    it('Verify appliedFilters recalculates when metaFields changes', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const { rerender } = renderFilters(['severity']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
      mockParseUrlToFilters.mockReturnValue([]);
      rerender(['severity', 'status']);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(2);
    });

    it('Verify appliedFilters does not recalculate unnecessarily', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const fields = ['severity', 'status'];
      const { rerender } = renderFilters(fields);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
      rerender(fields);
      expect(mockParseUrlToFilters).toHaveBeenCalledTimes(1);
    });

    it('Verify memoization works with large filter lists', () => {
      const largeParams: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeParams[`field${i}`] = `=value${i}`;
      }
      setupSearchParams(largeParams);
      const largeFilters: EventFilter[] = Array.from({ length: 100 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      mockParseUrlToFilters.mockReturnValue(largeFilters);
      const { result } = renderFilters(Array.from({ length: 100 }, (_, i) => `field${i}`));
      const first = result.current.appliedFilters;
      expect(result.current.appliedFilters).toBe(first);
    });

    it('Verify memoization works with large metaFields list', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const largeMetaFields = Array.from({ length: 100 }, (_, i) => `field${i}`);
      const { result } = renderFilters(largeMetaFields);
      const first = result.current.appliedFilters;
      expect(result.current.appliedFilters).toBe(first);
    });

    it('Verify memoization after repeated renders', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const fields = ['severity', 'status'];
      const { result, rerender } = renderFilters(fields);
      const first = result.current.appliedFilters;
      rerender(fields);
      rerender(fields);
      expect(result.current.appliedFilters).toBe(first);
    });

    it('Verify memoization after URL updates', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result, rerender } = renderFilters();
      const first = result.current.appliedFilters;
      setupSearchParams({ severity: '=low' });
      const parsed2: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'low' }];
      mockParseUrlToFilters.mockReturnValue(parsed2);
      rerender(['severity']);
      const second = result.current.appliedFilters;
      expect(first).not.toBe(second);
    });

    it('Verify memoization after filter removal', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result, rerender } = renderFilters();
      const first = result.current.appliedFilters;
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      rerender(['severity']);
      const second = result.current.appliedFilters;
      expect(first).not.toBe(second);
    });

    it('Verify memoization after filter addition', () => {
      setupSearchParams({ severity: '=high' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: 'high' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result, rerender } = renderFilters();
      const first = result.current.appliedFilters;
      setupSearchParams({ severity: '=high', status: '=open' });
      const parsed2: EventFilter[] = [
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ];
      mockParseUrlToFilters.mockReturnValue(parsed2);
      rerender(['severity', 'status']);
      const second = result.current.appliedFilters;
      expect(first).not.toBe(second);
    });
  });

  describe('useCallback', () => {
    it('Verify applyFilters function is memoized', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      const first = result.current.applyFilters;
      expect(result.current.applyFilters).toBe(first);
    });

    it('Verify callback reference remains stable', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      const first = result.current.applyFilters;
      const second = result.current.applyFilters;
      expect(first).toBe(second);
    });

    it('Verify callback changes when dependency changes', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const { result, rerender } = renderFilters(['severity']);
      const first = result.current.applyFilters;
      rerender(['status']);
      const second = result.current.applyFilters;
      expect(first).toBe(second);
    });

    it('Verify callback works after re-render', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result, rerender } = renderFilters();
      rerender(['severity', 'status']);
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify callback works after URL update', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      setupSearchParams({ severity: '=low' });
      mockParseUrlToFilters.mockReturnValue([]);
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify callback works after metaFields update', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result, rerender } = renderFilters(['severity']);
      rerender(['severity', 'status']);
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify callback works with multiple invocations', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]));
      expect(setParams).toHaveBeenCalledTimes(2);
    });

    it('Verify callback works after filter removal', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify callback works after filter addition', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'], status: ['=open'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([
        { field: 'severity', operator: 'eq', value: 'high' },
        { field: 'status', operator: 'eq', value: 'open' },
      ]));
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });

    it('Verify callback works after search query update', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
    });
  });

  describe('Performance', () => {
    it('Verify performance with 10 filters', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const filters: EventFilter[] = Array.from({ length: 10 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 10; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 10 }, (_, i) => `field${i}`));
      const start = performance.now();
      act(() => result.current.applyFilters(filters));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('Verify performance with 50 filters', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const filters: EventFilter[] = Array.from({ length: 50 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 50; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 50 }, (_, i) => `field${i}`));
      const start = performance.now();
      act(() => result.current.applyFilters(filters));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('Verify performance with 100 filters', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const filters: EventFilter[] = Array.from({ length: 100 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 100; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 100 }, (_, i) => `field${i}`));
      const start = performance.now();
      act(() => result.current.applyFilters(filters));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('Verify performance with 500 filters', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const filters: EventFilter[] = Array.from({ length: 500 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 500; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 500 }, (_, i) => `field${i}`));
      const start = performance.now();
      act(() => result.current.applyFilters(filters));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('Verify performance with 1000 filters', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      const filters: EventFilter[] = Array.from({ length: 1000 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      const urlParams: Record<string, string[]> = {};
      for (let i = 0; i < 1000; i++) {
        urlParams[`field${i}`] = [`=value${i}`];
      }
      mockFiltersToUrlParams.mockReturnValue(urlParams);
      const { result } = renderFilters(Array.from({ length: 1000 }, (_, i) => `field${i}`));
      const start = performance.now();
      act(() => result.current.applyFilters(filters));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('Verify performance with large URL', () => {
      const largeParams: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeParams[`field${i}`] = `=value${i}`;
      }
      setupSearchParams(largeParams);
      const largeFilters: EventFilter[] = Array.from({ length: 1000 }, (_, i) => ({
        field: `field${i}`,
        operator: 'eq' as const,
        value: `value${i}`,
      }));
      mockParseUrlToFilters.mockReturnValue(largeFilters);
      const start = performance.now();
      const { result } = renderFilters(Array.from({ length: 1000 }, (_, i) => `field${i}`));
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
      expect(result.current.appliedFilters).toHaveLength(1000);
    });

    it('Verify performance with large metaFields array', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const largeMetaFields = Array.from({ length: 1000 }, (_, i) => `field${i}`);
      const start = performance.now();
      const { result } = renderFilters(largeMetaFields);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify repeated updates do not degrade performance', () => {
      setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
        const end = performance.now();
        times.push(end - start);
      }
      const maxTime = Math.max(...times);
      expect(maxTime).toBeLessThan(100);
    });

    it('Verify no excessive renders occur', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]));
      expect(setParams).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrency / Race Condition', () => {
    it('Verify multiple applyFilters calls execute correctly', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]);
      });
      expect(setParams).toHaveBeenCalledTimes(2);
    });

    it('Verify rapid filter changes update latest state', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'medium' }]);
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]);
      });
      expect(setParams).toHaveBeenCalledTimes(3);
    });

    it('Verify rapid URL updates do not lose filters', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'], status: ['=open'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([
          { field: 'severity', operator: 'eq', value: 'high' },
          { field: 'status', operator: 'eq', value: 'open' },
        ]);
      });
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify rapid URL updates do not lose q parameter', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]);
      });
      expect(setParams).toHaveBeenCalledTimes(2);
    });

    it('Verify latest filter state is preserved', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=low'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'low' }]);
      });
      const updater = setParams.mock.calls[1][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.get('severity')).toBe('=low');
    });

    it('Verify simultaneous search and filter updates', () => {
      const { setParams } = setupSearchParams({ q: 'search' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
      });
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: 'search' });
      const next = updater(prev);
      expect(next.get('q')).toBe('search');
      expect(next.get('severity')).toBe('=high');
    });

    it('Verify simultaneous filter additions', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'], status: ['=open'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([
          { field: 'severity', operator: 'eq', value: 'high' },
          { field: 'status', operator: 'eq', value: 'open' },
        ]);
      });
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify simultaneous filter removals', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([]);
      });
      expect(setParams).toHaveBeenCalledTimes(1);
    });

    it('Verify simultaneous add/remove operations', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ status: ['=open'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'status', operator: 'eq', value: 'open' }]);
      });
      act(() => {
        result.current.applyFilters([]);
      });
      expect(setParams).toHaveBeenCalledTimes(2);
    });

    it('Verify no stale filter values remain', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ status: ['=open'] });
      const { result } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
        result.current.applyFilters([{ field: 'status', operator: 'eq', value: 'open' }]);
      });
      const updater = setParams.mock.calls[1][0] as (prev: URLSearchParams) => URLSearchParams;
      const next = updater(new URLSearchParams());
      expect(next.has('severity')).toBe(false);
      expect(next.get('status')).toBe('=open');
    });
  });

  describe('High-Risk Edge Cases', () => {
    it('Verify metaFields is empty array', () => {
      setupSearchParams({ severity: '=high' });
      const { result } = renderFilters([]);
      expect(result.current.appliedFilters).toEqual([]);
      expect(mockParseUrlToFilters).not.toHaveBeenCalled();
    });

    it('Verify searchParams is empty', () => {
      setupSearchParams({});
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify q parameter is empty string', () => {
      const { setParams } = setupSearchParams({ q: '' });
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams({ q: '' });
      const next = updater(prev);
      expect(next.get('q')).toBeNull();
    });

    it('Verify applyFilters([]) clears filters correctly', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({});
      const { result } = renderFilters();
      act(() => result.current.applyFilters([]));
      const updater = setParams.mock.calls[0][0] as (prev: URLSearchParams) => URLSearchParams;
      const prev = new URLSearchParams();
      prev.append('severity', '=high');
      const next = updater(prev);
      expect(next.getAll('severity')).toEqual([]);
    });

    it('Verify URL contains malformed filter values', () => {
      setupSearchParams({ severity: '==malformed' });
      mockParseUrlToFilters.mockReturnValue([]);
      const { result } = renderFilters();
      expect(result.current.appliedFilters).toEqual([]);
    });

    it('Verify filter value contains SQL injection payload', () => {
      setupSearchParams({ severity: "='; DROP TABLE users; --" });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: "'; DROP TABLE users; --" }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe("'; DROP TABLE users; --");
    });

    it('Verify filter value contains XSS payload', () => {
      setupSearchParams({ severity: '=<script>alert(1)</script>' });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: '<script>alert(1)</script>' }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe('<script>alert(1)</script>');
    });

    it('Verify URL exceeds normal browser query length', () => {
      const longValue = 'a'.repeat(10000);
      setupSearchParams({ severity: `=${longValue}` });
      const parsed: EventFilter[] = [{ field: 'severity', operator: 'eq', value: longValue }];
      mockParseUrlToFilters.mockReturnValue(parsed);
      const { result } = renderFilters();
      expect(result.current.appliedFilters[0].value).toBe(longValue);
    });

    it('Verify hook behaves correctly when component unmounts during URL update', () => {
      const { setParams } = setupSearchParams();
      mockParseUrlToFilters.mockReturnValue([]);
      mockFiltersToUrlParams.mockReturnValue({ severity: ['=high'] });
      const { result, unmount } = renderFilters();
      act(() => {
        result.current.applyFilters([{ field: 'severity', operator: 'eq', value: 'high' }]);
        unmount();
      });
      expect(setParams).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
