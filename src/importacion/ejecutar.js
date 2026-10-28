// Ejecución de una importación ya validada (§6 de la especificación).
// Productos y Empleados: tramos atómicos de 200 filas. Usuarios: de a una cuenta.
import { reservarCodigosEmpleado, siguienteFolio } from "../utils/contadores";
import { cargarContexto } from "./contexto";
import { generarContrasena } from "./contrasena";
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

// Errores de Auth que obligan a detenerse: lo que falta queda para reintentar más tarde.
// Un error de red tampoco se reintenta: la cuenta pudo crearse sin que llegara la respuesta.
const ERRORES_DE_CORTE = {
  "auth/too-many-requests": "Límite de Firebase alcanzado, reintentar más tarde",
  "auth/quota-exceeded": "Límite de Firebase alcanzado, reintentar más tarde",
  "auth/network-request-failed": "Sin conexión con Firebase, reintentar más tarde",
};

// Usuarios: de a una cuenta (Auth → documento → vínculo con empleado → correo de contraseña)
const crearCuentasDeUno = async ({ almacen, cuentas, esquema, filas, id, usuario, conteos, alAvanzar, esperarMs }) => {
  const [bloque] = bloquesDeFilas(filas); // el tope de 50 filas cabe en un bloque
  const registros = bloque.filas.map((f) => registroDeFila(f, f.estado === "nuevo" ? "no_procesado" : ESTADO_FINAL[f.estado]));
  let avisos = 0;
  let error = null;

  const guardarAvance = async () => {
    Object.keys(CONTEO_POR_ESTADO).forEach((estado) => {
      conteos[CONTEO_POR_ESTADO[estado]] = registros.filter((r) => r.estado === estado).length;
    });
    const lote = almacen.lote();
    lote.set(`importaciones/${id}/filas/${bloque.id}`, { desde: bloque.desde, hasta: bloque.hasta, filas: registros });
    await conReintentos(() => lote.commit(), esperarMs).catch((e) => console.error("No se pudo guardar el avance:", e));
    await actualizarImportacion(almacen, id, { conteos }).catch(() => {});
    await renovarCandado(almacen, esquema.id).catch(() => {});
  };

  await guardarAvance();
  for (let i = 0; i < bloque.filas.length; i += 1) {
    const fila = bloque.filas[i];
    if (fila.estado !== "nuevo") continue;
    const doc = fila.documento;
    const actualizarRegistro = (estado, extra = {}) => {
      registros[i] = { ...registros[i], estado, ...extra };
      if (extra.aviso) avisos += 1;
    };

    let cuenta;
    try {
      cuenta = await cuentas.crear(doc.correo, generarContrasena());
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        actualizarRegistro("omitido", { aviso: null, errores: [{ campo: "correo", mensaje: "Ya existe una cuenta con este correo en Authentication", valorRecibido: doc.correo }] });
      } else if (ERRORES_DE_CORTE[e.code]) {
        error = ERRORES_DE_CORTE[e.code];
        for (let j = i; j < registros.length; j += 1) {
          if (registros[j].estado === "no_procesado") registros[j] = { ...registros[j], aviso: error };
        }
        await cuentas.cerrarSecundaria().catch(() => {});
        break;
      } else {
        actualizarRegistro("rechazado", { errores: [{ campo: "correo", mensaje: `No se pudo crear la cuenta: ${e.code || e.message}`, valorRecibido: doc.correo }] });
      }
      await cuentas.cerrarSecundaria().catch(() => {});
      await guardarAvance();
      continue;
    }

    try {
      await conReintentos(async () => {
        const lote = almacen.lote();
        lote.set(`usuarios/${cuenta.uid}`, {
          usuarioId: cuenta.uid,
          uid: cuenta.uid,
          empleadoId: doc.empleadoId,
          nombre: doc.nombre,
          correo: doc.correo,
          rol: doc.rol,
          estado: "Activo",
          tipoModificacion: "Importación Excel",
          usuarioModifico: usuario.correo,
          fechaRegistro: almacen.marcaServidor(),
          fechaActualizacion: almacen.marcaServidor(),
          importacionId: id,
        });
        await lote.commit();
      }, esperarMs);
    } catch {
      // Una cuenta sin documento no debe quedar: se borra la recién creada
      const borrada = await cuenta.borrar().then(() => true, () => false);
      actualizarRegistro("rechazado", {
        documentoId: cuenta.uid,
        errores: [{ campo: "correo", mensaje: "No se pudo guardar el usuario; la cuenta se eliminó", valorRecibido: doc.correo }],
        ...(!borrada && { aviso: `Cuenta huérfana: eliminar ${doc.correo} en la consola de Authentication` }),
      });
      await cuentas.cerrarSecundaria().catch(() => {});
      await guardarAvance();
      continue;
    }

    let aviso = null;
    if (doc.empleadoId) {
      await conReintentos(() => almacen.actualizar(`empleados/${doc.empleadoId}`, { uid: cuenta.uid, usuarioId: cuenta.uid }), esperarMs).catch(() => {
        aviso = "Usuario creado, pero no se pudo vincular al empleado";
      });
    }
    await cuentas.enviarRestablecimiento(doc.correo).catch(() => {
      aviso = aviso ? `${aviso}. Correo no enviado: usar «Restablecer contraseña»` : "Correo no enviado: usar «Restablecer contraseña»";
    });
    await cuentas.cerrarSecundaria().catch(() => {});
    actualizarRegistro("insertado", { documentoId: cuenta.uid, aviso });
    await guardarAvance();
    alAvanzar({ procesadas: i + 1, total: bloque.filas.length, conteos: { ...conteos } });
  }

  await guardarAvance();
  return { error, avisos };
};
