export const ROLES = {
  SUPER_ADMIN: "SUPER ADMIN",
  ADMIN: "ADMIN",
  EDITOR_CREDITOS: "EDITOR CREDITOS",
  EDITOR_INVENTARIO: "EDITOR INVENTARIO",
  EDITOR_EMPLEADOS: "EDITOR EMPLEADOS",
  CEO: "CEO",
  EMPLEADO: "EMPLEADO",
};

export const MODULES = {
  DASHBOARD: "DASHBOARD",
  PRODUCTOS: "PRODUCTOS",
  EMPLEADOS: "EMPLEADOS",
  CREDITOS: "CREDITOS",
  CUOTAS: "CUOTAS",
  RESERVAS: "RESERVAS",
  USUARIOS: "USUARIOS",
  BITACORA: "BITACORA",
  PARAMETROS: "PARAMETROS",
};

export const ACTIONS = {
  VIEW: "VIEW",
  CREATE: "CREATE",
  EDIT: "EDIT",
  DELETE: "DELETE",
  EXPORT: "EXPORT",
};

// Mapa de permisos
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: { "*": ["*"] },
  [ROLES.ADMIN]: {
    [MODULES.DASHBOARD]: ["*"],
    [MODULES.PRODUCTOS]: ["*"],
    [MODULES.EMPLEADOS]: ["*"],
    [MODULES.CREDITOS]: ["*"],
    [MODULES.CUOTAS]: ["*"],
    [MODULES.RESERVAS]: ["*"],
  },
  [ROLES.EDITOR_CREDITOS]: {
    [MODULES.DASHBOARD]: ["*"],
    [MODULES.CREDITOS]: ["*"],
    [MODULES.CUOTAS]: ["*"],
    [MODULES.EMPLEADOS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
  },
  [ROLES.EDITOR_INVENTARIO]: {
    [MODULES.DASHBOARD]: ["*"],
    [MODULES.PRODUCTOS]: ["*"],
  },
  [ROLES.EDITOR_EMPLEADOS]: {
    [MODULES.DASHBOARD]: ["*"],
    [MODULES.EMPLEADOS]: ["*"],
    [MODULES.CREDITOS]: [ACTIONS.VIEW, ACTIONS.EXPORT],
  },
  [ROLES.CEO]: {
    [MODULES.DASHBOARD]: [ACTIONS.VIEW],
  },
  [ROLES.EMPLEADO]: {}, // Sin acceso a la web
};

export let DYNAMIC_ROLES = {};

export const setDynamicRoles = (rolesArray) => {
  const newRoles = {};
  rolesArray.forEach((r) => {
    if (!r.nombre || !r.permisos) return;
    const mappedPerms = {};
    r.permisos.forEach((moduleName) => {
      mappedPerms[moduleName] = ["*"];
    });
    newRoles[r.nombre.toUpperCase()] = mappedPerms;
  });
  DYNAMIC_ROLES = newRoles;
};

export const hasPermission = (userRole, moduleName, action = ACTIONS.VIEW) => {
  if (!userRole) return false;
  
  // Soporte para usuarios legacy mientras se migran
  let currentRole = userRole;
  if (currentRole === "Administrador") currentRole = ROLES.SUPER_ADMIN;
  else if (currentRole === "Usuario") currentRole = ROLES.EMPLEADO;

  const rolePerms = ROLE_PERMISSIONS[currentRole] || DYNAMIC_ROLES[currentRole.toUpperCase()];
  if (!rolePerms) return false;

  // Acceso total
  if (rolePerms["*"] && rolePerms["*"].includes("*")) return true;

  const modPerms = rolePerms[moduleName];
  if (!modPerms) return false;

  // Acceso total al módulo
  if (modPerms.includes("*")) return true;

  // Acceso por acción
  return modPerms.includes(action);
};
