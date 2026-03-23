import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function SideBar({ isOpen, setIsOpen }) {
  const { logout, role, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  const linkClass = ({ isActive }) =>
    isActive
      ? "bg-slate-50 text-green-900 rounded-l-full ml-4 font-bold shadow-sm px-6 py-3 flex items-center gap-3 transition-all"
      : "text-green-100/70 hover:text-white px-6 py-3 flex items-center gap-3 transition-colors hover:bg-green-900/50";

  return (
    <>
      {/* Botón Flotante para Ocultar/Mostrar (Pegado al borde) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-6 z-50 bg-green-950 text-white p-2 rounded-r-xl shadow-lg transition-all duration-300 hover:bg-green-900 focus:outline-none flex items-center justify-center ${
          isOpen ? "left-64" : "left-0"
        }`}
        title={isOpen ? "Ocultar menú" : "Mostrar menú"}
      >
        <span className="material-symbols-outlined text-green-300">
          {isOpen ? "chevron_left" : "menu"}
        </span>
      </button>

      {/* Overlay oscuro para móviles cuando está abierto */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 h-full flex flex-col z-40 w-64 bg-green-950 shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="px-6 py-8">
          <h1
            className="text-xl font-bold text-white tracking-tight flex items-center gap-2"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            <span className="material-symbols-outlined text-green-300">
              agriculture
            </span>
            Comisariato
          </h1>
          <p className="text-sm font-medium text-green-100/60 mt-1">
            {role || "Admin Portal"}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-4 space-y-1 overflow-y-auto">
          <NavLink to="/" end className={linkClass}>
            <span className="material-symbols-outlined">dashboard</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Dashboard
            </span>
          </NavLink>
          <NavLink to="/productos" className={linkClass}>
            <span className="material-symbols-outlined">inventory_2</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Productos
            </span>
          </NavLink>
          <NavLink to="/empleados" className={linkClass}>
            <span className="material-symbols-outlined">group</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Empleados
            </span>
          </NavLink>
          <NavLink to="/creditos" className={linkClass}>
            <span className="material-symbols-outlined">credit_card</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Créditos
            </span>
          </NavLink>
          <NavLink to="/cuotas" className={linkClass}>
            <span className="material-symbols-outlined">payments</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Cuotas
            </span>
          </NavLink>
          <NavLink to="/reservas" className={linkClass}>
            <span className="material-symbols-outlined">event</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Reservas
            </span>
          </NavLink>

          {/* Admin section */}
          {role === "Administrador" && (
            <>
              <div className="mt-6 mb-2 px-6 text-[0.65rem] font-bold text-green-100/40 uppercase tracking-wider">
                Administración
              </div>
              <NavLink to="/usuarios" className={linkClass}>
                <span className="material-symbols-outlined">
                  admin_panel_settings
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  Usuarios
                </span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User + Logout */}
        <div className="p-6 border-t border-green-900/30 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-800 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-green-200 text-xl">
                person
              </span>
            </div>
            <div className="overflow-hidden">
              <p
                className="text-white text-sm font-bold truncate"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {user?.displayName || "Admin"}
              </p>
              <p className="text-green-100/50 text-xs truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors font-medium border border-transparent hover:border-red-900/40"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span
              className="text-sm font-medium"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
