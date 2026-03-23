import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function SideBar() {
  const { logout, role } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  const linkClass = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
      isActive 
      ? "bg-green-100 text-green-900 shadow-sm" 
      : "text-gray-600 hover:bg-green-50 hover:text-green-800"
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full shadow-sm z-10 shrink-0">
      <div className="p-6">
        <h2 className="text-2xl font-extrabold text-green-800 tracking-tight font-headline flex items-center gap-2">
          <span className="material-symbols-outlined text-green-700">agriculture</span>
          Comisariato
        </h2>
        <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest px-1">
          {role || 'Portal Admin'}
        </p>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-4 mt-2 overflow-y-auto w-full">
        <NavLink to="/" end className={linkClass}>
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </NavLink>
        <NavLink to="/productos" className={linkClass}>
          <span className="material-symbols-outlined">inventory_2</span>
          Productos
        </NavLink>
        <NavLink to="/empleados" className={linkClass}>
          <span className="material-symbols-outlined">group</span>
          Empleados
        </NavLink>
        <NavLink to="/creditos" className={linkClass}>
          <span className="material-symbols-outlined">credit_card</span>
          Créditos
        </NavLink>
        <NavLink to="/cuotas" className={linkClass}>
          <span className="material-symbols-outlined">payments</span>
          Cuotas
        </NavLink>
        <NavLink to="/reservas" className={linkClass}>
          <span className="material-symbols-outlined">event</span>
          Reservas
        </NavLink>

        {role === "Administrador" && (
          <>
            <div className="mt-4 mb-2 px-4 text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider">
              Administración
            </div>
            <NavLink to="/usuarios" className={linkClass}>
              <span className="material-symbols-outlined">admin_panel_settings</span>
              Usuarios
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100 mt-auto w-full">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors font-medium border border-transparent hover:border-red-100"
        >
          <span className="material-symbols-outlined">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}