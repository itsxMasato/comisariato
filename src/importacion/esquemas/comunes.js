// Convertidores reutilizables por los esquemas de importación
import { aEntero, aNumero, aTexto, normalizarEncabezado } from "../normalizar";

export const texto = () => (v) => {
  const t = aTexto(v);
  return t ? { ok: true, valor: t } : { ok: false, mensaje: "está vacío" };
};

export const numeroMayorACero = () => (v) => {
  const n = aNumero(v);
  if (!n.ok) return n;
  return n.valor > 0 ? n : { ok: false, mensaje: "debe ser mayor a 0" };
};

export const numeroNoNegativo = () => (v) => {
  const n = aNumero(v);
  if (!n.ok) return n;
  return n.valor >= 0 ? n : { ok: false, mensaje: "no puede ser negativo" };
};

export const enteroNoNegativo = () => (v) => {
  const n = aEntero(v);
  if (!n.ok) return n;
  return n.valor >= 0 ? n : { ok: false, mensaje: "no puede ser negativo" };
};

export const estadoActivoInactivo = () => (v) => {
  const t = normalizarEncabezado(v);
  if (["activo", "active"].includes(t)) return { ok: true, valor: "Activo" };
  if (["inactivo", "inactive"].includes(t)) return { ok: true, valor: "Inactivo" };
  return { ok: false, mensaje: "debe ser Activo o Inactivo" };
};

// Valor que debe existir en un catálogo del contexto; se guarda con su nombre exacto
export const deCatalogo = (claveContexto, nombreCatalogo) => (v, contexto) => {
  const buscado = normalizarEncabezado(v);
  const encontrado = (contexto[claveContexto] || []).find((n) => normalizarEncabezado(n) === buscado);
  return encontrado
    ? { ok: true, valor: encontrado }
    : { ok: false, mensaje: `«${aTexto(v)}» no existe en ${nombreCatalogo}` };
};

export const redondear2 = (n) => Math.round(n * 100) / 100;
