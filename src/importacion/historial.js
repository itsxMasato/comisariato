// Historial de importaciones (`importaciones`), bloques de detalle (`filas`)
// y candado por módulo (`importaciones_bloqueo`).

export const MINUTOS_INACTIVIDAD = 10;
const INACTIVIDAD_MS = MINUTOS_INACTIVIDAD * 60 * 1000;
export const FILAS_POR_BLOQUE = 200;

export class ErrorCandado extends Error {
  constructor(correo) {
    super(`Hay una importación en curso de este módulo por ${correo}`);
    this.name = "ErrorCandado";
    this.correo = correo;
  }
}

// Hora del servidor: se escribe una marca y se lee de vuelta
export const horaServidor = async (almacen) => {
  const lote = almacen.lote();
  lote.set("contadores/reloj", { marca: almacen.marcaServidor() });
  await lote.commit();
  return (await almacen.leer("contadores/reloj")).marca;
};

export const tomarCandado = async (almacen, modulo, { importacionId, uid, correo }) => {
  const ahora = await horaServidor(almacen);
  const ruta = `importaciones_bloqueo/${modulo}`;
  await almacen.transaccion(async (tx) => {
    const actual = await tx.leer(ruta);
    const vigente = actual && ahora - actual.actualizado < INACTIVIDAD_MS;
    if (vigente && actual.uid !== uid) throw new ErrorCandado(actual.correo);
    tx.set(ruta, { importacionId, uid, correo, actualizado: ahora });
  });
  return { ahora };
};

export const renovarCandado = (almacen, modulo) =>
  almacen.actualizar(`importaciones_bloqueo/${modulo}`, { actualizado: almacen.marcaServidor() });

export const liberarCandado = async (almacen, modulo) => {
  const lote = almacen.lote();
  lote.delete(`importaciones_bloqueo/${modulo}`);
  await lote.commit();
};

export const crearImportacion = async (almacen, { id: idDado, folio, modulo, modo, archivo, responsable, conteos }) => {
  const id = idDado ?? almacen.nuevoId("importaciones");
  const lote = almacen.lote();
  lote.set(`importaciones/${id}`, {
    folio,
    modulo,
    modo,
    archivo,
    estado: "en_proceso",
    conteos,
    responsable,
    fechaInicio: almacen.marcaServidor(),
    fechaFin: null,
    ultimaActividad: almacen.marcaServidor(),
    error: null,
    reversion: null,
  });
  await lote.commit();
  return id;
};

export const actualizarImportacion = (almacen, id, cambios) =>
  almacen.actualizar(`importaciones/${id}`, { ...cambios, ultimaActividad: almacen.marcaServidor() });

// Tramos de 200 filas: cada uno se guarda como un documento de `filas`
export const bloquesDeFilas = (filas) => {
  const bloques = [];
  for (let i = 0; i < filas.length; i += FILAS_POR_BLOQUE) {
    const tramo = filas.slice(i, i + FILAS_POR_BLOQUE);
    bloques.push({
      id: `b${String(bloques.length + 1).padStart(4, "0")}`,
      desde: tramo[0].filaExcel,
      hasta: tramo[tramo.length - 1].filaExcel,
      filas: tramo,
    });
  }
  return bloques;
};

// Una importación o reversión sin actividad por más de 10 minutos se considera interrumpida
export const estadoMostrado = (importacion, ahora) => {
  const enCurso = ["en_proceso", "revirtiendo"].includes(importacion.estado);
  const ultima = importacion.ultimaActividad;
  if (enCurso && ultima && ahora - ultima > INACTIVIDAD_MS) return "interrumpida_sin_actividad";
  return importacion.estado;
};
