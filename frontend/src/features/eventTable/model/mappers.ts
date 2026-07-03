import type {
  EventApiResponse,
  MetadataColumnRaw,
  MetadataValueApiResponse,
  CompoundConfigApiResponse,
  CompoundInstanceApiResponse,
} from '../api/types';
import type {
  Event,
  EventMetadataColumn,
  CompoundConfig,
  CompoundInstance,
} from './types';

export function mapEventFromApi(raw: EventApiResponse): Event {
  return {
    id:               raw.id,
    type:             raw.type,
    severity:         raw.severity,
    status:           raw.status,
    timestamp:        raw.timestamp,
    startTime:        raw.start_time,
    endTime:          raw.end_time,
    vessels:          raw.vessels_involved ?? [],
    compound:         raw.compound ?? false,
    constituentTypes: raw.constituent_types ?? [],
  };
}

export function mapMetadataColumnFromApi(raw: MetadataColumnRaw): EventMetadataColumn {
  return {
    field:        raw.field,
    label:        raw.label,
    type:         raw.type,
    uniqueValues: raw.unique_values ?? [],
  };
}

export function mapCompoundConfigFromApi(raw: CompoundConfigApiResponse): CompoundConfig {
  return {
    id:               raw.id,
    type:             raw.type,
    constituentTypes: raw.constituent_types ?? [],
    description:      raw.description,
    severity:         raw.severity,
    startTime:        raw.start_time,
    endTime:          raw.end_time,
    timestamp:        raw.timestamp,
  };
}

export function mapMetadataValuesFromApi(raw: MetadataValueApiResponse): (string | number)[] {
  return (raw.values ?? []).filter(
    (v): v is string | number => typeof v === 'string' || typeof v === 'number',
  );
}

export function mapCompoundInstanceFromApi(raw: CompoundInstanceApiResponse): CompoundInstance {
  return {
    id:               raw.id,
    configId:         raw.config_id,
    configName:       raw.config_name,
    constituentTypes: raw.constituent_types ?? [],
    vessels:          raw.vessels_involved ?? [],
    startTime:        raw.start_time,
    endTime:          raw.end_time,
    severity:         raw.severity,
  };
}
