import type { UserApiResponse } from "../api/types";
import type { BaseMapAdminApiResponse } from "../api/basemapsApi";
import type { OverlayAdminApiResponse } from "../api/overlaysApi";
import type { User, BaseMap, Overlay } from "./types";

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
    createdAt: raw.created_at,
  };
}

export function mapOverlaysFromApi(raw: OverlayAdminApiResponse[]): Overlay[] {
  return raw.map(mapOverlayFromApi);
}
