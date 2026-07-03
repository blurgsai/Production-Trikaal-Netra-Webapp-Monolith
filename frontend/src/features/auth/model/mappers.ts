import type { LoginApiResponse } from "../api/types";
import type { UserSession } from "./types";

export function mapLoginResponseToSession(raw: LoginApiResponse): UserSession {
  return {
    token: raw.token,
    role: raw.role,
    userId: raw.user_id,
    username: raw.username,
  };
}
