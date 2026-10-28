import { describe, expect, test } from "vitest";
import { cargarContexto } from "../../src/importacion/contexto";
import { ErrorRevalidacion, ejecutarImportacion } from "../../src/importacion/ejecutar";
import { ESQUEMAS } from "../../src/importacion/esquemas";
import { ErrorCandado } from "../../src/importacion/historial";
import { validar } from "../../src/importacion/validar";
import { crearAlmacenFalso, crearCuentasFalsas } from "./falsos";

const usuario = { uid: "u-admin", correo: "admin@comisariato.hn", rol: "SUPER ADMIN" };
const sinEspera = async () => {};

const baseProductos = () => ({
  "categorias/c1": { nombre: "Abarrotes" },
  "parametros/general": { porcentajeInteres: 15 },
});

const ENC_P = ["Código", "Nombre", "Categoría", "Precio de contado", "Stock"];
const filaP = (i, extra = {}) => ({
  filaExcel: i + 2,
  valores: { Código: `P-${i}`, Nombre: `Producto ${i}`, Categoría: "Abarrotes", "Precio de contado": 10, Stock: 5, ...extra },
});

// Prepara la clasificación igual que lo hace la vista previa
const preparar = async (almacen, esquema, encabezados, filas, modo = "solo_nuevos") => {
  const contexto = await cargarContexto(almacen, esquema);
  return validar({ esquema, encabezados, filas, modo, contexto });
};

const ejecutar = async (almacen, esquema, encabezados, filas, { modo = "solo_nuevos", alAvanzar, cuentas } = {}) => {
  const clasificacion = await preparar(almacen, esquema, encabezados, filas, modo);
  return ejecutarImportacion({
    almacen,
    cuentas: cuentas ?? crearCuentasFalsas(),
    esquema,
    encabezados,
    filas,
    clasificacion,
    modo,
    archivo: { nombre: "datos.xlsx", pesoBytes: 100, hoja: "Hoja1" },
    usuario,
    alAvanzar,
    esperarMs: sinEspera,
  });
};

const docsDe = (a, coleccion) => [...a.datos.entries()].filter(([r]) => r.startsWith(`${coleccion}/`) && r.split("/").length === 2);

describe("ejecutar Productos", () => {
  test("450 filas nuevas: 3 tramos, historial completo, candado liberado y bitácora", async () => {
    const a = crearAlmacenFalso(baseProductos());
    const filas = Array.from({ length: 450 }, (_, i) => filaP(i));
    const progresos = [];
    const r = await ejecutar(a, ESQUEMAS.productos, ENC_P, filas, { alAvanzar: (p) => progresos.push(p.procesadas) });

    expect(r).toMatchObject({ estado: "completada", folio: "IMP-2026-0001" });
    expect(r.conteos).toMatchObject({ recibidos: 450, insertados: 450, noProcesados: 0 });
    expect(docsDe(a, "productos")).toHaveLength(450);
    expect(progresos).toEqual([200, 400, 450]);

    const imp = await a.leer(`importaciones/${r.id}`);
    expect(imp).toMatchObject({ estado: "completada", folio: "IMP-2026-0001", modulo: "productos" });
    expect(imp.fechaFin).toBeInstanceOf(Date);
    const bloques = await a.leerTodos(`importaciones/${r.id}/filas`);
    expect(bloques.map((b) => b.id)).toEqual(["b0001", "b0002", "b0003"]);
    expect(bloques[0].filas[0]).toMatchObject({ filaExcel: 2, estado: "insertado", clave: "P-0" });

    expect(await a.leer("importaciones_bloqueo/productos")).toBeNull();
    const bitacora = await a.leerTodos("bitacoraactividades");
    expect(bitacora).toHaveLength(1);
    expect(bitacora[0]).toMatchObject({ modulo: "Importaciones", tipoModificacion: "Importación Excel", usuarioModifico: usuario.correo });
  });

  test("los documentos creados llevan auditoría, fecha de registro y estado", async () => {
    const a = crearAlmacenFalso(baseProductos());
    const r = await ejecutar(a, ESQUEMAS.productos, ENC_P, [filaP(0)]);
    const [[, doc]] = docsDe(a, "productos");
    expect(doc).toMatchObject({
      productoId: "P-0",
      estado: "Activo",
      importacionId: r.id,
      tipoModificacion: "Importación Excel",
      usuarioModifico: usuario.correo,
    });
    expect(doc.fechaRegistro).toBeInstanceOf(Date);
    expect(doc.fechaModificacion).toBeInstanceOf(Date);
  });

  test("actualizar escribe solo los campos que cambiaron más la auditoría", async () => {
    const a = crearAlmacenFalso({
      ...baseProductos(),
      "productos/x": { productoId: "P-0", nombre: "Producto 0", categoria: "Abarrotes", precioContado: 10, precioCredito: 11.5, stock: 99, imagenUrl: "foto.png" },
    });
    const r = await ejecutar(a, ESQUEMAS.productos, ENC_P, [filaP(0)], { modo: "nuevos_y_actualizar" });
    expect(r.conteos.actualizados).toBe(1);
    const doc = await a.leer("productos/x");
    expect(doc).toMatchObject({ stock: 5, precioContado: 10, imagenUrl: "foto.png", importacionId: r.id });
    const [bloque] = await a.leerTodos(`importaciones/${r.id}/filas`);
    expect(bloque.filas[0]).toMatchObject({ estado: "actualizado", documentoId: "x", cambios: [{ campo: "stock", anterior: 99, nuevo: 5 }] });
  });

  test("dos fallos de escritura de un tramo se reintentan y la importación termina bien", async () => {
    const a = crearAlmacenFalso(baseProductos());
    a.fallarCommitCuando((rutas) => rutas.some((r) => r.startsWith("productos/")), 2);
    const r = await ejecutar(a, ESQUEMAS.productos, ENC_P, [filaP(0), filaP(1)]);
    expect(r.estado).toBe("completada");
    expect(docsDe(a, "productos")).toHaveLength(2);
  });

  test("4 fallos seguidos en el segundo tramo: interrumpida, primer tramo escrito y 250 no procesadas", async () => {
    const a = crearAlmacenFalso(baseProductos());
    const filas = Array.from({ length: 450 }, (_, i) => filaP(i));
    let avisado = false;
    const r = await ejecutar(a, ESQUEMAS.productos, ENC_P, filas, {
      alAvanzar: () => {
        if (!avisado) {
          avisado = true;
          a.fallarCommit(4);
        }
      },
    });
    expect(r.estado).toBe("interrumpida");
    expect(r.conteos).toMatchObject({ insertados: 200, noProcesados: 250 });
    expect(docsDe(a, "productos")).toHaveLength(200);
    const imp = await a.leer(`importaciones/${r.id}`);
    expect(imp.estado).toBe("interrumpida");
    expect(imp.error).toMatch(/Fallo simulado/);
    expect(await a.leer("importaciones_bloqueo/productos")).toBeNull();

    // Recuperación: reimportar en "solo nuevos" omite lo que ya entró y no duplica
    const r2 = await ejecutar(a, ESQUEMAS.productos, ENC_P, filas);
    expect(r2.conteos).toMatchObject({ insertados: 250, omitidos: 200 });
    expect(docsDe(a, "productos")).toHaveLength(450);
  });

  test("candado ocupado por otra persona: ErrorCandado y no se crea historial", async () => {
    const a = crearAlmacenFalso({
      ...baseProductos(),
      "importaciones_bloqueo/productos": { uid: "otro", correo: "otro@x.hn", actualizado: new Date("2026-10-28T11:59:00Z") },
    });
    await expect(ejecutar(a, ESQUEMAS.productos, ENC_P, [filaP(0)])).rejects.toBeInstanceOf(ErrorCandado);
    expect(await a.leerTodos("importaciones")).toEqual([]);
  });

  test("si la base cambió desde la vista previa: ErrorRevalidacion con la nueva clasificación", async () => {
    const a = crearAlmacenFalso(baseProductos());
    const clasificacion = await preparar(a, ESQUEMAS.productos, ENC_P, [filaP(0)]);
    a.datos.set("productos/nuevo", { productoId: "P-0" });
    const error = await ejecutarImportacion({
      almacen: a,
      cuentas: crearCuentasFalsas(),
      esquema: ESQUEMAS.productos,
      encabezados: ENC_P,
      filas: [filaP(0)],
      clasificacion,
      modo: "solo_nuevos",
      archivo: { nombre: "a.xlsx", pesoBytes: 1, hoja: "H" },
      usuario,
      esperarMs: sinEspera,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorRevalidacion);
    expect(error.clasificacionNueva.filas[0].estado).toBe("omitido");
    expect(await a.leerTodos("importaciones")).toEqual([]);
    expect(await a.leer("importaciones_bloqueo/productos")).toBeNull();
  });

  test("con rechazados u omitidos termina con advertencias", async () => {
    const a = crearAlmacenFalso(baseProductos());
    const r = await ejecutar(a, ESQUEMAS.productos, ENC_P, [filaP(0), filaP(1, { Nombre: "" })]);
    expect(r.estado).toBe("completada_con_advertencias");
    expect(r.conteos).toMatchObject({ insertados: 1, rechazados: 1 });
    const [bloque] = await a.leerTodos(`importaciones/${r.id}/filas`);
    expect(bloque.filas[1]).toMatchObject({ estado: "rechazado", crudos: expect.objectContaining({ Nombre: "" }) });
  });
});

describe("ejecutar Empleados", () => {
  const ENC_E = ["Nombres", "Apellidos", "DNI", "Departamento"];
  const filaE = (i, dni) => ({ filaExcel: i + 2, valores: { Nombres: `N${i}`, Apellidos: "A", DNI: dni, Departamento: "RRHH" } });

  test("3 empleados sin código reciben códigos consecutivos en una sola reserva y empleadoId", async () => {
    const a = crearAlmacenFalso({ "departamentos/d": { nombre: "RRHH" }, "empleados/viejo": { codigoEmpleado: "EMP-0007" } });
    const r = await ejecutar(a, ESQUEMAS.empleados, ENC_E, [
      filaE(0, "0801199000001"),
      filaE(1, "0801199000002"),
      filaE(2, "0801199000003"),
    ]);
    expect(r.conteos.insertados).toBe(3);
    const nuevos = docsDe(a, "empleados").filter(([ruta]) => ruta !== "empleados/viejo");
    expect(nuevos.map(([, d]) => d.codigoEmpleado).sort()).toEqual(["EMP-0008", "EMP-0009", "EMP-0010"]);
    nuevos.forEach(([ruta, d]) => expect(d.empleadoId).toBe(ruta.split("/")[1]));
    expect((await a.leer("contadores/empleados")).ultimo).toBe(10);
  });
});
