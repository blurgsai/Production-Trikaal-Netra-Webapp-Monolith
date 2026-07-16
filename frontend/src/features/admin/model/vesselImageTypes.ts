export interface VesselImage {
  id: string;
  imo: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface PaginatedVesselImages {
  items: VesselImage[];
  total: number;
}

export interface VesselImageCreateRequest {
  files: File[];
  imos: string[];
}

export interface VesselImageUpdateRequest {
  imo: string;
}
