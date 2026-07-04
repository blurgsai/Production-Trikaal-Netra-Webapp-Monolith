import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "@/shared/api";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import type { UserSession } from "../model/types";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");

  const login = (session: UserSession) => {
    localStorage.setItem("token", session.token);
    localStorage.setItem("role", session.role);
    localStorage.setItem("user_id", session.userId);
    localStorage.setItem("username", session.username);
    setToken(session.token);
  };

  const logoutUser = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    setToken(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const authenticateUser = useCallback(async () => {
    try {
      await axiosInstance.get("/users/auth");
    } catch {
      logoutUser();
    }
  }, [logoutUser]);

  useEffect(() => {
    if (token) {
      authenticateUser();
    }
  }, [token, authenticateUser]);

  const value: AuthContextValue = {
    isAuthenticated: !!token && token !== "undefined" && token !== "null",
    token,
    username,
    role,
    logoutUser,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
