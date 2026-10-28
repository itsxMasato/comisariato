// Etiquetas, colores e íconos de los estados de fila e importación

export const ESTADOS_FILA = {
  nuevo: { etiqueta: "Nuevo", icono: "add_circle", clase: "bg-emerald-100/80 text-emerald-800 border-emerald-300" },
  insertado: { etiqueta: "Insertado", icono: "check_circle", clase: "bg-emerald-100/80 text-emerald-800 border-emerald-300" },
  actualizar: { etiqueta: "A actualizar", icono: "sync", clase: "bg-blue-100 text-blue-800 border-blue-300" },
  actualizado: { etiqueta: "Actualizado", icono: "sync", clase: "bg-blue-100 text-blue-800 border-blue-300" },
  sin_cambios: { etiqueta: "Sin cambios", icono: "remove", clase: "bg-slate-100 text-slate-600 border-slate-300" },
  omitido: { etiqueta: "Omitido", icono: "content_copy", clase: "bg-amber-100/80 text-amber-900 border-amber-300" },
  rechazado: { etiqueta: "Rechazado", icono: "error", clase: "bg-red-100 text-red-800 border-red-300" },
  no_procesado: { etiqueta: "No procesado", icono: "pause_circle", clase: "bg-slate-200 text-slate-700 border-slate-300" },
};

export const ESTADOS_IMPORTACION = {
  en_proceso: { etiqueta: "En proceso", clase: "bg-blue-100 text-blue-800" },
  completada: { etiqueta: "Completada", clase: "bg-emerald-100 text-emerald-800" },
  completada_con_advertencias: { etiqueta: "Con advertencias", clase: "bg-amber-100 text-amber-900" },
  interrumpida: { etiqueta: "Interrumpida", clase: "bg-red-100 text-red-800" },
  interrumpida_sin_actividad: { etiqueta: "Interrumpida (sin actividad)", clase: "bg-red-100 text-red-800" },
  revirtiendo: { etiqueta: "Revirtiendo", clase: "bg-blue-100 text-blue-800" },
  revertida: { etiqueta: "Revertida", clase: "bg-slate-200 text-slate-700" },
  revertida_parcial: { etiqueta: "Revertida parcialmente", clase: "bg-slate-200 text-slate-700" },
};

export const ESTADOS_REVERSION = {
  revertido: "Revertido",
  revertido_parcial: "Revertido parcialmente",
  no_revertido: "No revertido",
};

export const MOTIVOS_NO_DESHACER = {
  plazo_vencido: "Pasaron más de 12 horas desde que terminó la importación.",
  estado: "La importación ya se revirtió o todavía está en proceso.",
  sin_permiso: "No tenés permiso para deshacer esta importación.",
  nada_que_revertir: "La importación no insertó ni actualizó registros.",
};

// Pantalla de origen de cada módulo importable
export const RUTA_MODULO = { productos: "/productos", empleados: "/empleados", usuarios: "/usuarios" };

export const formatearValor = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return v.toLocaleDateString("es-HN");
  if (typeof v === "number") return v.toLocaleString("es-HN");
  return String(v);
};

// Valor de una celda para la vista previa: el que se va a guardar y, si el sistema
// lo corrigió (mayúsculas, tildes), lo que decía el Excel
export const valorParaMostrar = (crudo, valor) => {
  if (valor === undefined) return { texto: formatearValor(typeof crudo === "string" ? crudo.trim() : crudo), original: null };
  const original = typeof crudo === "string" && typeof valor === "string" && crudo.trim().replace(/\s+/g, " ") !== valor ? crudo.trim() : null;
  return { texto: formatearValor(valor), original };
};

export const formatearFechaHora = (d) =>
  d instanceof Date
    ? d.toLocaleString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export const formatearPeso = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const formatearDuracion = (ms) => {
  const min = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};
