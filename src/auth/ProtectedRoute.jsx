// src/auth/ProtectedRoute.jsx
import { useAuth } from "./AuthProvider"; 
import { Navigate } from "react-router-dom";
import { ROLES } from "../utils/roles";

export default function ProtectedRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  if (!user) {
    return <Navigate to="/Login" replace />;
  }



  return children;
}
