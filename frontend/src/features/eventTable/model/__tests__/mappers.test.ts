import { describe, it, expect } from 'vitest';
import {
  mapEventFromApi,
  mapMetadataColumnFromApi,
  mapCompoundConfigFromApi,
  mapCompoundInstanceFromApi,
} from '../mappers';
import type {
  EventApiResponse,
  MetadataColumnRaw,
  CompoundConfigApiResponse,
  CompoundInstanceApiResponse,
} from '../../api/types';

// ── mapEventFromApi ───────────────────────────────────────────────────────────

describe('mapEventFromApi', () => {
  const raw: EventApiResponse = {
    id:               'abc123',
    type:             'dark_ship',
    severity:         'high',
    status:           'active',
    timestamp:        '2024-01-15T10:00:00.000Z',
    start_time:       '2024-01-15T09:00:00.000Z',
    end_time:         '2024-01-15T11:00:00.000Z',
    vessels_involved: ['123456789', '987654321'],
    location:         null,
    temporality:      'past',
    event_source:     'ais',
    model:            'v1',
    compound:         false,
    constituent_types: [],
  };

  it('maps snake_case API fields to camelCase domain fields', () => {
    const result = mapEventFromApi(raw);

    expect(result.id).toBe('abc123');
    expect(result.type).toBe('dark_ship');
    expect(result.severity).toBe('high');
    expect(result.status).toBe('active');
    expect(result.timestamp).toBe('2024-01-15T10:00:00.000Z');
    expect(result.startTime).toBe('2024-01-15T09:00:00.000Z');   // start_time → startTime
    expect(result.endTime).toBe('2024-01-15T11:00:00.000Z');     // end_time → endTime
    expect(result.vessels).toEqual(['123456789', '987654321']);   // vessels_involved → vessels
    expect(result.compound).toBe(false);
    expect(result.constituentTypes).toEqual([]);                  // constituent_types → constituentTypes
  });

  it('does not expose raw API field names in the domain object', () => {
    const result = mapEventFromApi(raw) as Record<string, unknown>;

    expect(result['start_time']).toBeUndefined();
    expect(result['end_time']).toBeUndefined();
    expect(result['vessels_involved']).toBeUndefined();
    expect(result['constituent_types']).toBeUndefined();
  });

  it('defaults missing optional fields safely', () => {
    const minimal = {
      ...raw,
      vessels_involved:  undefined as unknown as string[],
      constituent_types: undefined as unknown as string[],
      compound:          undefined as unknown as boolean,
      start_time:        null,
      end_time:          null,
    };
    const result = mapEventFromApi(minimal);

    expect(result.vessels).toEqual([]);
    expect(result.constituentTypes).toEqual([]);
    expect(result.compound).toBe(false);
    expect(result.startTime).toBeNull();
    expect(result.endTime).toBeNull();
  });

  it('correctly maps a compound event', () => {
    const compound: EventApiResponse = {
      ...raw,
      compound:         true,
      constituent_types: ['dark_ship', 'signal_lost'],
    };
    const result = mapEventFromApi(compound);

    expect(result.compound).toBe(true);
    expect(result.constituentTypes).toEqual(['dark_ship', 'signal_lost']);
  });
});

// ── mapMetadataColumnFromApi ──────────────────────────────────────────────────

describe('mapMetadataColumnFromApi', () => {
  const raw: MetadataColumnRaw = {
    field:         'severity',
    label:         'Severity',
    type:          'string',
    filterable:    true,
    unique_values: ['low', 'medium', 'high', 'critical'],
  };

  it('maps all fields correctly', () => {
    const result = mapMetadataColumnFromApi(raw);

    expect(result.field).toBe('severity');
    expect(result.label).toBe('Severity');
    expect(result.type).toBe('string');
    expect(result.uniqueValues).toEqual(['low', 'medium', 'high', 'critical']); // unique_values → uniqueValues
  });

  it('does not expose unique_values raw field name', () => {
    const result = mapMetadataColumnFromApi(raw) as Record<string, unknown>;

    expect(result['unique_values']).toBeUndefined();
  });

  it('defaults missing unique_values to empty array', () => {
    const result = mapMetadataColumnFromApi({
      ...raw,
      unique_values: undefined as unknown as (string | number)[],
    });

    expect(result.uniqueValues).toEqual([]);
  });
});

// ── mapCompoundConfigFromApi ──────────────────────────────────────────────────

describe('mapCompoundConfigFromApi', () => {
  const raw: CompoundConfigApiResponse = {
    id:               '6a2f00502219abf883685481',
    type:             'signal_port_intrusion',
    constituent_types: ['signal_lost', 'port_intrusion'],
    description:      'signal lost and port intrusion',
    severity:         'medium',
    start_time:       '2024-01-15T00:55:00.000Z',
    end_time:         '2026-06-15T00:56:00.000Z',
    timestamp:        '2026-06-14T19:26:08.353Z',
    compound:         true,
  };

  it('maps all fields correctly', () => {
    const result = mapCompoundConfigFromApi(raw);

    expect(result.id).toBe('6a2f00502219abf883685481');
    expect(result.type).toBe('signal_port_intrusion');
    expect(result.constituentTypes).toEqual(['signal_lost', 'port_intrusion']);
    expect(result.description).toBe('signal lost and port intrusion');
    expect(result.severity).toBe('medium');
    expect(result.startTime).toBe('2024-01-15T00:55:00.000Z');
    expect(result.endTime).toBe('2026-06-15T00:56:00.000Z');
    expect(result.timestamp).toBe('2026-06-14T19:26:08.353Z');
  });

  it('does not expose raw field names', () => {
    const result = mapCompoundConfigFromApi(raw) as Record<string, unknown>;

    expect(result['constituent_types']).toBeUndefined();
    expect(result['start_time']).toBeUndefined();
    expect(result['end_time']).toBeUndefined();
  });
});

// ── mapCompoundInstanceFromApi ────────────────────────────────────────────────

describe('mapCompoundInstanceFromApi', () => {
  const raw: CompoundInstanceApiResponse = {
    id:                 'inst001',
    config_id:          'cfg001',
    config_name:        'Dark Ship + Signal Lost',
    constituent_types:  ['dark_ship', 'signal_lost'],
    vessels_involved:   ['123456789'],
    start_time:         '2024-01-16T11:42:00.000Z',
    end_time:           '2025-01-16T11:42:00.000Z',
    severity:           'medium',
    constituent_events: {},
  };

  it('maps all fields correctly', () => {
    const result = mapCompoundInstanceFromApi(raw);

    expect(result.id).toBe('inst001');
    expect(result.configId).toBe('cfg001');             // config_id → configId
    expect(result.configName).toBe('Dark Ship + Signal Lost'); // config_name → configName
    expect(result.constituentTypes).toEqual(['dark_ship', 'signal_lost']);
    expect(result.vessels).toEqual(['123456789']);       // vessels_involved → vessels
    expect(result.startTime).toBe('2024-01-16T11:42:00.000Z');
    expect(result.endTime).toBe('2025-01-16T11:42:00.000Z');
    expect(result.severity).toBe('medium');
  });

  it('does not expose raw field names', () => {
    const result = mapCompoundInstanceFromApi(raw) as Record<string, unknown>;

    expect(result['config_id']).toBeUndefined();
    expect(result['config_name']).toBeUndefined();
    expect(result['vessels_involved']).toBeUndefined();
    expect(result['constituent_types']).toBeUndefined();
    expect(result['start_time']).toBeUndefined();
    expect(result['end_time']).toBeUndefined();
  });
});
