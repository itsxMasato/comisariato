import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import { AdminRoute } from "../auth/AdminRoute";
import { Toaster } from "sonner";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Error403 from "../pages/Error403";

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
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Productos */}
          <Route path="productos" element={<Productos />} />

          {/* Empleados */}
          <Route path="empleados" element={<Empleados />} />

          {/* Créditos */}
          <Route path="creditos" element={<Creditos />} />
          <Route path="creditos/nuevo" element={<NuevoCredito />} />

          {/* Cuotas / Pagos */}
          <Route path="cuotas" element={<Cuotas />} />
          <Route path="cuotas/pagar" element={<RegistrarPago />} />

          {/* Reservas (app móvil → portal) */}
          <Route path="reservas" element={<Reservas />} />

          {/* Usuarios del sistema — solo admin */}
          <Route
            path="usuarios"
            element={
              <AdminRoute>
                <Usuarios />
              </AdminRoute>
            }
          />
          <Route
            path="bitacora"
            element={
              <AdminRoute>
                <Bitacora />
              </AdminRoute>
            }
          />
          <Route
            path="datosvariables"
            element={
              <AdminRoute>
                <DatosVariables />
              </AdminRoute>
            }
          />

          {/* 403 para rutas protegidas sin permiso */}
          <Route path="403" element={<Error403 />} />

          {/* Catch-all dentro del layout */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Catch-all global */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
