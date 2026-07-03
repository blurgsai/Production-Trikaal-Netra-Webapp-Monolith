import { describe, it, expect } from 'vitest';
import { parseUrlToFilters, filtersToUrlParams } from '../filterHelpers';
import type { EventFilter } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeParams(entries: Record<string, string | string[]>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, val] of Object.entries(entries)) {
    if (Array.isArray(val)) val.forEach(v => p.append(key, v));
    else p.set(key, val);
  }
  return p;
}

const FIELDS = ['type', 'severity', 'timestamp', 'vessels_involved', 'some.field'];

// ── parseUrlToFilters ─────────────────────────────────────────────────────────

describe('parseUrlToFilters', () => {
  it('parses a simple equality filter', () => {
    const result = parseUrlToFilters(makeParams({ type: 'dark_ship' }), FIELDS);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ field: 'type', operator: 'eq', value: 'dark_ship' });
  });

  it('skips reserved params: q, page, rows, id', () => {
    const result = parseUrlToFilters(
      makeParams({ q: 'search', page: '2', rows: '25', id: 'abc', type: 'dark_ship' }),
      FIELDS,
    );

    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('type');
  });

  it('skips fields not in metadata', () => {
    const result = parseUrlToFilters(makeParams({ unknown_garbage: 'value' }), FIELDS);

    expect(result).toHaveLength(0);
  });

  it('skips information and information.* fields', () => {
    const fields = [...FIELDS, 'information', 'information.threshold'];
    const result = parseUrlToFilters(
      makeParams({ 'information': '5', 'information_threshold': '10' }),
      fields,
    );

    expect(result).toHaveLength(0);
  });

  it('resolves underscore URL key to dotted field name when it exists in metadata', () => {
    const result = parseUrlToFilters(makeParams({ some_field: 'value' }), FIELDS);

    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('some.field');
  });

  it.each([
    ['>=10',       'gte',        '10'],
    ['<=10',       'lte',        '10'],
    ['!=10',       'ne',         '10'],
    ['>10',        'gt',         '10'],
    ['<10',        'lt',         '10'],
    ['contains:fo','contains',   'fo'],
    ['starts:fo',  'startsWith', 'fo'],
    ['ends:fo',    'endsWith',   'fo'],
  ])('parses operator prefix "%s" → operator "%s", value "%s"', (raw, operator, value) => {
    const result = parseUrlToFilters(makeParams({ severity: raw }), FIELDS);

    expect(result[0].operator).toBe(operator);
    expect(result[0].value).toBe(value);
  });

  it('combines gte + lte on the same field into a single "between" filter', () => {
    const result = parseUrlToFilters(
      makeParams({ timestamp: ['>=2024-01-01', '<=2024-12-31'] }),
      FIELDS,
    );

    expect(result).toHaveLength(1);
    expect(result[0].operator).toBe('between');
    expect(result[0].value).toBe('2024-01-01');
    expect(result[0].value2).toBe('2024-12-31');
  });

  it('keeps gte and lte as separate filters when only one is present', () => {
    const result = parseUrlToFilters(
      makeParams({ timestamp: '>=2024-01-01' }),
      FIELDS,
    );

    expect(result).toHaveLength(1);
    expect(result[0].operator).toBe('gte');
  });

  it('skips entries with empty value after operator stripping', () => {
    const result = parseUrlToFilters(makeParams({ type: '   ' }), FIELDS);

    expect(result).toHaveLength(0);
  });

  it('handles multiple filters on different fields', () => {
    const result = parseUrlToFilters(
      makeParams({ type: 'dark_ship', severity: 'high' }),
      FIELDS,
    );

    expect(result).toHaveLength(2);
    const fields = result.map(r => r.field);
    expect(fields).toContain('type');
    expect(fields).toContain('severity');
  });
});

// ── filtersToUrlParams ────────────────────────────────────────────────────────

describe('filtersToUrlParams', () => {
  it('serializes an eq filter', () => {
    const result = filtersToUrlParams([{ field: 'type', operator: 'eq', value: 'dark_ship' }]);

    expect(result['type']).toEqual(['dark_ship']);
  });

  it('serializes a between filter as >=value and <=value2 pair', () => {
    const result = filtersToUrlParams([
      { field: 'timestamp', operator: 'between', value: '2024-01-01', value2: '2024-12-31' },
    ]);

    expect(result['timestamp']).toContain('>=2024-01-01');
    expect(result['timestamp']).toContain('<=2024-12-31');
    expect(result['timestamp']).toHaveLength(2);
  });

  it.each([
    ['gte',        '>=10',       '10'],
    ['lte',        '<=10',       '10'],
    ['ne',         '!=10',       '10'],
    ['gt',         '>10',        '10'],
    ['lt',         '<10',        '10'],
    ['contains',   'contains:fo','fo'],
    ['startsWith', 'starts:fo',  'fo'],
    ['endsWith',   'ends:fo',    'fo'],
  ] as [string, string, string][])(
    'serializes operator "%s" as prefix "%s"',
    (operator, expectedSerialized, value) => {
      const result = filtersToUrlParams([
        { field: 'severity', operator: operator as EventFilter['operator'], value },
      ]);

      expect(result['severity']).toContain(expectedSerialized);
    },
  );

  it('converts dotted field names to underscored URL keys', () => {
    const result = filtersToUrlParams([{ field: 'some.field', operator: 'eq', value: 'x' }]);

    expect(result['some_field']).toEqual(['x']);
    expect(result['some.field']).toBeUndefined();
  });

  it('skips filters with empty value', () => {
    const result = filtersToUrlParams([{ field: 'type', operator: 'eq', value: '' }]);

    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ── Round-trip ────────────────────────────────────────────────────────────────

describe('round-trip: filtersToUrlParams → parseUrlToFilters', () => {
  it('recovers eq, ne, contains, startsWith, endsWith filters exactly', () => {
    const original: EventFilter[] = [
      { field: 'type',     operator: 'eq',         value: 'dark_ship' },
      { field: 'severity', operator: 'ne',         value: 'low' },
      { field: 'type',     operator: 'contains',   value: 'ship' },
      { field: 'type',     operator: 'startsWith', value: 'dark' },
      { field: 'type',     operator: 'endsWith',   value: 'ship' },
    ];

    const urlEntries = filtersToUrlParams(original);
    const params = makeParams(urlEntries);
    const recovered = parseUrlToFilters(params, FIELDS);

    expect(recovered).toHaveLength(original.length);
    expect(recovered).toEqual(expect.arrayContaining(original));
  });

  it('recovers a between filter exactly', () => {
    const original: EventFilter[] = [
      { field: 'timestamp', operator: 'between', value: '2024-01-01', value2: '2024-12-31' },
    ];

    const urlEntries = filtersToUrlParams(original);
    const params = makeParams(urlEntries);
    const recovered = parseUrlToFilters(params, FIELDS);

    expect(recovered).toEqual(original);
  });

  it('recovers gt and lt filters exactly', () => {
    const original: EventFilter[] = [
      { field: 'timestamp', operator: 'gt', value: '2024-01-01' },
      { field: 'timestamp', operator: 'lt', value: '2024-12-31' },
    ];

    const urlEntries = filtersToUrlParams(original);
    const params = makeParams(urlEntries);
    const recovered = parseUrlToFilters(params, FIELDS);

    expect(recovered).toEqual(original);
  });
});
