import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import type { ReactNode } from "react";

interface AdminRouteProps {
  children: ReactNode;
}

function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/map" replace />;
  }

  return children;
}

export default AdminRoute;
