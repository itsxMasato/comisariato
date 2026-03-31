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

  // Empleados y Usuarios regulares no tienen acceso web
  if (role === ROLES.EMPLEADO || role === "Usuario") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-white mb-4">Acceso Denegado</h1>
        <p className="text-slate-400 text-center">
          Esta plataforma web es exclusiva de administración.<br/>
          Por favor, utilice la App Móvil para acceder a su perfil de empleado.
        </p>
      </div>
    );
  }

  return children;
}
