// src/auth/ProtectedRoute.jsx
import { useAuth } from "./AuthProvider"; // O como exportes tu contexto
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;

  if (!user) {
    return <Navigate to="/Login" replace />;
  }

  return children;
}
