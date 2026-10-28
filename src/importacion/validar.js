// Validación genérica de filas de Excel contra un esquema de módulo.
// No conoce ningún módulo: todas las reglas vienen del esquema.
import { normalizarClave } from "../utils/validaciones";
import { aTexto, normalizarEncabezado } from "./normalizar";

export const MODOS = { SOLO_NUEVOS: "solo_nuevos", NUEVOS_Y_ACTUALIZAR: "nuevos_y_actualizar" };

// Relaciona cada encabezado del archivo con un campo del esquema
export const validarEncabezados = (esquema, encabezados) => {
  const mapa = {};
  const ignorados = [];
  encabezados.forEach((enc) => {
    const norm = normalizarEncabezado(enc);
    const col = esquema.columnas.find(
      (c) => !Object.values(mapa).includes(c.campo) && [c.campo, ...c.alias].map(normalizarEncabezado).includes(norm),
    );
    if (col) mapa[enc] = col.campo;
    else ignorados.push(enc);
  });
  const presentes = Object.values(mapa);
  const faltantes = esquema.columnas.filter((c) => c.obligatoria && !presentes.includes(c.campo)).map((c) => c.etiqueta);
  return { mapa, faltantes, ignorados };
};

const valorComparable = (v) => (v instanceof Date ? v.getTime() : v);

export const sonIguales = (a, b) => {
  const x = valorComparable(a);
  const y = valorComparable(b);
  if (typeof x === "number" && typeof y === "number") return Math.abs(x - y) < 0.005;
  return (x ?? "") === (y ?? "");
};

const RESUMEN_POR_ESTADO = {
  nuevo: "nuevos",
  actualizar: "actualizar",
  sin_cambios: "sinCambios",
  omitido: "omitidos",
  rechazado: "rechazados",
};

// Convierte las celdas de una fila; devuelve los valores presentes y los errores
const convertirFila = (esquema, mapa, crudos, contexto) => {
  const valores = {};
  const errores = [];
  Object.entries(mapa).forEach(([enc, campo]) => {
    const col = esquema.columnas.find((c) => c.campo === campo);
    const crudo = crudos[enc];
    if (aTexto(crudo) === "") {
      if (col.obligatoria && !col.generable) errores.push({ campo, mensaje: `${col.etiqueta} es obligatorio`, valorRecibido: "" });
      return;
    }
    const r = col.convertir(crudo, contexto);
    if (r.ok) valores[campo] = r.valor;
    else errores.push({ campo, mensaje: `${col.etiqueta}: ${r.mensaje}`, valorRecibido: aTexto(crudo) });
  });
  return { valores, errores };
};

// Campos que cambian respecto del registro existente (solo los presentes en el archivo)
const calcularCambios = (esquema, valores, existente, contexto) => {
  const nuevos = {};
  Object.entries(valores).forEach(([campo, valor]) => {
    if (esquema.camposNoActualizables?.includes(campo)) return;
    if (!sonIguales(valor, existente[campo])) nuevos[campo] = valor;
  });
  if (Object.keys(nuevos).length && esquema.derivarActualizacion) {
    Object.assign(nuevos, esquema.derivarActualizacion(nuevos, contexto));
  }
  const cambios = Object.entries(nuevos)
    .filter(([campo, valor]) => !sonIguales(valor, existente[campo]))
    .map(([campo, valor]) => ({ campo, anterior: existente[campo] ?? null, nuevo: valor }));
  return { cambios, documento: Object.fromEntries(cambios.map((c) => [c.campo, c.nuevo])) };
};

export const validar = ({ esquema, encabezados, filas, modo, contexto }) => {
  const { mapa, faltantes, ignorados } = validarEncabezados(esquema, encabezados);
  const resumen = { recibidos: filas.length, nuevos: 0, actualizar: 0, sinCambios: 0, omitidos: 0, rechazados: 0 };
  if (faltantes.length) return { faltantes, ignorados, filas: [], resumen };

  const vistas = new Map(); // clave normalizada → primera fila de Excel donde aparece
  const estadoCompartido = {}; // lo usan los esquemas para reglas entre filas

  const clasificadas = filas.map(({ filaExcel, valores: crudos }) => {
    const { valores, errores } = convertirFila(esquema, mapa, crudos, contexto);
    const clave = valores[esquema.claveDuplicado] !== undefined ? normalizarClave(valores[esquema.claveDuplicado]) : null;

    if (clave) {
      if (vistas.has(clave)) {
        errores.push({ campo: esquema.claveDuplicado, mensaje: `Repetido en la fila ${vistas.get(clave)}`, valorRecibido: clave });
      } else vistas.set(clave, filaExcel);
    }

    const existente = clave ? contexto.existentes.get(clave) || null : null;
    if (esquema.validarFila) {
      errores.push(...esquema.validarFila(valores, { contexto, existente, compartido: estadoCompartido, filaExcel }));
    }

    const base = { filaExcel, clave, crudos, valores, existenteId: existente?.id ?? null, cambios: [], errores, documento: null };
    if (errores.length) return { ...base, estado: "rechazado" };
    if (!existente) return { ...base, estado: "nuevo", documento: esquema.construirDocumento(valores, contexto) };
    if (esquema.soloCreacion || modo !== MODOS.NUEVOS_Y_ACTUALIZAR) return { ...base, estado: "omitido" };

    const { cambios, documento } = calcularCambios(esquema, valores, existente, contexto);
    return cambios.length ? { ...base, estado: "actualizar", cambios, documento } : { ...base, estado: "sin_cambios" };
  });

  clasificadas.forEach((f) => {
    resumen[RESUMEN_POR_ESTADO[f.estado]] += 1;
  });
  return { faltantes, ignorados, filas: clasificadas, resumen };
};
