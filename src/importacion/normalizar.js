// Conversión de los valores crudos de una celda de Excel.
// Los convertidores devuelven { ok: true, valor } o { ok: false, mensaje }.

const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const normalizarEncabezado = (t) => sinAcentos(String(t ?? "")).toLowerCase().replace(/[^a-z0-9]/g, "");

export const aTexto = (v) => (v === null || v === undefined ? "" : String(v).trim().replace(/\s+/g, " "));

export const aNumero = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? { ok: true, valor: v } : { ok: false, mensaje: "no es un número" };
  const limpio = aTexto(v).replace(/^(lps?\.?|l\.?)\s*/i, "").replace(/,/g, "");
  if (!limpio || !/^-?\d+(\.\d+)?$/.test(limpio)) return { ok: false, mensaje: "no es un número" };
  return { ok: true, valor: Number(limpio) };
};

export const aEntero = (v) => {
  const n = aNumero(v);
  if (!n.ok) return n;
  return Number.isInteger(n.valor) ? n : { ok: false, mensaje: "debe ser un número entero" };
};

// Fecha local válida (rechaza 31/02 o el día 40)
const fechaValida = (anio, mes, dia) => {
  const d = new Date(anio, mes - 1, dia);
  return d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null;
};

const DIA_MS = 86400000;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

export const aFecha = (v) => {
  let d = null;
  if (v instanceof Date) d = Number.isNaN(v.getTime()) ? null : v;
  else if (typeof v === "number" && v > 0) {
    // Número de serie de Excel: días desde el 30/12/1899
    const utc = new Date(EPOCA_EXCEL + Math.round(v * DIA_MS));
    d = fechaValida(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  } else {
    const t = aTexto(v);
    let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
    if (m) d = fechaValida(Number(m[3]), Number(m[2]), Number(m[1]));
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    if (m) d = fechaValida(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  return d ? { ok: true, valor: d } : { ok: false, mensaje: "no es una fecha válida (use dd/mm/aaaa)" };
};

export const esCorreo = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(aTexto(t));

export const aDni = (v) => {
  const digitos = aTexto(v).replace(/[\s-]/g, "");
  return /^\d{13}$/.test(digitos)
    ? { ok: true, valor: digitos }
    : { ok: false, mensaje: "debe tener 13 dígitos (si Excel quitó el cero inicial, formatee la columna como texto)" };
};
