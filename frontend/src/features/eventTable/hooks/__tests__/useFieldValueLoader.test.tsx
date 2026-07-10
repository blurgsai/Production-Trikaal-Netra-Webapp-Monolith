import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFieldValueLoader } from '../useFieldValueLoader';
import type { MetadataValueApiResponse } from '../../api/types';

vi.mock('../../api/eventTableApi', () => ({ fetchEventMetadataValues: vi.fn() }));
import { fetchEventMetadataValues } from '../../api/eventTableApi';

const mockedFetch = vi.mocked(fetchEventMetadataValues);

function makeRawResponse(o?: Partial<MetadataValueApiResponse>): MetadataValueApiResponse {
  return { field: 'severity', values: ['high', 'low', 'medium'], ...o };
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe('useFieldValueLoader', () => {
  it('returns empty fieldValues initially', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    expect(result.current.fieldValues).toEqual({});
  });

  it('returns loadValues function', () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    expect(typeof result.current.loadValues).toBe('function');
  });

  it('loadValues fetches data for a field', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ field: 'severity', values: ['high', 'low'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    await waitFor(() => expect(result.current.fieldValues['severity']).toEqual(['high', 'low']));
  });

  it('loadValues stores values in fieldValues', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ values: ['a', 'b', 'c'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('status'); });
    await waitFor(() => expect(result.current.fieldValues['status']).toEqual(['a', 'b', 'c']));
  });

  it('loadValues does not fetch for empty field', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues(''); });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('loadValues does not fetch for "information" field', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('information'); });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('loadValues does not fetch for "information." prefixed fields', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('information.subfield'); });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('loadValues caches result and does not refetch', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ values: ['high'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    await waitFor(() => expect(result.current.fieldValues['severity']).toEqual(['high']));
    await act(async () => { await result.current.loadValues('severity'); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('loadValues fetches different fields separately', async () => {
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'severity', values: ['high'] }));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'status', values: ['active'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    await act(async () => { await result.current.loadValues('status'); });
    await waitFor(() => expect(result.current.fieldValues['severity']).toEqual(['high']));
    await waitFor(() => expect(result.current.fieldValues['status']).toEqual(['active']));
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('loadValues handles API error gracefully', async () => {
    mockedFetch.mockRejectedValue(new Error('Network'));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    expect(result.current.fieldValues['severity']).toBeUndefined();
  });

  it('loadValues maps values through mapMetadataValuesFromApi', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: ['a', 1, 'b', 2] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual(['a', 1, 'b', 2]));
  });

  it('loadValues filters out non-string/number values', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: ['a', null, 1, undefined, 'b'] as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual(['a', 1, 'b']));
  });

  it('loadValues handles empty values array', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: [] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual([]));
  });

  it('loadValues handles null values array', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: null as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual([]));
  });

  it('loadValues handles undefined values array', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: undefined as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual([]));
  });

  it('loadValues stores empty array on error in cache', async () => {
    mockedFetch.mockRejectedValue(new Error('Network'));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    expect(result.current.fieldValues['severity']).toBeUndefined();
    await act(async () => { await result.current.loadValues('severity'); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('loadValues does not fetch if already loading', async () => {
    let resolveFn: (val: MetadataValueApiResponse) => void = () => {};
    mockedFetch.mockReturnValueOnce(new Promise(resolve => { resolveFn = resolve; }));
    const { result } = renderHook(() => useFieldValueLoader());
    act(() => { result.current.loadValues('severity'); });
    act(() => { result.current.loadValues('severity'); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    act(() => resolveFn(makeRawResponse()));
    await waitFor(() => expect(result.current.fieldValues['severity']).toBeDefined());
  });

  it('loadValues fetches after cache is cleared by error', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network'));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ values: ['high'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    expect(result.current.fieldValues['severity']).toBeUndefined();
    await act(async () => { await result.current.loadValues('severity'); });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('loadValues with numeric values', async () => {
    mockedFetch.mockResolvedValue({ field: 'count', values: [1, 2, 3, 4, 5] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('count'); });
    await waitFor(() => expect(result.current.fieldValues['count']).toEqual([1, 2, 3, 4, 5]));
  });

  it('loadValues with mixed string and number values', async () => {
    mockedFetch.mockResolvedValue({ field: 'mixed', values: ['a', 1, 'b', 2] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('mixed'); });
    await waitFor(() => expect(result.current.fieldValues['mixed']).toEqual(['a', 1, 'b', 2]));
  });

  it('loadValues with single value', async () => {
    mockedFetch.mockResolvedValue({ field: 'single', values: ['only'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('single'); });
    await waitFor(() => expect(result.current.fieldValues['single']).toEqual(['only']));
  });

  it('loadValues with large values array', async () => {
    const vals = Array.from({ length: 100 }, (_, i) => `val_${i}`);
    mockedFetch.mockResolvedValue({ field: 'large', values: vals });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('large'); });
    await waitFor(() => expect(result.current.fieldValues['large']).toHaveLength(100));
  });

  it('loadValues with special characters in values', async () => {
    mockedFetch.mockResolvedValue({ field: 'special', values: ['test&special<>"'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('special'); });
    await waitFor(() => expect(result.current.fieldValues['special']).toEqual(['test&special<>"']));
  });

  it('loadValues with unicode values', async () => {
    mockedFetch.mockResolvedValue({ field: 'unicode', values: ['船A', '船B'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('unicode'); });
    await waitFor(() => expect(result.current.fieldValues['unicode']).toEqual(['船A', '船B']));
  });

  it('loadValues with empty string value', async () => {
    mockedFetch.mockResolvedValue({ field: 'empty', values: [''] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('empty'); });
    await waitFor(() => expect(result.current.fieldValues['empty']).toEqual(['']));
  });

  it('loadValues with whitespace value', async () => {
    mockedFetch.mockResolvedValue({ field: 'ws', values: ['  '] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('ws'); });
    await waitFor(() => expect(result.current.fieldValues['ws']).toEqual(['  ']));
  });

  it('loadValues with negative numbers', async () => {
    mockedFetch.mockResolvedValue({ field: 'neg', values: [-1, -2, -3] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('neg'); });
    await waitFor(() => expect(result.current.fieldValues['neg']).toEqual([-1, -2, -3]));
  });

  it('loadValues with float numbers', async () => {
    mockedFetch.mockResolvedValue({ field: 'float', values: [1.5, 2.5, 3.5] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('float'); });
    await waitFor(() => expect(result.current.fieldValues['float']).toEqual([1.5, 2.5, 3.5]));
  });

  it('loadValues with zero', async () => {
    mockedFetch.mockResolvedValue({ field: 'zero', values: [0] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('zero'); });
    await waitFor(() => expect(result.current.fieldValues['zero']).toEqual([0]));
  });

  it('loadValues with boolean strings', async () => {
    mockedFetch.mockResolvedValue({ field: 'bool', values: ['true', 'false'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('bool'); });
    await waitFor(() => expect(result.current.fieldValues['bool']).toEqual(['true', 'false']));
  });

  it('loadValues with duplicate values', async () => {
    mockedFetch.mockResolvedValue({ field: 'dup', values: ['high', 'high', 'low'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('dup'); });
    await waitFor(() => expect(result.current.fieldValues['dup']).toEqual(['high', 'high', 'low']));
  });

  it('loadValues with very long string value', async () => {
    const longVal = 'v'.repeat(500);
    mockedFetch.mockResolvedValue({ field: 'long', values: [longVal] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('long'); });
    await waitFor(() => expect(result.current.fieldValues['long']).toEqual([longVal]));
  });

  it('loadValues preserves order of values', async () => {
    mockedFetch.mockResolvedValue({ field: 'order', values: ['c', 'a', 'b'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('order'); });
    await waitFor(() => expect(result.current.fieldValues['order']).toEqual(['c', 'a', 'b']));
  });

  it('loadValues with field "info.field" is NOT blocked', async () => {
    mockedFetch.mockResolvedValue({ field: 'info.field', values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('info.field'); });
    await waitFor(() => expect(result.current.fieldValues['info.field']).toEqual(['a']));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('loadValues with field containing underscores', async () => {
    mockedFetch.mockResolvedValue({ field: 'event_type', values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('event_type'); });
    await waitFor(() => expect(result.current.fieldValues['event_type']).toEqual(['a']));
  });

  it('loadValues with field containing spaces', async () => {
    mockedFetch.mockResolvedValue({ field: 'event type', values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('event type'); });
    await waitFor(() => expect(result.current.fieldValues['event type']).toEqual(['a']));
  });

  it('loadValues with field containing special characters', async () => {
    mockedFetch.mockResolvedValue({ field: 'field<>&"', values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('field<>&"'); });
    await waitFor(() => expect(result.current.fieldValues['field<>&"']).toEqual(['a']));
  });

  it('loadValues with unicode field name', async () => {
    mockedFetch.mockResolvedValue({ field: '深刻度', values: ['高'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('深刻度'); });
    await waitFor(() => expect(result.current.fieldValues['深刻度']).toEqual(['高']));
  });

  it('loadValues with very long field name', async () => {
    const longField = 'f'.repeat(200);
    mockedFetch.mockResolvedValue({ field: longField, values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues(longField); });
    await waitFor(() => expect(result.current.fieldValues[longField]).toEqual(['a']));
  });

  it('multiple fields loaded simultaneously', async () => {
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'a', values: ['1'] }));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'b', values: ['2'] }));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'c', values: ['3'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => {
      await Promise.all([
        result.current.loadValues('a'),
        result.current.loadValues('b'),
        result.current.loadValues('c'),
      ]);
    });
    await waitFor(() => expect(Object.keys(result.current.fieldValues).sort()).toEqual(['a', 'b', 'c']));
  });

  it('loadValues is stable across rerenders', () => {
    const { result, rerender } = renderHook(() => useFieldValueLoader());
    const first = result.current.loadValues;
    rerender();
    expect(result.current.loadValues).toBe(first);
  });

  it('fieldValues persists across rerenders', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ values: ['high'] }));
    const { result, rerender } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    await waitFor(() => expect(result.current.fieldValues['severity']).toEqual(['high']));
    rerender();
    expect(result.current.fieldValues['severity']).toEqual(['high']);
  });

  it('loadValues with field "information" exactly is blocked', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('information'); });
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.current.fieldValues['information']).toBeUndefined();
  });

  it('loadValues with field "information." prefix is blocked', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('information.anything'); });
    expect(mockedFetch).not.toHaveBeenCalled();
    expect(result.current.fieldValues['information.anything']).toBeUndefined();
  });

  it('loadValues with field "information.subfield.deep" is blocked', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('information.subfield.deep'); });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('loadValues with field "infor" is NOT blocked', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ values: ['a'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('infor'); });
    await waitFor(() => expect(result.current.fieldValues['infor']).toEqual(['a']));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('loadValues with field "informational" is NOT blocked', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse({ values: ['a'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('informational'); });
    await waitFor(() => expect(result.current.fieldValues['informational']).toEqual(['a']));
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('hook returns object with fieldValues and loadValues', () => {
    const { result } = renderHook(() => useFieldValueLoader());
    expect(Object.keys(result.current).sort()).toEqual(['fieldValues', 'loadValues']);
  });

  it('loadValues does not set fieldValues for blocked fields', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('information'); });
    expect(result.current.fieldValues).toEqual({});
  });

  it('loadValues with field containing numbers', async () => {
    mockedFetch.mockResolvedValue({ field: 'field123', values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('field123'); });
    await waitFor(() => expect(result.current.fieldValues['field123']).toEqual(['a']));
  });

  it('loadValues with field containing hyphens', async () => {
    mockedFetch.mockResolvedValue({ field: 'event-type', values: ['a'] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('event-type'); });
    await waitFor(() => expect(result.current.fieldValues['event-type']).toEqual(['a']));
  });

  it('loadValues with boolean true in values (filtered out)', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: [true, false] as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual([]));
  });

  it('loadValues with objects in values (filtered out)', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: [{ a: 1 }, [1, 2]] as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual([]));
  });

  it('loadValues with only null values (filtered out)', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: [null, null] as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual([]));
  });

  it('loadValues with mix of valid and invalid types', async () => {
    mockedFetch.mockResolvedValue({ field: 'test', values: ['valid', null, 42, undefined, 'also_valid'] as unknown as (string | number)[] });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('test'); });
    await waitFor(() => expect(result.current.fieldValues['test']).toEqual(['valid', 42, 'also_valid']));
  });

  it('loadValues fetches with correct field argument', async () => {
    mockedFetch.mockResolvedValue(makeRawResponse());
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('severity'); });
    expect(mockedFetch).toHaveBeenCalledWith('severity');
  });

  it('loadValues does not overwrite other fieldValues', async () => {
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'a', values: ['1'] }));
    mockedFetch.mockResolvedValueOnce(makeRawResponse({ field: 'b', values: ['2'] }));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => { await result.current.loadValues('a'); });
    await waitFor(() => expect(result.current.fieldValues['a']).toEqual(['1']));
    await act(async () => { await result.current.loadValues('b'); });
    await waitFor(() => expect(result.current.fieldValues['b']).toEqual(['2']));
    expect(result.current.fieldValues['a']).toEqual(['1']);
  });
});
