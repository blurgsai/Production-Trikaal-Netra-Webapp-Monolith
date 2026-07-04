import { createContext } from "react";
import type { UserSession } from "../model/types";

interface AuthContextValue {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  role: string | null;
  logoutUser: () => void;
  login: (session: UserSession) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export type { AuthContextValue };
