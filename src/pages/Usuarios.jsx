import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

// --- AVATAR COMPONENT ---
function AvatarWithFallback({ name, img, size = "md" }) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };
  const colors = [
    "bg-emerald-600",
    "bg-teal-600",
    "bg-cyan-600",
    "bg-green-700",
    "bg-lime-600",
    "bg-sky-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [failed, setFailed] = useState(false);
  if (failed || !img) {
    return (
      <div
        className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-black text-white flex-shrink-0`}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      className={`${sizes[size]} rounded-full object-cover shadow-sm flex-shrink-0`}
      src={img}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}

// --- DATA ---
const ALL_PERMISSIONS = [
  "Usuarios",
  "Finanzas",
  "Inventario",
  "Logs",
  "Configuración",
  "Ventas",
  "Reportes",
  "Ver Usuarios",
  "Gestionar Créditos",
  "Stock",
  "Horarios",
  "Reservas",
  "Calendario",
];

const INITIAL_ROLES = [
  {
    id: 1,
    name: "SUPER ADMIN",
    permissions: [
      "Usuarios",
      "Finanzas",
      "Inventario",
      "Logs",
      "Configuración",
    ],
    estado: "Activo",
  },
  {
    id: 2,
    name: "ADMIN COMISARIATO",
    permissions: ["Inventario", "Ventas", "Reportes"],
    estado: "Activo",
  },
  {
    id: 3,
    name: "EDITOR CRÉDITOS",
    permissions: ["Ver Usuarios", "Gestionar Créditos"],
    estado: "Activo",
  },
  {
    id: 4,
    name: "EDITOR INVENTARIO",
    permissions: ["Inventario", "Stock"],
    estado: "Activo",
  },
  {
    id: 5,
    name: "EDITOR EMPLEADOS",
    permissions: ["Usuarios", "Horarios"],
    estado: "Activo",
  },
  {
    id: 6,
    name: "SUPERVISOR RESERVAS",
    permissions: ["Reservas", "Calendario"],
    estado: "Activo",
  },
];

// --- MODALS ---
function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirmar",
  confirmColor = "bg-rose-600 hover:bg-rose-700",
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
              <h3
                className="text-lg font-black text-slate-900 mb-2"
                style={{ fontFamily: "Manrope,sans-serif" }}
              >
                {title}
              </h3>
              <p className="text-sm text-slate-500 mb-8">{message}</p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all ${confirmColor}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Toast({ message, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-green-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-green-300 text-base">
            check_circle
          </span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- MAIN ---
export default function Usuarios() {
  const { userName, role: authRole } = useAuth();
  const [activeTab, setActiveTab] = useState("usuarios");

  const [usersData, setUsersData] = useState([]);
  const [rolesData, setRolesData] = useState([]);
  const [empleadosData, setEmpleadosData] = useState([]);

  useEffect(() => {
    const unsubU = onSnapshot(collection(db, "usuarios"), (s) =>
      setUsersData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubR = onSnapshot(collection(db, "roles"), (s) =>
      setRolesData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubE = onSnapshot(collection(db, "empleados"), (s) =>
      setEmpleadosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubU();
      unsubR();
      unsubE();
    };
  }, []);

  const users = usersData.map((u) => ({
    ...u,
    id: u.usuarioId || u.id,
    name: u.nombre || "Sin Nombre",
    email: u.correo || "",
    role: u.rol || "N/A",
    status: u.estado || "Deshabilitado",
    lastAccess:
      u.fechaActualizacion && typeof u.fechaActualizacion.toDate === "function"
        ? u.fechaActualizacion.toDate().toLocaleDateString()
        : u.fechaActualizacion instanceof Date
          ? u.fechaActualizacion.toLocaleDateString()
          : "",
    img: "",
  }));

  // ✅ roles con campo `estado` mapeado
  const roles =
    rolesData.length > 0
      ? rolesData.map((r) => ({
        id: r.id,
        name: r.nombre || "",
        permissions: r.permisos || [],
        estado: r.estado || "Activo",
      }))
      : INITIAL_ROLES;

  // Roles activos — únicamente para selects de asignación
  const activeRoles = roles.filter((r) => r.estado === "Activo");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos los Roles");
  const [statusFilter, setStatusFilter] = useState("Cualquier Estado");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [newRolePanel, setNewRolePanel] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const [newUser, setNewUser] = useState({
    empleadoId: "",
    name: "",
    email: "",
    role: "",
  });
  const [newRole, setNewRole] = useState({ name: "", permissions: [] });

  // ── Usuarios ──────────────────────────────────────────────
  const toggleUserStatus = (id) => {
    const user = users.find((u) => u.id === id);
    const next = user.status === "Activo" ? "Deshabilitado" : "Activo";
    setConfirmData({
      title:
        next === "Deshabilitado" ? "Deshabilitar usuario" : "Habilitar usuario",
      message:
        next === "Deshabilitado"
          ? `¿Estás seguro de que deseas deshabilitar a ${user.name}? No podrá acceder al sistema.`
          : `¿Deseas volver a habilitar a ${user.name}?`,
      confirmLabel:
        next === "Deshabilitado" ? "Sí, deshabilitar" : "Sí, habilitar",
      confirmColor:
        next === "Deshabilitado"
          ? "bg-rose-600 hover:bg-rose-700"
          : "bg-green-700 hover:bg-green-800",
      onConfirm: async () => {
        await updateDoc(doc(db, "usuarios", id), {
          estado: next,
          fechaActualizacion: Timestamp.now(),
          tipoModificacion: "Cambio Estado",
          usuarioModifico: auth.currentUser?.email || "Admin",
        });
        setConfirmData(null);
        showToast(
          next === "Deshabilitado"
            ? `${user.name} deshabilitado`
            : `${user.name} habilitado`,
        );
      },
    });
  };

  const saveEditUser = async (updated) => {
    await updateDoc(doc(db, "usuarios", updated.id), {
      nombre: updated.name,
      correo: updated.email,
      rol: updated.role,
      estado: updated.status,
      fechaActualizacion: Timestamp.now(),
      tipoModificacion: "Actualización de Usuario",
      usuarioModifico: auth.currentUser?.email || "Admin",
    });
    setEditUser(null);
    showToast("Usuario actualizado correctamente");
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email) return;
    try {
      const generatedPass = `${newUser.email.split("@")[0]}2026`;
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUser.email,
        generatedPass,
      );
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        usuarioId: cred.user.uid,
        uid: cred.user.uid,
        nombre: newUser.name,
        correo: newUser.email,
        rol: newUser.role || activeRoles[0]?.name,
        estado: "Activo",
        tipoModificacion: "Creación",
        usuarioModifico: auth.currentUser?.email || "Admin",
        fechaRegistro: Timestamp.now(),
        fechaActualizacion: Timestamp.now(),
      });
      setIsPanelOpen(false);
      setNewUser({
        empleadoId: "",
        name: "",
        email: "",
        role: activeRoles[0]?.name || "",
      });
      showToast("Usuario vinculado exitosamente");
    } catch (error) {
      showToast(`Error: ${error.message}`);
    }
  };

  // ── Roles ─────────────────────────────────────────────────
  const saveEditRole = async (updated) => {
    await updateDoc(doc(db, "roles", updated.id), {
      nombre: updated.name,
      permisos: updated.permissions,
      estado: updated.estado, // ✅ guarda estado
      fechaModificacion: Timestamp.now(),
      usuarioModifico: auth.currentUser?.email || "Admin",
    });
    setEditRole(null);
    showToast("Rol actualizado correctamente");
  };

  // ✅ Toggle estado del rol desde la tarjeta
  const toggleRoleStatus = (role) => {
    const next = role.estado === "Activo" ? "Deshabilitado" : "Activo";
    setConfirmData({
      title: next === "Deshabilitado" ? "Deshabilitar rol" : "Habilitar rol",
      message:
        next === "Deshabilitado"
          ? `¿Deshabilitar "${role.name}"? No podrá asignarse a nuevos usuarios, pero los actuales no se verán afectados.`
          : `¿Volver a habilitar el rol "${role.name}"?`,
      confirmLabel:
        next === "Deshabilitado" ? "Sí, deshabilitar" : "Sí, habilitar",
      confirmColor:
        next === "Deshabilitado"
          ? "bg-rose-600 hover:bg-rose-700"
          : "bg-green-700 hover:bg-green-800",
      onConfirm: async () => {
        await updateDoc(doc(db, "roles", role.id), {
          estado: next,
          fechaModificacion: Timestamp.now(),
          usuarioModifico: auth.currentUser?.email || "Admin",
        });
        setConfirmData(null);
        showToast(
          next === "Deshabilitado"
            ? `Rol "${role.name}" deshabilitado`
            : `Rol "${role.name}" habilitado`,
        );
      },
    });
  };

  const addRole = async () => {
    if (!newRole.name) return;
    const docRef = doc(collection(db, "roles"));
    await setDoc(docRef, {
      rolId: docRef.id,
      nombre: newRole.name.toUpperCase(),
      permisos: newRole.permissions,
      estado: "Activo", // ✅ siempre activo al crear
      fechaRegistro: Timestamp.now(),
      usuarioModifico: auth.currentUser?.email || "Admin",
    });
    setNewRolePanel(false);
    setNewRole({ name: "", permissions: [] });
    showToast("Rol creado exitosamente");
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "Todos los Roles" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "Cualquier Estado" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* HEADER */}
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-8 pt-2">
        <nav
          className="flex gap-6 font-semibold text-sm"
          style={{ fontFamily: "Manrope,sans-serif" }}
        >
          {["usuarios", "roles"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? "text-green-800 border-b-2 border-green-800" : "text-slate-500"} pb-1 capitalize transition-all`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <span className="text-slate-300 cursor-not-allowed pb-1">Logs</span>
        </nav>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-green-900 cursor-pointer p-2 rounded-full hover:bg-slate-100 transition-all">
            notifications
          </span>
          <div className="h-8 w-[1px] bg-slate-200 mx-1" />
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1 pr-3 rounded-full transition-all">
            <AvatarWithFallback name={userName || "Usuario"} img="" size="sm" />
            <div className="flex flex-col items-start leading-none">
              <span
                className="text-xs font-bold text-green-900 uppercase"
                style={{ fontFamily: "Manrope,sans-serif" }}
              >
                {userName || "USUARIO"}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">
                {authRole || "Invitado"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto px-4 md:px-0 space-y-8 pb-10"
      >
        {activeTab === "usuarios" ? (
          <>
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <h2
                  className="text-3xl font-extrabold text-green-900 tracking-tight"
                  style={{ fontFamily: "Manrope,sans-serif" }}
                >
                  Control de Usuarios
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Gestión centralizada de credenciales y permisos de empleados.
                </p>
              </div>
              <button
                onClick={() => setIsPanelOpen(true)}
                className="text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg bg-green-800 hover:bg-green-900 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">
                  person_add
                </span>
                <span>Nuevo Usuario</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title="Total Usuarios"
                value={users.length}
                icon="group"
                border="border-green-700"
                color="text-green-800"
              />
              <StatCard
                title="Deshabilitados"
                value={users.filter((u) => u.status !== "Activo").length}
                icon="person_off"
                border="border-rose-600"
                color="text-rose-600"
              />
              <StatCard
                title="Roles Activos"
                value={activeRoles.length}
                icon="shield_person"
                border="border-amber-500"
                color="text-amber-600"
              />
              <div className="bg-[#00450d] text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-green-300 text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Capacidad Servidor
                  </span>
                  <div
                    className="text-4xl font-extrabold mt-4"
                    style={{ fontFamily: "Manrope,sans-serif" }}
                  >
                    98%
                  </div>
                </div>
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl opacity-10">
                  verified_user
                </span>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-3 rounded-2xl flex flex-wrap gap-4 items-center border border-slate-200 shadow-sm">
              <div className="flex-1 min-w-[280px] relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  search
                </span>
                <input
                  className="w-full bg-slate-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                  placeholder="Buscar por nombre o correo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <select
                  className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer py-2 px-4 outline-none"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option>Todos los Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="w-[1px] bg-slate-300 my-2" />
                <select
                  className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer py-2 px-4 outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>Cualquier Estado</option>
                  <option>Activo</option>
                  <option>Deshabilitado</option>
                </select>
              </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {[
                        "Empleado",
                        "Rol del Sistema",
                        "Estado",
                        "Último Acceso",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-16 text-slate-400 text-sm"
                        >
                          No se encontraron usuarios
                        </td>
                      </tr>
                    )}
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50 transition-colors group ${user.status !== "Activo" ? "opacity-60" : ""}`}
                      >
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <AvatarWithFallback
                              name={user.name}
                              img={user.img}
                              size="md"
                            />
                            <div>
                              <p
                                className="font-bold text-sm text-slate-900"
                                style={{ fontFamily: "Manrope,sans-serif" }}
                              >
                                {user.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-50 text-green-800 border border-green-100">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <div
                            className={`text-xs font-bold flex items-center gap-2 ${user.status === "Activo" ? "text-green-700" : "text-slate-400"}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${user.status === "Activo" ? "bg-green-500 animate-pulse" : "bg-slate-300"}`}
                            />
                            {user.status}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-sm font-medium text-slate-500">
                            {user.lastAccess}
                          </p>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditUser({ ...user })}
                              className="p-2 hover:bg-slate-100 hover:shadow-sm rounded-lg text-slate-500 transition-all"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-lg">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              className={`p-2 rounded-lg transition-all ${user.status === "Activo" ? "hover:bg-rose-50 text-rose-500" : "hover:bg-green-50 text-green-700"}`}
                              title={
                                user.status === "Activo"
                                  ? "Deshabilitar"
                                  : "Habilitar"
                              }
                            >
                              <span className="material-symbols-outlined text-lg">
                                {user.status === "Activo"
                                  ? "person_off"
                                  : "person_check"}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* ── ROLES VIEW ── */
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div>
                <h2
                  className="text-3xl font-extrabold text-green-900 tracking-tight"
                  style={{ fontFamily: "Manrope,sans-serif" }}
                >
                  Gestión de Roles
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Define quién puede ver y editar cada módulo del sistema.
                </p>
              </div>
              <button
                onClick={() => setNewRolePanel(true)}
                className="text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg bg-green-800 hover:bg-green-900 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">
                  add_moderator
                </span>
                <span>Nuevo Rol</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map((role) => {
                const isDisabled = role.estado === "Deshabilitado";
                return (
                  <motion.div
                    whileHover={{ y: -4 }}
                    key={role.id}
                    className={`bg-white p-8 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all ${isDisabled ? "border-slate-200 opacity-55 grayscale" : "border-slate-200"}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div
                          className={`p-3 rounded-2xl ${isDisabled ? "bg-slate-100" : "bg-green-100"}`}
                        >
                          <span
                            className={`material-symbols-outlined ${isDisabled ? "text-slate-400" : "text-green-800"}`}
                          >
                            security
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {isDisabled && (
                            <span className="text-[10px] font-black bg-rose-50 text-rose-500 border border-rose-100 px-2 py-1 rounded uppercase tracking-tighter">
                              Deshabilitado
                            </span>
                          )}
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
                            {users.filter((u) => u.role === role.name).length}{" "}
                            usuarios
                          </span>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-green-900 uppercase mb-4 leading-tight">
                        {role.name}
                      </h3>
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Permisos de Acceso
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map((p, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-100"
                            >
                              {p}
                            </span>
                          ))}
                          {role.permissions.length === 0 && (
                            <span className="text-[10px] text-slate-400 italic">
                              Sin permisos asignados
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ✅ Botones de acción */}
                    <div className="mt-8 flex flex-col gap-2">
                      <button
                        onClick={() =>
                          setEditRole({
                            ...role,
                            permissions: [...role.permissions],
                          })
                        }
                        className="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-500 font-bold text-xs hover:bg-green-800 hover:text-white hover:border-green-800 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">
                          tune
                        </span>
                        Configurar Permisos
                      </button>
                      <button
                        onClick={() => toggleRoleStatus(role)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center gap-1 ${isDisabled
                          ? "border-green-200 text-green-700 hover:bg-green-700 hover:text-white hover:border-green-700"
                          : "border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                          }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isDisabled ? "lock_open" : "lock"}
                        </span>
                        {isDisabled ? "Habilitar Rol" : "Deshabilitar Rol"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ===== PANEL: NUEVO USUARIO ===== */}
      <SidePanel
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title="Vincular Empleado"
      >
        <div className="space-y-6 flex-1 overflow-y-auto">
          <Field label="Seleccione el Empleado">
            <select
              className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none cursor-pointer"
              value={newUser.empleadoId}
              onChange={(e) => {
                const emp = empleadosData.find(
                  (emp) => emp.id === e.target.value,
                );
                if (emp) {
                  setNewUser({
                    ...newUser,
                    empleadoId: emp.id,
                    name: `${emp.nombres || ""} ${emp.apellidos || ""}`.trim(),
                    email: emp.correo || "",
                  });
                } else {
                  setNewUser({
                    ...newUser,
                    empleadoId: "",
                    name: "",
                    email: "",
                  });
                }
              }}
            >
              <option value="">-- Seleccionar --</option>
              {empleadosData
                .filter((e) => e.estado === "Activo" || e.estado === "active")
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombres} {emp.apellidos} - {emp.departamento}
                  </option>
                ))}
            </select>
          </Field>
          {newUser.empleadoId && (
            <>
              <Field label="Nombre Completo">
                <input
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none cursor-not-allowed"
                  value={newUser.name}
                  readOnly
                />
              </Field>
              <Field label="Correo Electrónico">
                <input
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Asignar Rol">
                {/* ✅ Solo roles activos */}
                <select
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none cursor-pointer"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  {activeRoles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-3">
                <span className="material-symbols-outlined text-orange-600">
                  info
                </span>
                <p className="text-[11px] text-orange-800 leading-relaxed">
                  Se creará automáticamente la cuenta con la contraseña
                  predeterminada:{" "}
                  <strong>
                    {newUser.email ? newUser.email.split("@")[0] : "admin"}2026
                  </strong>
                  . (Pueden solicitar cambio de contraseña en el Login).
                </p>
              </div>
            </>
          )}
        </div>
        <div className="pt-6 border-t space-y-3">
          <button
            onClick={addUser}
            className="w-full bg-green-800 text-white py-4 rounded-xl font-bold hover:bg-green-900 shadow-lg transition-all active:scale-95"
          >
            Confirmar Vinculación
          </button>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
        </div>
      </SidePanel>

      {/* ===== PANEL: EDITAR USUARIO ===== */}
      <SidePanel
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Editar Usuario"
      >
        {editUser && (
          <>
            <div className="space-y-6 flex-1 overflow-y-auto">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <AvatarWithFallback
                  name={editUser.name || "U"}
                  img={editUser.img}
                  size="lg"
                />
                <div>
                  <p
                    className="font-black text-green-900 text-sm"
                    style={{ fontFamily: "Manrope,sans-serif" }}
                  >
                    {editUser.name || "Nuevo usuario"}
                  </p>
                  <p className="text-xs text-slate-500">{editUser.email}</p>
                  <span
                    className={`text-[10px] font-bold mt-1 inline-block ${editUser.status === "Activo" ? "text-green-700" : "text-slate-400"}`}
                  >
                    ● {editUser.status}
                  </span>
                </div>
              </div>
              <Field label="Nombre Completo">
                <input
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                  value={editUser.name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Correo Electrónico">
                <input
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser({ ...editUser, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Rol Asignado">
                {/* ✅ Solo roles activos */}
                <select
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none cursor-pointer"
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value })
                  }
                >
                  {activeRoles.map((r) => (
                    <option key={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <div className="flex gap-3">
                  {["Activo", "Deshabilitado"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditUser({ ...editUser, status: s })}
                      className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${editUser.status === s ? (s === "Activo" ? "bg-green-800 text-white" : "bg-rose-600 text-white") : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="pt-6 border-t space-y-3">
              <button
                onClick={() => saveEditUser(editUser)}
                className="w-full bg-green-800 text-white py-4 rounded-xl font-bold hover:bg-green-900 shadow-lg transition-all active:scale-95"
              >
                Guardar Cambios
              </button>
              <button
                onClick={() => setEditUser(null)}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </SidePanel>

      {/* ===== PANEL: EDITAR ROL ===== */}
      <SidePanel
        open={!!editRole}
        onClose={() => setEditRole(null)}
        title="Configurar Permisos"
      >
        {editRole && (
          <>
            <div className="space-y-6 flex-1 overflow-y-auto">
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1">
                  Rol
                </p>
                <p
                  className="text-lg font-black text-green-900"
                  style={{ fontFamily: "Manrope,sans-serif" }}
                >
                  {editRole.name}
                </p>
              </div>
              <Field label="Nombre del Rol">
                <input
                  className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none uppercase font-bold"
                  value={editRole.name}
                  onChange={(e) =>
                    setEditRole({
                      ...editRole,
                      name: e.target.value.toUpperCase(),
                    })
                  }
                />
              </Field>
              {/* ✅ Estado del rol editable desde el panel */}
              <Field label="Estado del Rol">
                <div className="flex gap-3">
                  {["Activo", "Deshabilitado"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditRole({ ...editRole, estado: s })}
                      className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${(editRole.estado || "Activo") === s
                        ? s === "Activo"
                          ? "bg-green-800 text-white"
                          : "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Permisos de Acceso
                </p>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.map((perm) => {
                    const active = editRole.permissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        onClick={() => {
                          const perms = active
                            ? editRole.permissions.filter((p) => p !== perm)
                            : [...editRole.permissions, perm];
                          setEditRole({ ...editRole, permissions: perms });
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? "bg-green-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"}`}
                      >
                        <span>{perm}</span>
                        <span className="material-symbols-outlined text-base">
                          {active ? "check_circle" : "radio_button_unchecked"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pt-6 border-t space-y-3">
              <button
                onClick={() => saveEditRole(editRole)}
                className="w-full bg-green-800 text-white py-4 rounded-xl font-bold hover:bg-green-900 shadow-lg transition-all active:scale-95"
              >
                Guardar Cambios
              </button>
              <button
                onClick={() => setEditRole(null)}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </SidePanel>

      {/* ===== PANEL: NUEVO ROL ===== */}
      <SidePanel
        open={newRolePanel}
        onClose={() => setNewRolePanel(false)}
        title="Crear Nuevo Rol"
      >
        <div className="space-y-6 flex-1 overflow-y-auto">
          <Field label="Nombre del Rol">
            <input
              className="w-full bg-slate-50 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-green-700 outline-none uppercase font-bold"
              placeholder="EJ: EDITOR VENTAS"
              value={newRole.name}
              onChange={(e) =>
                setNewRole({ ...newRole, name: e.target.value.toUpperCase() })
              }
            />
          </Field>
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Seleccionar Permisos
            </p>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((perm) => {
                const active = newRole.permissions.includes(perm);
                return (
                  <button
                    key={perm}
                    onClick={() => {
                      const perms = active
                        ? newRole.permissions.filter((p) => p !== perm)
                        : [...newRole.permissions, perm];
                      setNewRole({ ...newRole, permissions: perms });
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? "bg-green-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"}`}
                  >
                    <span>{perm}</span>
                    <span className="material-symbols-outlined text-base">
                      {active ? "check_circle" : "radio_button_unchecked"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="pt-6 border-t space-y-3">
          <button
            onClick={addRole}
            className="w-full bg-green-800 text-white py-4 rounded-xl font-bold hover:bg-green-900 shadow-lg transition-all active:scale-95"
          >
            Crear Rol
          </button>
          <button
            onClick={() => setNewRolePanel(false)}
            className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
        </div>
      </SidePanel>

      {confirmData && (
        <ConfirmModal
          open={!!confirmData}
          title={confirmData.title}
          message={confirmData.message}
          confirmLabel={confirmData.confirmLabel}
          confirmColor={confirmData.confirmColor}
          onConfirm={confirmData.onConfirm}
          onCancel={() => setConfirmData(null)}
        />
      )}
      <Toast message={toast} show={!!toast} />
    </div>
  );
}

// --- HELPERS ---
function SidePanel({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-2xl z-50 p-8 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-xl font-bold text-green-900"
                style={{ fontFamily: "Manrope,sans-serif" }}
              >
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon, border, color }) {
  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 flex flex-col justify-between ${border}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          {title}
        </span>
        <span className={`material-symbols-outlined opacity-20 ${color}`}>
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-4">
        <span
          className={`text-4xl font-black ${color}`}
          style={{ fontFamily: "Manrope,sans-serif" }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
