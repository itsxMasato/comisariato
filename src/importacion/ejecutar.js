// Ejecución de una importación ya validada (§6 de la especificación).
// Productos y Empleados: tramos atómicos de 200 filas. Usuarios: de a una cuenta.
import { reservarCodigosEmpleado, siguienteFolio } from "../utils/contadores";
import { cargarContexto } from "./contexto";
import { esperar } from "./esperar";
import {
  actualizarImportacion,
  bloquesDeFilas,
  crearImportacion,
  liberarCandado,
  renovarCandado,
  tomarCandado,
} from "./historial";
import { validar } from "./validar";

export const ESPERAS_REINTENTO = [1000, 3000, 9000];

export class ErrorRevalidacion extends Error {
  constructor(clasificacionNueva) {
    super("Los datos cambiaron desde la vista previa");
    this.name = "ErrorRevalidacion";
    this.clasificacionNueva = clasificacionNueva;
  }
}

// Estado que queda registrado en el historial para cada estado de la vista previa
const ESTADO_FINAL = { nuevo: "insertado", actualizar: "actualizado", sin_cambios: "sin_cambios", omitido: "omitido", rechazado: "rechazado" };
const CONTEO_POR_ESTADO = {
  insertado: "insertados",
  actualizado: "actualizados",
  sin_cambios: "sinCambios",
  omitido: "omitidos",
  rechazado: "rechazados",
  no_procesado: "noProcesados",
};

const conteosVacios = (recibidos) => ({
  recibidos,
  insertados: 0,
  actualizados: 0,
  sinCambios: 0,
  omitidos: 0,
  rechazados: 0,
  noProcesados: 0,
});

const firma = (clasificacion) => clasificacion.filas.map((f) => `${f.filaExcel}:${f.estado}:${f.existenteId ?? ""}`).join("|");

// Ejecuta `fn` con hasta 3 reintentos (esperas de 1 s, 3 s y 9 s)
export const conReintentos = async (fn, esperarMs) => {
  for (let intento = 0; ; intento += 1) {
    try {
      return await fn();
    } catch (error) {
      if (intento >= ESPERAS_REINTENTO.length) throw error;
      await esperarMs(ESPERAS_REINTENTO[intento]);
    }
  }
};

// Registro de una fila en el bloque de `filas` (sin valores undefined: Firestore no los acepta)
const registroDeFila = (fila, estado, { documentoId = null, aviso = null } = {}) => ({
  filaExcel: fila.filaExcel,
  clave: fila.clave ?? null,
  estado,
  documentoId: documentoId ?? fila.existenteId ?? null,
  errores: fila.errores,
  cambios: fila.cambios,
  aviso,
  reversion: null,
  ...(estado === "rechazado" && { crudos: fila.crudos }),
});

const escribirBitacora = async (almacen, usuario, tipoModificacion, detalles) => {
  try {
    const lote = almacen.lote();
    lote.set(`bitacoraactividades/${almacen.nuevoId("bitacoraactividades")}`, {
      modulo: "Importaciones",
      tipoModificacion,
      usuarioModifico: usuario.correo,
      fechaRegistro: almacen.marcaServidor(),
      detalles,
    });
    await lote.commit();
  } catch (e) {
    console.error("No se pudo registrar la bitácora de la importación:", e);
  }
};

const estadoFinal = (conteos, avisos) =>
  conteos.noProcesados > 0
    ? "interrumpida"
    : conteos.rechazados + conteos.omitidos > 0 || avisos > 0
      ? "completada_con_advertencias"
      : "completada";

// Productos y Empleados: cada tramo es un writeBatch con sus registros y su bloque de detalle
const escribirPorTramos = async ({ almacen, esquema, filas, id, usuario, conteos, alAvanzar, esperarMs }) => {
  const auditoria = () => ({
    tipoModificacion: "Importación Excel",
    usuarioModifico: usuario.correo,
    fechaModificacion: almacen.marcaServidor(),
    importacionId: id,
  });

  // Los códigos EMP-NNNN que falten se reservan todos juntos, en una sola transacción
  const sinCodigo = filas.filter((f) => f.estado === "nuevo" && esquema.id === "empleados" && !f.documento.codigoEmpleado);
  const codigos = await reservarCodigosEmpleado(almacen, sinCodigo.length);
  sinCodigo.forEach((f, i) => {
    f.documento = { ...f.documento, codigoEmpleado: codigos[i] };
    f.clave = codigos[i];
  });

  // Los IDs se fijan antes de escribir para que un reintento no cree documentos distintos
  const ids = new Map(filas.filter((f) => f.estado === "nuevo").map((f) => [f.filaExcel, almacen.nuevoId(esquema.coleccion)]));

  const bloques = bloquesDeFilas(filas);
  let procesadas = 0;
  for (let b = 0; b < bloques.length; b += 1) {
    const bloque = bloques[b];
    const registros = bloque.filas.map((f) =>
      registroDeFila(f, ESTADO_FINAL[f.estado], { documentoId: ids.get(f.filaExcel) }),
    );
    try {
      await conReintentos(async () => {
        const lote = almacen.lote();
        bloque.filas.forEach((f) => {
          if (f.estado === "nuevo") {
            const docId = ids.get(f.filaExcel);
            lote.set(`${esquema.coleccion}/${docId}`, {
              ...f.documento,
              ...(esquema.id === "empleados" && { empleadoId: docId }),
              fechaRegistro: f.documento.fechaRegistro ?? almacen.marcaServidor(),
              ...auditoria(),
            });
          } else if (f.estado === "actualizar") {
            lote.update(`${esquema.coleccion}/${f.existenteId}`, { ...f.documento, ...auditoria() });
          }
        });
        lote.set(`importaciones/${id}/filas/${bloque.id}`, { desde: bloque.desde, hasta: bloque.hasta, filas: registros });
        await lote.commit();
      }, esperarMs);
    } catch (error) {
      await registrarNoProcesados(almacen, id, bloques.slice(b), conteos);
      return { error: error.message || String(error) };
    }

    registros.forEach((r) => {
      conteos[CONTEO_POR_ESTADO[r.estado]] += 1;
    });
    procesadas += bloque.filas.length;
    await actualizarImportacion(almacen, id, { conteos });
    await renovarCandado(almacen, esquema.id).catch(() => {});
    alAvanzar({ procesadas, total: filas.length, conteos: { ...conteos } });
  }
  return { error: null };
};

// Deja registradas como no procesadas las filas de los tramos que no se escribieron
const registrarNoProcesados = async (almacen, id, bloquesPendientes, conteos) => {
  bloquesPendientes.forEach((b) => {
    conteos.noProcesados += b.filas.length;
  });
  try {
    const lote = almacen.lote();
    bloquesPendientes.forEach((b) =>
      lote.set(`importaciones/${id}/filas/${b.id}`, {
        desde: b.desde,
        hasta: b.hasta,
        filas: b.filas.map((f) => registroDeFila(f, "no_procesado")),
      }),
    );
    await lote.commit();
  } catch (e) {
    // El conteo `noProcesados` del documento principal alcanza para reconstruirlo
    console.error("No se pudo registrar el detalle de filas no procesadas:", e);
  }
};

export const ejecutarImportacion = async ({
  almacen,
  cuentas,
  esquema,
  encabezados,
  filas,
  clasificacion,
  modo,
  archivo,
  usuario,
  alAvanzar = () => {},
  esperarMs = esperar,
}) => {
  const id = almacen.nuevoId("importaciones");
  const { ahora } = await tomarCandado(almacen, esquema.id, { importacionId: id, uid: usuario.uid, correo: usuario.correo });

  try {
    // Revalidación con los datos actuales: entre la vista previa y la confirmación pudo cambiar la base
    const contexto = await cargarContexto(almacen, esquema);
    const vigente = validar({ esquema, encabezados, filas, modo, contexto });
    if (firma(vigente) !== firma(clasificacion)) throw new ErrorRevalidacion(vigente);

    const folio = await siguienteFolio(almacen, ahora);
    const conteos = conteosVacios(vigente.filas.length);
    await crearImportacion(almacen, { id, folio, modulo: esquema.id, modo, archivo, responsable: usuario, conteos });

    const resultado = esquema.soloCreacion
      ? await crearCuentasDeUno({ almacen, cuentas, esquema, filas: vigente.filas, id, usuario, conteos, alAvanzar, esperarMs })
      : await escribirPorTramos({ almacen, esquema, filas: vigente.filas, id, usuario, conteos, alAvanzar, esperarMs });

    const estado = estadoFinal(conteos, resultado.avisos ?? 0);
    await conReintentos(
      () => actualizarImportacion(almacen, id, { estado, conteos, error: resultado.error, fechaFin: almacen.marcaServidor() }),
      esperarMs,
    );
    await escribirBitacora(almacen, usuario, "Importación Excel", { folio, modulo: esquema.id, conteos });
    return { id, folio, estado, conteos };
  } finally {
    await liberarCandado(almacen, esquema.id).catch(() => {});
  }
};

// Se completa en la Tarea 13
const crearCuentasDeUno = async () => {
  throw new Error("Importación de usuarios no implementada");
};
