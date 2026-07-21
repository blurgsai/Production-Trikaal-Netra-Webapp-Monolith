import type { UserApiResponse } from "../api/types";
import type { BaseMapAdminApiResponse } from "../api/basemapsApi";
import type { OverlayAdminApiResponse } from "../api/overlaysApi";
import type { User, BaseMap, Overlay } from "./types";
import type { DatabaseUpload, VesselImage } from "./dataManagementTypes";
import type {
  DatabaseUploadApiResponse,
  VesselImageApiResponse,
} from "../api/dataManagementApi";

export function mapUserFromApi(raw: UserApiResponse): User {
  return {
    id: raw.id,
    username: raw.username,
    role: raw.role,
  };
}

export function mapUsersFromApi(raw: UserApiResponse[]): User[] {
  return raw.map(mapUserFromApi);
}

export function mapBaseMapFromApi(raw: BaseMapAdminApiResponse): BaseMap {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    sourceType: raw.source_type,
    tileUrl: raw.tile_url,
    attribution: raw.attribution,
    createdAt: raw.created_at,
  };
}

export function mapBaseMapsFromApi(raw: BaseMapAdminApiResponse[]): BaseMap[] {
  return raw.map(mapBaseMapFromApi);
}

export function mapOverlayFromApi(raw: OverlayAdminApiResponse): Overlay {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    sourceType: raw.source_type,
    tileUrl: raw.tile_url,
    attribution: raw.attribution,
    color: raw.color,
    opacity: raw.opacity,
    maxZoom: raw.max_zoom,
    createdAt: raw.created_at,
  };
}

export function mapOverlaysFromApi(raw: OverlayAdminApiResponse[]): Overlay[] {
  return raw.map(mapOverlayFromApi);
}

export function mapDatabaseUploadFromApi(
  api: DatabaseUploadApiResponse,
): DatabaseUpload {
  return {
    id: api._id,
    databaseName: api.database_name,
    mmsi: api.mmsi,
    data: api.data,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapDatabaseUploadsFromApi(
  apis: DatabaseUploadApiResponse[],
): DatabaseUpload[] {
  return apis.map(mapDatabaseUploadFromApi);
}

export function mapVesselImageFromApi(api: VesselImageApiResponse): VesselImage {
  return {
    id: api._id,
    imo: api.imo,
    fileName: api.file_name,
    fileSize: api.file_size,
    mimeType: api.mime_type,
    uploadedAt: api.uploaded_at,
    updatedAt: api.updated_at,
  };
}

export function mapVesselImagesFromApi(apis: VesselImageApiResponse[]): VesselImage[] {
  return apis.map(mapVesselImageFromApi);
}
