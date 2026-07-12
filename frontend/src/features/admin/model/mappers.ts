import type { UserApiResponse } from "../api/types";
import type { User } from "./types";

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
