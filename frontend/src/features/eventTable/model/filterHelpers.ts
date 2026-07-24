import type { EventFilter, FilterOperator, FilterRow } from './types';
import { generateUUID } from '@/shared/utils/uuid';

const RESERVED_PARAMS = new Set(['q', 'page', 'rows', 'id']);

const OPERATOR_PREFIX_MAP: Array<[string, FilterOperator]> = [
  ['contains:', 'contains'],
  ['starts:',   'startsWith'],
  ['ends:',     'endsWith'],
  ['>=',        'gte'],
  ['<=',        'lte'],
  ['!=',        'ne'],
  ['>',         'gt'],
  ['<',         'lt'],
  ['=',         'eq'],
];

function parseOperator(raw: string): { operator: FilterOperator; value: string } {
  for (const [prefix, operator] of OPERATOR_PREFIX_MAP) {
    if (raw.startsWith(prefix)) {
      return { operator, value: raw.slice(prefix.length).trim() };
    }
  }
  return { operator: 'eq', value: raw.trim() };
}

/**
 * Converts URL search params → EventFilter[].
 * Combines gte + lte on the same field into a single "between" filter.
 * Skips unknown params (not in metadataFields) and information.* fields.
 */
export function parseUrlToFilters(
  searchParams: URLSearchParams,
  metadataFields: string[],
): EventFilter[] {
  const fieldsSet = new Set(metadataFields);
  const temp: Record<string, { gte: string | null; lte: string | null; others: EventFilter[] }> = {};

  for (const [rawKey, rawValue] of searchParams.entries()) {
    if (RESERVED_PARAMS.has(rawKey)) continue;

    // Resolve field name: try as-is, then underscore→dot
    let field = rawKey;
    if (!fieldsSet.has(rawKey)) {
      const dotted = rawKey.replaceAll('_', '.');
      if (fieldsSet.has(dotted)) {
        field = dotted;
      } else {
        continue;
      }
    }

    if (field === 'information' || field.startsWith('information.')) continue;

    const rawStr = String(rawValue ?? '').trim();
    if (!rawStr) continue;

    const { operator, value } = parseOperator(rawStr);
    if (!value) continue;

    temp[field] ??= { gte: null, lte: null, others: [] };

    if (operator === 'gte') {
      temp[field].gte = value;
    } else if (operator === 'lte') {
      temp[field].lte = value;
    } else {
      temp[field].others.push({ field, operator, value });
    }
  }

  const filters: EventFilter[] = [];
  for (const field of Object.keys(temp)) {
    const { gte, lte, others } = temp[field];
    if (gte && lte) {
      filters.push({ field, operator: 'between', value: gte, value2: lte });
    } else {
      if (gte) filters.push({ field, operator: 'gte', value: gte });
      if (lte) filters.push({ field, operator: 'lte', value: lte });
    }
    filters.push(...others);
  }

  return filters;
}

/**
 * Converts EventFilter[] → URLSearchParams entries (for writing filters back to URL).
 */
export function filtersToUrlParams(filters: EventFilter[]): Record<string, string[]> {
  const params: Record<string, string[]> = {};

  const append = (key: string, value: string) => {
    const urlKey = key.replaceAll('.', '_');
    params[urlKey] ??= [];
    params[urlKey].push(value);
  };

  for (const f of filters) {
    if (!f.field || !f.value) continue;
    switch (f.operator) {
      case 'between':
        if (f.value)  append(f.field, `>=${f.value}`);
        if (f.value2) append(f.field, `<=${f.value2}`);
        break;
      case 'gte':        append(f.field, `>=${f.value}`);         break;
      case 'lte':        append(f.field, `<=${f.value}`);         break;
      case 'ne':         append(f.field, `!=${f.value}`);         break;
      case 'gt':         append(f.field, `>${f.value}`);          break;
      case 'lt':         append(f.field, `<${f.value}`);          break;
      case 'contains':   append(f.field, `contains:${f.value}`);  break;
      case 'startsWith': append(f.field, `starts:${f.value}`);    break;
      case 'endsWith':   append(f.field, `ends:${f.value}`);      break;
      default:           append(f.field, f.value);                 break;
    }
  }

  return params;
}

// ── Filter row editing (AtomicEventFilters popover) ─────────────────────────────

/**
 * A filter row is ready to submit once it has a field, operator, and value —
 * and, for the 'between' operator, a second value too. This is the single
 * source of truth for row validity — used both to enable/disable "Apply" and
 * to decide which rows actually get submitted, so the two can never disagree.
 */
export function isValidFilterRow(row: FilterRow): boolean {
  if (!row.field || !row.operator || !row.value) return false;
  return row.operator !== 'between' || !!row.value2;
}

/**
 * Converts applied EventFilter[] → editable FilterRow[] for the filter popover.
 * Each row gets a fresh client-side id — EventFilter itself has no row identity.
 */
export function filtersToRows(filters: EventFilter[]): FilterRow[] {
  return filters.map(f => ({
    id: generateUUID(),
    field: f.field,
    operator: f.operator,
    value: f.value,
    value2: f.value2 ?? '',
  }));
}

/**
 * Converts editable FilterRow[] → EventFilter[], dropping incomplete rows.
 */
export function rowsToFilters(rows: FilterRow[]): EventFilter[] {
  return rows.filter(isValidFilterRow).map(r => ({
    field: r.field,
    operator: r.operator as FilterOperator,
    value: r.value,
    ...(r.value2 ? { value2: r.value2 } : {}),
  }));
}

/**
 * Merges two value lists (e.g. known unique values + freshly-loaded ones) and
 * removes duplicates, preserving first-seen order.
 */
export function mergeUniqueValues(
  a: (string | number)[],
  b: (string | number)[],
): (string | number)[] {
  return [...a, ...b].filter((v, i, arr) => arr.indexOf(v) === i);
}
