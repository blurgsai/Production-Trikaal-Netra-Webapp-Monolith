import type {
  DatabaseUpload,
  VesselImage,
} from "./dataManagementTypes";
import type {
  DatabaseUploadApiResponse,
  VesselImageApiResponse,
} from "./dataManagementApiTypes";

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
