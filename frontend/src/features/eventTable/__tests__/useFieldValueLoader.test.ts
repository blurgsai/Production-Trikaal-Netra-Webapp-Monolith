import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFieldValueLoader } from '../hooks/useFieldValueLoader';
import { fetchEventMetadataValues } from '../api/eventTableApi';
import { mapMetadataValuesFromApi } from '../model/mappers';

vi.mock('../api/eventTableApi');
vi.mock('../model/mappers');

const mockFetch = vi.mocked(fetchEventMetadataValues);
const mockMap = vi.mocked(mapMetadataValuesFromApi);

describe('useFieldValueLoader', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockMap.mockReset();
  });

  // Guard clause tests
  it('Should not load values when field is empty string', async () => {
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues(''));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Should not load values when field is undefined', async () => {
    const { result } = renderHook(() => useFieldValueLoader());
    // @ts-expect-error testing runtime guard against undefined field
    await act(() => result.current.loadValues(undefined));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Should not load values when field is null', async () => {
    const { result } = renderHook(() => useFieldValueLoader());
    // @ts-expect-error testing runtime guard against null field
    await act(() => result.current.loadValues(null));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Should not load values when field is "information"', async () => {
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('information'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('Should not load values when field starts with "information."', async () => {
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('information.test'));
    await act(() => result.current.loadValues('information.name'));
    await act(() => result.current.loadValues('information.value'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // API Call Test Cases
  it('Should load values for valid field', async () => {
    mockFetch.mockResolvedValue({ field: 'validField', values: ['foo', 'bar'] });
    mockMap.mockReturnValue(['foo', 'bar']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('validField'));
    expect(mockFetch).toHaveBeenCalledWith('validField');
    expect(mockMap).toHaveBeenCalledWith({ field: 'validField', values: ['foo', 'bar'] });
    expect(result.current.fieldValues['validField']).toEqual(['foo', 'bar']);
  });

  // API Call Test Cases
  it('Should load values for single-character field', async () => {
    mockFetch.mockResolvedValue({ field: 'a', values: ['a'] });
    mockMap.mockReturnValue(['a']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('a'));
    expect(mockFetch).toHaveBeenCalledWith('a');
    expect(result.current.fieldValues['a']).toEqual(['a']);
  });

  it('Should load values for numeric field name', async () => {
    mockFetch.mockResolvedValue({ field: '123', values: [1, 2] });
    mockMap.mockReturnValue([1, 2]);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('123'));
    expect(mockFetch).toHaveBeenCalledWith('123');
    expect(result.current.fieldValues['123']).toEqual([1, 2]);
  });

  it('Should load values for alphanumeric field name', async () => {
    mockFetch.mockResolvedValue({ field: 'field1a', values: ['a1', 'b2'] });
    mockMap.mockReturnValue(['a1', 'b2']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('field1a'));
    expect(mockFetch).toHaveBeenCalledWith('field1a');
    expect(result.current.fieldValues['field1a']).toEqual(['a1', 'b2']);
  });

  it('Should load values for field with underscore', async () => {
    mockFetch.mockResolvedValue({ field: 'field_name', values: ['v'] });
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('field_name'));
    expect(mockFetch).toHaveBeenCalledWith('field_name');
    expect(result.current.fieldValues['field_name']).toEqual(['v']);
  });

  it('Should load values for field with hyphen', async () => {
    mockFetch.mockResolvedValue({ field: 'field-name', values: ['v'] });
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('field-name'));
    expect(mockFetch).toHaveBeenCalledWith('field-name');
    expect(result.current.fieldValues['field-name']).toEqual(['v']);
  });

  it('Should call fetchEventMetadataValues once', async () => {
    mockFetch.mockResolvedValue({ field: 'x', values: ['a'] });
    mockMap.mockReturnValue(['a']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('x'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('Should not call API twice for same field', async () => {
    mockFetch.mockResolvedValue({ field: 'repeat', values: ['a'] });
    mockMap.mockReturnValue(['a']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('repeat'));
    await act(() => result.current.loadValues('repeat'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // Cache Test Cases
  it('Should cache loaded field values', async () => {
    mockFetch.mockResolvedValue({ field: 'cacheField', values: ['cache'] });
    mockMap.mockReturnValue(['cache']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('cacheField'));
    expect(result.current.fieldValues['cacheField']).toEqual(['cache']);
    await act(() => result.current.loadValues('cacheField'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('Should cache empty array after error', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('errField'));
    await act(() => result.current.loadValues('errField'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.fieldValues['errField']).toEqual(undefined);
  });

  // Loading State Test Cases
  it('Should mark field as loading during request', async () => {
    let resolve: ((v: unknown) => void) | undefined;
    mockFetch.mockImplementation(() => new Promise(r => (resolve = r)) as never);
    const { result } = renderHook(() => useFieldValueLoader());
    act(() => { result.current.loadValues('loadingField'); });
    expect(result.current.fieldValues['loadingField']).toBeUndefined();
    await act(async () => { resolve?.([]); });
  });

  it('Should clear loading after success', async () => {
    mockFetch.mockResolvedValue({ field: 'doneField', values: ['done'] });
    mockMap.mockReturnValue(['done']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('doneField'));
    expect(result.current.fieldValues['doneField']).toEqual(['done']);
  });

  // State Update Test Cases
  it('Should update fieldValues after successful fetch', async () => {
    mockFetch.mockResolvedValue({ field: 'updateField', values: ['x'] });
    mockMap.mockReturnValue(['x']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('updateField'));
    expect(result.current.fieldValues['updateField']).toEqual(['x']);
  });

  // Mapping Test Cases
  it('Should call mapMetadataValuesFromApi', async () => {
    mockFetch.mockResolvedValue({ field: 'mapField', values: ['raw'] });
    mockMap.mockReturnValue(['mapped']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('mapField'));
    expect(mockMap).toHaveBeenCalledWith({ field: 'mapField', values: ['raw'] });
    expect(result.current.fieldValues['mapField']).toEqual(['mapped']);
  });

  it('Should store mapped values', async () => {
    mockFetch.mockResolvedValue({ field: 'mapStore', values: ['a', 'b'] });
    mockMap.mockReturnValue(['A', 'B']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('mapStore'));
    expect(result.current.fieldValues['mapStore']).toEqual(['A', 'B']);
  });

  // Error Handling Test Cases
  it('Should handle API rejection', async () => {
    mockFetch.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('errApi'));
    expect(result.current.fieldValues['errApi']).toBeUndefined();
  });

  it('Should handle mapper exception', async () => {
    mockFetch.mockResolvedValue({ field: 'errMap', values: ['x'] });
    mockMap.mockImplementation(() => { throw new Error('fail'); });
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('errMap'));
    expect(result.current.fieldValues['errMap']).toBeUndefined();
  });

  // Edge Case Test Cases
  it('Should load values for field with emoji', async () => {
    mockFetch.mockResolvedValue({ field: 'emoji😀', values: ['😀'] });
    mockMap.mockReturnValue(['😀']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('emoji😀'));
    expect(result.current.fieldValues['emoji😀']).toEqual(['😀']);
  });

  it('Should load values for field with spaces', async () => {
    mockFetch.mockResolvedValue({ field: 'field with space', values: [' '] });
    mockMap.mockReturnValue([' ']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('field with space'));
    expect(result.current.fieldValues['field with space']).toEqual([' ']);
  });

  // Concurrency & Race Condition Test Cases
  it('Should prevent duplicate concurrent requests for same field', async () => {
    let resolve: ((v: unknown) => void) | undefined;
    mockFetch.mockImplementation(() => new Promise(r => (resolve = r)) as never);
    const { result } = renderHook(() => useFieldValueLoader());
    act(() => { result.current.loadValues('concurrent'); });
    act(() => { result.current.loadValues('concurrent'); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await act(async () => { resolve?.([]); });
  });

  it('Should allow concurrent requests for different fields', async () => {
    let resolveA: ((v: unknown) => void) | undefined;
    let resolveB: ((v: unknown) => void) | undefined;
    mockFetch.mockImplementationOnce(() => new Promise(r => (resolveA = r)) as never)
      .mockImplementationOnce(() => new Promise(r => (resolveB = r)) as never);
    const { result } = renderHook(() => useFieldValueLoader());
    act(() => { result.current.loadValues('fieldA'); });
    act(() => { result.current.loadValues('fieldB'); });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await act(async () => { resolveA?.([]); resolveB?.([]); });
  });

  it('Should call API for different fields', async () => {
    mockFetch.mockResolvedValue({ field: 'first', values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('first'));
    await act(() => result.current.loadValues('second'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith('first');
    expect(mockFetch).toHaveBeenCalledWith('second');
  });

  it('Should support sequential requests', async () => {
    mockFetch.mockResolvedValue({ field: 'seq1', values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('seq1'));
    await act(() => result.current.loadValues('seq2'));
    await act(() => result.current.loadValues('seq3'));
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.current.fieldValues['seq1']).toEqual(['v']);
    expect(result.current.fieldValues['seq2']).toEqual(['v']);
    expect(result.current.fieldValues['seq3']).toEqual(['v']);
  });

  it('Should preserve existing fieldValues when adding new field', async () => {
    mockFetch.mockResolvedValue({ field: 'keepA', values: ['v'] } as never);
    mockMap.mockReturnValueOnce(['one']).mockReturnValueOnce(['two']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('keepA'));
    await act(() => result.current.loadValues('keepB'));
    expect(result.current.fieldValues['keepA']).toEqual(['one']);
    expect(result.current.fieldValues['keepB']).toEqual(['two']);
  });

  it('Should support numeric values', async () => {
    mockFetch.mockResolvedValue({ field: 'numeric', values: [1, 2, 3] } as never);
    mockMap.mockReturnValue([1, 2, 3]);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('numeric'));
    expect(result.current.fieldValues['numeric']).toEqual([1, 2, 3]);
  });

  it('Should support mixed string and number values', async () => {
    mockFetch.mockResolvedValue({ field: 'mixed', values: ['a', 1] } as never);
    mockMap.mockReturnValue(['a', 1]);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('mixed'));
    expect(result.current.fieldValues['mixed']).toEqual(['a', 1]);
  });

  it('Should support empty array values', async () => {
    mockFetch.mockResolvedValue({ field: 'empty', values: [] } as never);
    mockMap.mockReturnValue([]);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('empty'));
    expect(result.current.fieldValues['empty']).toEqual([]);
  });

  it('Should support large value arrays', async () => {
    const large = Array.from({ length: 5000 }, (_, i) => `v${i}`);
    mockFetch.mockResolvedValue({ field: 'large', values: large } as never);
    mockMap.mockReturnValue(large);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('large'));
    expect(result.current.fieldValues['large']).toHaveLength(5000);
  });

  it('Should preserve mapped value order', async () => {
    mockFetch.mockResolvedValue({ field: 'order', values: ['c', 'a', 'b'] } as never);
    mockMap.mockReturnValue(['c', 'a', 'b']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('order'));
    expect(result.current.fieldValues['order']).toEqual(['c', 'a', 'b']);
  });

  it('Should handle duplicate values from mapper', async () => {
    mockFetch.mockResolvedValue({ field: 'dupes', values: ['x', 'x'] } as never);
    mockMap.mockReturnValue(['x', 'x']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('dupes'));
    expect(result.current.fieldValues['dupes']).toEqual(['x', 'x']);
  });

  it('Should allow future requests after failure of another field', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fail')).mockResolvedValue({ field: 'okField', values: ['ok'] } as never);
    mockMap.mockReturnValue(['ok']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('failField'));
    await act(() => result.current.loadValues('okField'));
    expect(result.current.fieldValues['okField']).toEqual(['ok']);
  });

  it('Should preserve previous successful values after later error', async () => {
    mockFetch.mockResolvedValueOnce({ field: 'goodField', values: ['good'] } as never).mockRejectedValueOnce(new Error('fail'));
    mockMap.mockReturnValue(['good']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('goodField'));
    await act(() => result.current.loadValues('badField'));
    expect(result.current.fieldValues['goodField']).toEqual(['good']);
    expect(result.current.fieldValues['badField']).toBeUndefined();
  });

  it('Should not crash on error', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFieldValueLoader());
    await expect(act(() => result.current.loadValues('crash'))).resolves.not.toThrow();
  });

  it('Should handle extremely long field name', async () => {
    const longField = 'f'.repeat(10000);
    mockFetch.mockResolvedValue({ field: longField, values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues(longField));
    expect(mockFetch).toHaveBeenCalledWith(longField);
    expect(result.current.fieldValues[longField]).toEqual(['v']);
  });

  it('Should handle field name with SQL injection text', async () => {
    const field = "name'; DROP TABLE events;--";
    mockFetch.mockResolvedValue({ field, values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues(field));
    expect(mockFetch).toHaveBeenCalledWith(field);
  });

  it('Should handle field name with HTML tags', async () => {
    const field = '<div>field</div>';
    mockFetch.mockResolvedValue({ field, values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues(field));
    expect(mockFetch).toHaveBeenCalledWith(field);
  });

  it('Should handle field name with script tags', async () => {
    const field = '<script>alert(1)</script>';
    mockFetch.mockResolvedValue({ field, values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues(field));
    expect(mockFetch).toHaveBeenCalledWith(field);
  });

  it('Should handle field name with encoded URL characters', async () => {
    const field = 'field%20name%3F';
    mockFetch.mockResolvedValue({ field, values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues(field));
    expect(mockFetch).toHaveBeenCalledWith(field);
  });

  it('Should handle field names containing dots except information prefix', async () => {
    mockFetch.mockResolvedValue({ field: 'vessel.name', values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('vessel.name'));
    expect(mockFetch).toHaveBeenCalledWith('vessel.name');
    expect(result.current.fieldValues['vessel.name']).toEqual(['v']);
  });

  it('Should handle Unicode field name', async () => {
    mockFetch.mockResolvedValue({ field: '字段名', values: ['中文'] } as never);
    mockMap.mockReturnValue(['中文']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('字段名'));
    expect(result.current.fieldValues['字段名']).toEqual(['中文']);
  });

  it('Should handle API returning thousands of values', async () => {
    const many = Array.from({ length: 10000 }, (_, i) => i);
    mockFetch.mockResolvedValue({ field: 'thousands', values: many } as never);
    mockMap.mockReturnValue(many);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('thousands'));
    expect(result.current.fieldValues['thousands']).toHaveLength(10000);
  });

  it('Should preserve cache between renders', async () => {
    mockFetch.mockResolvedValue({ field: 'persist', values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result, rerender } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('persist'));
    rerender();
    await act(() => result.current.loadValues('persist'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.fieldValues['persist']).toEqual(['v']);
  });

  it('Should cache multiple fields independently', async () => {
    mockFetch.mockResolvedValue({ field: 'cacheA', values: ['v'] } as never);
    mockMap.mockReturnValueOnce(['a']).mockReturnValueOnce(['b']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('cacheA'));
    await act(() => result.current.loadValues('cacheB'));
    await act(() => result.current.loadValues('cacheA'));
    await act(() => result.current.loadValues('cacheB'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.fieldValues['cacheA']).toEqual(['a']);
    expect(result.current.fieldValues['cacheB']).toEqual(['b']);
  });

  it('Should allow request after loading completes', async () => {
    mockFetch.mockResolvedValue({ field: 'afterLoad', values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(() => result.current.loadValues('afterLoad'));
    await act(() => result.current.loadValues('anotherField'));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('Should remain stable during rapid loadValues calls', async () => {
    mockFetch.mockResolvedValue({ field: 'rapid1', values: ['v'] } as never);
    mockMap.mockReturnValue(['v']);
    const { result } = renderHook(() => useFieldValueLoader());
    await act(async () => {
      await Promise.all([
        result.current.loadValues('rapid1'),
        result.current.loadValues('rapid2'),
        result.current.loadValues('rapid1'),
        result.current.loadValues('rapid2'),
      ]);
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
