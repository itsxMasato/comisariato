import { beforeEach, describe, expect, test } from "vitest";
import { deshacerImportacion, puedeDeshacer } from "../../src/importacion/deshacer";
import { setDynamicRoles } from "../../src/utils/roles";
import { crearAlmacenFalso } from "./falsos";

const H = 3600000;
const ahora = new Date("2026-10-28T12:00:00Z");
const responsable = { uid: "u-imp", correo: "imp@x.hn", rol: "IMPORTADOR" };

const importacion = (extra = {}) => ({
  id: "imp1",
  folio: "IMP-2026-0001",
  modulo: "productos",
  estado: "completada",
  fechaFin: new Date(ahora - 1 * H),
  ultimaActividad: new Date(ahora - 1 * H),
  conteos: { insertados: 1, actualizados: 0 },
  responsable,
  reversion: null,
  ...extra,
});

beforeEach(() =>
  setDynamicRoles([
    { nombre: "IMPORTADOR", permisos: { PRODUCTOS: ["VIEW", "IMPORT"] } },
    { nombre: "SIN IMPORT", permisos: { PRODUCTOS: ["VIEW"] } },
    { nombre: "SUPERVISOR", permisos: { IMPORTACIONES: ["VIEW", "EDIT"] } },
  ]),
);

describe("puedeDeshacer", () => {
  const quien = { uid: "u-imp", role: "IMPORTADOR" };

  test("dentro de las 12 horas sí; pasadas, no", () => {
    expect(puedeDeshacer(importacion({ fechaFin: new Date(ahora - (12 * H - 60000)) }), quien, ahora)).toMatchObject({ ok: true });
    expect(puedeDeshacer(importacion({ fechaFin: new Date(ahora - (12 * H + 60000)) }), quien, ahora)).toEqual({
      ok: false,
      motivo: "plazo_vencido",
    });
  });

  test("sin fechaFin el plazo cuenta desde la última actividad", () => {
    const imp = importacion({ estado: "interrumpida", fechaFin: null, ultimaActividad: new Date(ahora - 13 * H) });
    expect(puedeDeshacer(imp, quien, ahora).motivo).toBe("plazo_vencido");
  });

  test("restanteMs informa el tiempo que queda", () => {
    expect(puedeDeshacer(importacion(), quien, ahora).restanteMs).toBe(11 * H);
  });

  test("ya revertida o en proceso: estado", () => {
    expect(puedeDeshacer(importacion({ estado: "revertida" }), quien, ahora).motivo).toBe("estado");
    expect(puedeDeshacer(importacion({ estado: "en_proceso", ultimaActividad: new Date(ahora - 60000) }), quien, ahora).motivo).toBe("estado");
  });

  test("permisos: responsable sin IMPORT no; otro con IMPORTACIONES EDIT sí; otro sin él no", () => {
    expect(puedeDeshacer(importacion(), { uid: "u-imp", role: "SIN IMPORT" }, ahora).motivo).toBe("sin_permiso");
    expect(puedeDeshacer(importacion(), { uid: "u-otro", role: "SUPERVISOR" }, ahora).ok).toBe(true);
    expect(puedeDeshacer(importacion(), { uid: "u-otro", role: "IMPORTADOR" }, ahora).motivo).toBe("sin_permiso");
  });

  test("sin insertados ni actualizados no hay nada que revertir", () => {
    expect(puedeDeshacer(importacion({ conteos: { insertados: 0, actualizados: 0 } }), quien, ahora).motivo).toBe("nada_que_revertir");
  });

  test("una reversión interrumpida se puede reanudar aunque pasaron las 12 horas", () => {
    const imp = importacion({ estado: "revirtiendo", fechaFin: new Date(ahora - 20 * H), ultimaActividad: new Date(ahora - 30 * 60000) });
    expect(puedeDeshacer(imp, quien, ahora)).toMatchObject({ ok: true, reanudar: true });
  });
});

describe("deshacerImportacion", () => {
  const usuario = { uid: "u-imp", correo: "imp@x.hn", rol: "IMPORTADOR" };
  const marca = { importacionId: "imp1", tipoModificacion: "Importación Excel" };
  const filaReg = (filaExcel, estado, documentoId, extra = {}) => ({
    filaExcel,
    clave: `K${filaExcel}`,
    estado,
    documentoId,
    errores: [],
    cambios: [],
    aviso: null,
    reversion: null,
    ...extra,
  });

  const preparar = (datos, filas, impExtra = {}) =>
    crearAlmacenFalso(
      {
        "importaciones/imp1": importacion(impExtra),
        "importaciones/imp1/filas/b0001": { desde: 2, hasta: 2 + filas.length, filas },
        "parametros/general": { porcentajeInteres: 10 },
        ...datos,
      },
      { ahora },
    );

  const deshacer = (a, extra = {}) =>
    deshacerImportacion({ almacen: a, importacionId: "imp1", usuario, role: usuario.rol, esperarMs: async () => {}, ...extra });

  const reversionDe = async (a, i) => (await a.leer("importaciones/imp1/filas/b0001")).filas[i].reversion;

  test("borra el producto insertado y deja la importación revertida", async () => {
    const a = preparar({ "productos/p1": { productoId: "A-1", ...marca } }, [filaReg(2, "insertado", "p1")]);
    const r = await deshacer(a);
    expect(r.estado).toBe("revertida");
    expect(await a.leer("productos/p1")).toBeNull();
    expect((await reversionDe(a, 0)).estado).toBe("revertido");
    const imp = await a.leer("importaciones/imp1");
    expect(imp).toMatchObject({ estado: "revertida", reversion: { conteos: { revertidos: 1, parciales: 0, noRevertidos: 0 } } });
    expect(await a.leer("importaciones_bloqueo/productos")).toBeNull();
    const [bitacora] = await a.leerTodos("bitacoraactividades");
    expect(bitacora.tipoModificacion).toBe("Deshacer importación");
  });

  test.each([
    ["por ID de documento", { productoId: "p1" }],
    ["por SKU", { productoId: "a-1" }],
    ["dentro de items[]", { items: [{ productoId: "p1" }] }],
  ])("no borra un producto usado en un crédito %s", async (_, credito) => {
    const a = preparar(
      { "productos/p1": { productoId: "A-1", ...marca }, "creditos/c1": { creditoId: "CR-0042", ...credito } },
      [filaReg(2, "insertado", "p1")],
    );
    const r = await deshacer(a);
    expect(await a.leer("productos/p1")).not.toBeNull();
    expect(await reversionDe(a, 0)).toMatchObject({ estado: "no_revertido", motivo: "Usado en el crédito CR-0042" });
    expect(r.estado).toBe("revertida_parcial");
  });

  test("no borra un empleado con usuario vinculado", async () => {
    const a = preparar({ "empleados/e1": { codigoEmpleado: "EMP-1", uid: "u-9", ...marca } }, [filaReg(2, "insertado", "e1")], {
      modulo: "empleados",
    });
    setDynamicRoles([{ nombre: "IMPORTADOR", permisos: { EMPLEADOS: ["IMPORT"] } }]);
    await deshacer(a);
    expect(await a.leer("empleados/e1")).not.toBeNull();
    expect((await reversionDe(a, 0)).motivo).toBe("Tiene un usuario vinculado");
  });

  test.each([
    ["por ID de documento", { empleadoId: "e1" }],
    ["por DNI", { empleadoId: "0801199012345" }],
    ["por código de empleado", { empleadoId: "emp-0001" }],
  ])("no borra un empleado con un crédito que lo referencia %s", async (_, credito) => {
    setDynamicRoles([{ nombre: "IMPORTADOR", permisos: { EMPLEADOS: ["IMPORT"] } }]);
    const a = preparar(
      {
        "empleados/e1": { codigoEmpleado: "EMP-0001", dni: "0801199012345", ...marca },
        "creditos/c1": { creditoId: "CR-0007", ...credito },
      },
      [filaReg(2, "insertado", "e1")],
      { modulo: "empleados" },
    );
    await deshacer(a);
    expect(await a.leer("empleados/e1")).not.toBeNull();
    expect((await reversionDe(a, 0)).motivo).toBe("Usado en el crédito CR-0007");
  });

  test("no borra un registro editado después de la importación", async () => {
    const a = preparar({ "productos/p1": { productoId: "A-1", importacionId: "imp1", tipoModificacion: "Actualización de Producto" } }, [
      filaReg(2, "insertado", "p1"),
    ]);
    await deshacer(a);
    expect(await a.leer("productos/p1")).not.toBeNull();
    expect((await reversionDe(a, 0)).motivo).toBe("Modificado después de la importación");
  });

  test("restaura solo los campos que conservan el valor importado y recalcula el precio de crédito", async () => {
    const a = preparar(
      { "productos/p1": { productoId: "A-1", precioContado: 20, precioCredito: 23, stock: 7 } },
      [
        filaReg(2, "actualizado", "p1", {
          cambios: [
            { campo: "precioContado", anterior: 10, nuevo: 20 },
            { campo: "precioCredito", anterior: 11.5, nuevo: 23 },
            { campo: "stock", anterior: 99, nuevo: 50 },
          ],
        }),
      ],
      { conteos: { insertados: 0, actualizados: 1 } },
    );
    const r = await deshacer(a);
    expect(await a.leer("productos/p1")).toMatchObject({
      precioContado: 10,
      precioCredito: 11,
      stock: 7,
      tipoModificacion: "Reversión de importación",
      usuarioModifico: "imp@x.hn",
    });
    expect(await reversionDe(a, 0)).toMatchObject({ estado: "revertido_parcial", camposNoRevertidos: ["stock"] });
    expect(r.conteos).toEqual({ revertidos: 0, parciales: 1, noRevertidos: 0 });
  });

  test("usuario creado: se deshabilita y se desvincula del empleado", async () => {
    setDynamicRoles([{ nombre: "IMPORTADOR", permisos: { USUARIOS: ["IMPORT"] } }]);
    const a = preparar(
      {
        "usuarios/u-1": { correo: "a@x.hn", estado: "Activo", empleadoId: "e1" },
        "empleados/e1": { codigoEmpleado: "EMP-1", uid: "u-1", usuarioId: "u-1" },
      },
      [filaReg(2, "insertado", "u-1")],
      { modulo: "usuarios" },
    );
    await deshacer(a);
    expect(await a.leer("usuarios/u-1")).toMatchObject({ estado: "Deshabilitado", tipoModificacion: "Reversión de importación" });
    expect(await a.leer("empleados/e1")).toEqual({ codigoEmpleado: "EMP-1" });
  });

  test("reanudar una reversión interrumpida salta las filas ya revertidas", async () => {
    const a = preparar(
      { "productos/p2": { productoId: "B-2", ...marca } },
      [
        filaReg(2, "insertado", "p1", { reversion: { estado: "revertido", camposNoRevertidos: [], motivo: null } }),
        filaReg(3, "insertado", "p2"),
      ],
      {
        estado: "revirtiendo",
        ultimaActividad: new Date(ahora - 30 * 60000),
        reversion: { responsable: usuario, fechaInicio: new Date(ahora - H), fechaFin: null, conteos: { revertidos: 1, parciales: 0, noRevertidos: 0 } },
      },
    );
    const r = await deshacer(a);
    expect(r.estado).toBe("revertida");
    expect(r.conteos.revertidos).toBe(2);
    expect(await a.leer("productos/p2")).toBeNull();
  });

  test("informa el avance fila por fila con el total, para mostrar una barra de progreso", async () => {
    const a = preparar(
      {
        "productos/p1": { productoId: "A-1", ...marca },
        "productos/p2": { productoId: "B-2", ...marca },
        "productos/p3": { productoId: "C-3", ...marca },
      },
      [filaReg(2, "insertado", "p1"), filaReg(3, "rechazado", null), filaReg(4, "insertado", "p2"), filaReg(5, "insertado", "p3")],
      { conteos: { insertados: 3, actualizados: 0 } },
    );
    const avances = [];
    await deshacer(a, { alAvanzar: (p) => avances.push(`${p.etapa}:${p.procesadas}/${p.total}`) });
    expect(avances[0]).toBe("preparando:0/0");
    expect(avances).toContain("revisando:1/3");
    expect(avances).toContain("revisando:3/3");
    expect(avances[avances.length - 1]).toBe("guardando:3/3");
  });

  test("sin permiso o fuera de plazo no hace nada", async () => {
    const a = preparar({ "productos/p1": { productoId: "A-1", ...marca } }, [filaReg(2, "insertado", "p1")], {
      fechaFin: new Date(ahora - 13 * H),
    });
    await expect(deshacer(a)).rejects.toMatchObject({ motivo: "plazo_vencido" });
    expect(await a.leer("productos/p1")).not.toBeNull();
    expect(await a.leer("importaciones_bloqueo/productos")).toBeNull();
  });
});
