import { Navigate } from "react-router-dom";
import { setLogoutFunction } from "@/shared/api";
import { useAuth } from "@/features/auth";
import type { ReactNode } from "react";

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  const { logoutUser, isAuthenticated } = useAuth();

  setLogoutFunction(logoutUser);

  if (isAuthenticated) {
    return <Navigate to="/map" replace />;
  }

  return children;
}

export default PublicRoute;
