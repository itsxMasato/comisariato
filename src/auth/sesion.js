// Decide si el documento de `usuarios` de quien inició sesión le da acceso.
// Sin documento NO hay acceso: antes se asignaba el rol "Administrador" (SUPER ADMIN).
export const resolverSesion = (userData) => {
  if (!userData) {
    return { acceso: false, rol: null, nombre: "Usuario", foto: "", motivo: "sin_documento" };
  }
  if (userData.estado !== "Activo" && userData.estado !== "active") {
    return { acceso: false, rol: null, nombre: "Usuario", foto: "", motivo: "inactivo" };
  }
  return {
    acceso: true,
    rol: userData.rol || "Usuario",
    nombre: userData.nombre || "Usuario",
    foto: userData.fotoURL || "",
    motivo: null,
  };
};
