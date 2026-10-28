// Deshacer una importación dentro de las 12 horas siguientes a su fin (§6.5 de la especificación)
import { ACTIONS, MODULES, hasPermission } from "../utils/roles";
import { normalizarClave } from "../utils/validaciones";
import { escribirBitacora, conReintentos } from "./ejecutar";
import { esperar } from "./esperar";
import { redondear2 } from "./esquemas/comunes";
import { ESQUEMAS } from "./esquemas";
import { actualizarImportacion, estadoMostrado, liberarCandado, renovarCandado, tomarCandado } from "./historial";
import { sonIguales } from "./validar";

export const PLAZO_DESHACER_MS = 12 * 60 * 60 * 1000;
const ESTADOS_DESHACIBLES = ["completada", "completada_con_advertencias", "interrumpida", "interrumpida_sin_actividad"];

export class ErrorDeshacer extends Error {
  constructor(motivo) {
    super(`No se puede deshacer la importación: ${motivo}`);
    this.name = "ErrorDeshacer";
    this.motivo = motivo;
  }
}

export const puedeDeshacer = (importacion, { uid, role }, ahora) => {
  const estado = estadoMostrado(importacion, ahora);
  const reanudar = importacion.estado === "revirtiendo" && estado === "interrumpida_sin_actividad";
  if (!reanudar && (!ESTADOS_DESHACIBLES.includes(estado) || importacion.estado === "revirtiendo")) {
    return { ok: false, motivo: "estado" };
  }

  const { insertados = 0, actualizados = 0 } = importacion.conteos || {};
  if (insertados + actualizados === 0) return { ok: false, motivo: "nada_que_revertir" };

  const esquema = ESQUEMAS[importacion.modulo];
  const esResponsable = importacion.responsable?.uid === uid && hasPermission(role, esquema?.moduloPermiso, ACTIONS.IMPORT);
  if (!esResponsable && !hasPermission(role, MODULES.IMPORTACIONES, ACTIONS.EDIT)) return { ok: false, motivo: "sin_permiso" };

  // Una reversión ya iniciada se puede terminar aunque haya pasado el plazo
  if (reanudar) return { ok: true, reanudar: true, restanteMs: 0 };

  const base = importacion.fechaFin ?? importacion.ultimaActividad;
  const restanteMs = PLAZO_DESHACER_MS - (ahora - base);
  return restanteMs > 0 ? { ok: true, reanudar: false, restanteMs } : { ok: false, motivo: "plazo_vencido" };
};

// Códigos de los créditos o reservas que referencian un producto o un empleado
const creditosQueUsan = (creditos, { productoDocId, sku, empleadoDocId }) =>
  creditos.filter((c) => {
    if (empleadoDocId) return c.empleadoId === empleadoDocId;
    const refs = [c.productoId, ...(c.items || []).flatMap((it) => [it.productoId, it.id])].filter(Boolean);
    return refs.some((ref) => ref === productoDocId || (sku && normalizarClave(ref) === sku));
  });

const codigoCredito = (c) => c.creditoId || c.orderId || c.id;

const editadoDespues = (doc, importacionId) => doc.importacionId !== importacionId || doc.tipoModificacion !== "Importación Excel";

// Decide qué hacer con una fila. Devuelve { reversion, operaciones: [[tipo, ruta, datos]] }
const planDeFila = async ({ almacen, esquema, fila, importacionId, creditos, porcentajeInteres, auditoria }) => {
  const res = (estado, motivo = null, camposNoRevertidos = [], operaciones = []) => ({
    reversion: { estado, camposNoRevertidos, motivo },
    operaciones,
  });
  const ruta = `${esquema.coleccion}/${fila.documentoId}`;
  const doc = await almacen.leer(ruta);

  if (esquema.id === "usuarios") {
    if (!doc) return res("no_revertido", "El usuario ya no existe");
    const ops = [];
    if (doc.estado !== "Deshabilitado") {
      ops.push(["update", ruta, { estado: "Deshabilitado", ...auditoria("fechaActualizacion") }]);
    }
    if (doc.empleadoId) {
      const empleado = await almacen.leer(`empleados/${doc.empleadoId}`);
      if (empleado && (empleado.uid === fila.documentoId || empleado.usuarioId === fila.documentoId)) {
        ops.push(["update", `empleados/${doc.empleadoId}`, { uid: almacen.campoBorrado(), usuarioId: almacen.campoBorrado() }]);
      }
    }
    return res("revertido", null, [], ops);
  }

  if (fila.estado === "insertado") {
    if (!doc) return res("revertido");
    if (editadoDespues(doc, importacionId)) return res("no_revertido", "Modificado después de la importación");
    const usados =
      esquema.id === "productos"
        ? creditosQueUsan(creditos, { productoDocId: fila.documentoId, sku: normalizarClave(doc.productoId) })
        : creditosQueUsan(creditos, { empleadoDocId: fila.documentoId });
    if (usados.length) return res("no_revertido", `Usado en el crédito ${codigoCredito(usados[0])}`);
    if (esquema.id === "empleados" && (doc.uid || doc.usuarioId)) return res("no_revertido", "Tiene un usuario vinculado");
    return res("revertido", null, [], [["delete", ruta]]);
  }

  // Actualizado: se restaura cada campo que conserva el valor importado
  if (!doc) return res("no_revertido", "El registro ya no existe");
  const restaurar = {};
  const noRevertidos = [];
  fila.cambios
    .filter((c) => c.campo !== "precioCredito")
    .forEach((c) => {
      if (sonIguales(doc[c.campo], c.nuevo)) {
        restaurar[c.campo] = c.anterior === null ? almacen.campoBorrado() : c.anterior;
      } else noRevertidos.push(c.campo);
    });
  if (restaurar.precioContado !== undefined && typeof restaurar.precioContado === "number") {
    restaurar.precioCredito = redondear2(restaurar.precioContado * (1 + porcentajeInteres / 100));
  }
  if (!Object.keys(restaurar).length) return res("no_revertido", "Ningún campo conserva el valor importado", noRevertidos);
  return res(noRevertidos.length ? "revertido_parcial" : "revertido", null, noRevertidos, [
    ["update", ruta, { ...restaurar, ...auditoria("fechaModificacion") }],
  ]);
};

const CONTEO = { revertido: "revertidos", revertido_parcial: "parciales", no_revertido: "noRevertidos" };

export const deshacerImportacion = async ({ almacen, importacionId, usuario, role, alAvanzar = () => {}, esperarMs = esperar }) => {
  const inicial = await almacen.leer(`importaciones/${importacionId}`);
  const esquema = ESQUEMAS[inicial.modulo];
  const { ahora } = await tomarCandado(almacen, esquema.id, { importacionId, uid: usuario.uid, correo: usuario.correo });

  try {
    const importacion = await almacen.leer(`importaciones/${importacionId}`);
    const permiso = puedeDeshacer(importacion, { uid: usuario.uid, role }, ahora);
    if (!permiso.ok) throw new ErrorDeshacer(permiso.motivo);

    const conteos = permiso.reanudar ? { ...importacion.reversion.conteos } : { revertidos: 0, parciales: 0, noRevertidos: 0 };
    const reversion = permiso.reanudar ? importacion.reversion : { responsable: usuario, fechaInicio: ahora, fechaFin: null, conteos };
    await actualizarImportacion(almacen, importacionId, { estado: "revirtiendo", reversion });

    const [creditos, parametros, bloques] = await Promise.all([
      esquema.id === "usuarios" ? [] : almacen.leerTodos("creditos"),
      almacen.leer("parametros/general"),
      almacen.leerTodos(`importaciones/${importacionId}/filas`),
    ]);
    const porcentajeInteres = parametros?.porcentajeInteres ?? 15;
    const auditoria = (campoFecha) => ({
      tipoModificacion: "Reversión de importación",
      usuarioModifico: usuario.correo,
      [campoFecha]: almacen.marcaServidor(),
    });

    bloques.sort((x, y) => x.id.localeCompare(y.id));
    for (const bloque of bloques) {
      const pendientes = bloque.filas.filter((f) => !f.reversion && ["insertado", "actualizado"].includes(f.estado));
      if (!pendientes.length) continue;

      const filas = [...bloque.filas];
      const operaciones = [];
      for (const fila of pendientes) {
        const plan = await planDeFila({ almacen, esquema, fila, importacionId, creditos, porcentajeInteres, auditoria });
        filas[filas.indexOf(fila)] = { ...fila, reversion: plan.reversion };
        operaciones.push(...plan.operaciones);
      }
      try {
        await conReintentos(async () => {
          const lote = almacen.lote();
          operaciones.forEach(([tipo, ruta, datos]) => lote[tipo](ruta, datos));
          lote.set(`importaciones/${importacionId}/filas/${bloque.id}`, { desde: bloque.desde, hasta: bloque.hasta, filas });
          await lote.commit();
        }, esperarMs);
      } catch (error) {
        // Queda en "revirtiendo": se puede reanudar desde el historial
        await actualizarImportacion(almacen, importacionId, { error: error.message || String(error) }).catch(() => {});
        return { estado: "revirtiendo", conteos, error: error.message || String(error) };
      }

      filas.forEach((f, i) => {
        if (f.reversion && !bloque.filas[i].reversion) conteos[CONTEO[f.reversion.estado]] += 1;
      });
      await actualizarImportacion(almacen, importacionId, { reversion: { ...reversion, conteos } }).catch(() => {});
      await renovarCandado(almacen, esquema.id).catch(() => {});
      alAvanzar({ conteos: { ...conteos } });
    }

    const estado = conteos.parciales + conteos.noRevertidos === 0 ? "revertida" : "revertida_parcial";
    await conReintentos(
      () =>
        actualizarImportacion(almacen, importacionId, {
          estado,
          error: null,
          reversion: { ...reversion, fechaFin: almacen.marcaServidor(), conteos },
        }),
      esperarMs,
    );
    await escribirBitacora(almacen, usuario, "Deshacer importación", { folio: importacion.folio, modulo: esquema.id, conteos });
    return { estado, conteos };
  } finally {
    await liberarCandado(almacen, esquema.id).catch(() => {});
  }
};
