import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import { RoleRoute } from "../auth/AdminRoute";
import { MODULES } from "../utils/roles";
import { Toaster } from "sonner";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Error403 from "../pages/Error403";
import Perfil from "../pages/Perfil";
import { useAuth } from "../auth/AuthProvider";
import AppMovil from "../pages/AppMovil"; // App Móvil Landing

import { hasPermission } from "../utils/roles";

const HomeRedirect = () => {
  const { role, loading } = useAuth();
  
  if (loading) return null;

  if (hasPermission(role, MODULES.DASHBOARD, "VIEW")) {
    return <Navigate to="/dashboard" replace />;
  } else if (hasPermission(role, MODULES.APP_MOVIL, "VIEW")) {
    return <Navigate to="/app-movil" replace />;
  }
  
  return <Navigate to="/403" replace />;
};

// Productos
import Productos from "../pages/Productos";

// Empleados
import Empleados from "../pages/Empleados";

// Créditos
import Creditos from "../pages/Creditos";
import NuevoCredito from "../pages/NuevoCredito";

// Cuotas
import Cuotas from "../pages/Cuotas";
import RegistrarPago from "../pages/RegistrarPago";

// Reservas
import Reservas from "../pages/Reservas";

// Usuarios del sistema (solo admin)
import Usuarios from "../pages/Usuarios";

// Bitacora (solo admin)
import Bitacora from "../pages/Bitacora";

// Datos Variables (solo admin)
import DatosVariables from "../pages/DatosVariables";

export default function AppRouter() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Protegidas bajo AdminLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/" element={<HomeRedirect />} />
          
          <Route path="/dashboard" element={
            <RoleRoute moduleName={MODULES.DASHBOARD}>
              <Dashboard />
            </RoleRoute>
          } />

          <Route path="/app-movil" element={
            <RoleRoute moduleName={MODULES.APP_MOVIL}>
              <AppMovil />
            </RoleRoute>
          } />
          <Route path="/perfil" element={<Perfil />} />

          {/* Productos */}
          <Route path="/productos" element={
            <RoleRoute moduleName={MODULES.PRODUCTOS}>
              <Productos />
            </RoleRoute>
          } />

          {/* Empleados */}
          <Route path="/empleados" element={
            <RoleRoute moduleName={MODULES.EMPLEADOS}>
              <Empleados />
            </RoleRoute>
          } />

          {/* Créditos */}
          <Route path="/creditos" element={
            <RoleRoute moduleName={MODULES.CREDITOS} requiredAction={"VIEW"}>
              <Creditos />
            </RoleRoute>
          } />
          <Route path="/creditos/nuevo" element={
            <RoleRoute moduleName={MODULES.CREDITOS} requiredAction={"CREATE"}>
              <NuevoCredito />
            </RoleRoute>
          } />

          {/* Cuotas / Pagos */}
          <Route path="/cuotas" element={
            <RoleRoute moduleName={MODULES.CUOTAS} requiredAction={"VIEW"}>
              <Cuotas />
            </RoleRoute>
          } />
          <Route path="/cuotas/pagar" element={
            <RoleRoute moduleName={MODULES.CUOTAS} requiredAction={"EDIT"}>
              <RegistrarPago />
            </RoleRoute>
          } />

          {/* Reservas (app móvil → portal) */}
          <Route path="/reservas" element={
            <RoleRoute moduleName={MODULES.RESERVAS}>
              <Reservas />
            </RoleRoute>
          } />

          {/* Usuarios del sistema — solo admin */}
          <Route
            path="/usuarios"
            element={
              <RoleRoute moduleName={MODULES.USUARIOS}>
                <Usuarios />
              </RoleRoute>
            }
          />
          <Route
            path="/bitacora"
            element={
              <RoleRoute moduleName={MODULES.BITACORA}>
                <Bitacora />
              </RoleRoute>
            }
          />
          <Route
            path="/datosvariables"
            element={
              <RoleRoute moduleName={MODULES.PARAMETROS}>
                <DatosVariables />
              </RoleRoute>
            }
          />

          {/* 403 para rutas protegidas sin permiso */}
          <Route path="/403" element={<Error403 />} />

          {/* Catch-all dentro del layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

          {/* Catch-all global */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
