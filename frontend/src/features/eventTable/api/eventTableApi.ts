import axiosInstance from '@/shared/api/client';
import type {
  EventListApiResponse,
  EventMetadataApiResponse,
  MetadataValueApiResponse,
  CompoundConfigListApiResponse,
  CompoundInstanceListApiResponse,
} from './types';

export interface FetchEventsParams {
  limit: number;
  offset: number;
  searchQuery?: string;
  filters?: string;    // JSON-stringified filter array
  eventId?: string;    // for direct-ID navigation via URL
}

export async function fetchEvents(params: FetchEventsParams): Promise<EventListApiResponse> {
  const query: Record<string, unknown> = {
    limit: params.limit,
    offset: params.offset,
  };
  if (params.eventId)    query.id      = params.eventId;
  if (params.searchQuery?.trim()) query.q = params.searchQuery.trim();
  if (params.filters)    query.filters  = params.filters;

  const res = await axiosInstance.get('/api/mongo-events/list', { params: query });
  return res.data;
}

export async function fetchEventMetadata(): Promise<EventMetadataApiResponse> {
  const res = await axiosInstance.get('/api/mongo-events/metadata');
  return res.data;
}

export async function fetchEventMetadataValues(field: string): Promise<MetadataValueApiResponse> {
  const res = await axiosInstance.get('/api/mongo-events/metadata/values', {
    params: { field },
  });
  return res.data;
}

export interface FetchCompoundConfigsParams {
  limit: number;
  offset: number;
  searchQuery?: string;
}

export async function fetchCompoundConfigs(
  params: FetchCompoundConfigsParams,
): Promise<CompoundConfigListApiResponse> {
  const query: Record<string, unknown> = {
    limit: params.limit,
    offset: params.offset,
  };
  if (params.searchQuery?.trim()) query.q = params.searchQuery.trim();

  const res = await axiosInstance.get('/api/compound-events/list', { params: query });
  return res.data;
}

export interface FetchCompoundInstancesParams {
  configId: string;
  limit: number;
  offset: number;
}

export async function fetchCompoundInstances(
  params: FetchCompoundInstancesParams,
): Promise<CompoundInstanceListApiResponse> {
  const res = await axiosInstance.get(
    `/api/compound-events/${params.configId}/instances`,
    { params: { limit: params.limit, offset: params.offset } },
  );
  return res.data;
}
