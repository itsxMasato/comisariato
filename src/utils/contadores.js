// Contadores transaccionales: códigos EMP-NNNN y folios de importación.
// Evitan que dos altas simultáneas obtengan el mismo número.

export const formatearCodigoEmpleado = (n) => `EMP-${String(n).padStart(4, "0")}`;

export const maximoCodigoEmpleado = (empleados) =>
  empleados.reduce((max, e) => {
    const m = /^EMP-(\d+)$/.exec(String(e.codigoEmpleado || "").trim());
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

// Reserva `cantidad` códigos consecutivos. Se lee el máximo existente en cada
// reserva para que el contador nunca quede detrás de un código cargado a mano.
export const reservarCodigosEmpleado = async (almacen, cantidad) => {
  if (cantidad <= 0) return [];
  const maximoLeido = maximoCodigoEmpleado(await almacen.leerTodos("empleados"));
  const desde = await almacen.transaccion(async (tx) => {
    const contador = await tx.leer("contadores/empleados");
    const base = Math.max(contador?.ultimo ?? 0, maximoLeido);
    tx.set("contadores/empleados", { ultimo: base + cantidad });
    return base + 1;
  });
  return Array.from({ length: cantidad }, (_, i) => formatearCodigoEmpleado(desde + i));
};

// Folio IMP-AAAA-NNNN; el número se reinicia al cambiar de año.
// `ahora` debe ser la hora del servidor (la que devuelve tomarCandado).
export const siguienteFolio = async (almacen, ahora) => {
  const anio = ahora.getFullYear();
  const numero = await almacen.transaccion(async (tx) => {
    const contador = await tx.leer("contadores/importaciones");
    const ultimo = contador?.anio === anio ? contador.ultimo : 0;
    tx.set("contadores/importaciones", { anio, ultimo: ultimo + 1 });
    return ultimo + 1;
  });
  return `IMP-${anio}-${String(numero).padStart(4, "0")}`;
};
