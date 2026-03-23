import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import { AdminRoute } from "../auth/AdminRoute";
import { Toaster } from "sonner";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Error403 from "../pages/Error403";

// Productos
import Productos from "../pages/productos/Productos";

// Empleados
import Empleados from "../pages/empleados/Empleados";

// Créditos
import Creditos from "../pages/creditos/Creditos";
import NuevoCredito from "../pages/creditos/NuevoCredito";
import DetalleCredito from "../pages/creditos/DetalleCredito";

// Cuotas
import Cuotas from "../pages/cuotas/Cuotas";
import RegistrarPago from "../pages/cuotas/RegistrarPago";

// Reservas
import Reservas from "../pages/reservas/Reservas";

// Usuarios del sistema (solo admin)
import Usuarios from "../pages/usuarios/Usuarios";

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
          <Route path="creditos/:id" element={<DetalleCredito />} />

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
