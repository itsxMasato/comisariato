import { describe, expect, test } from "vitest";
import { cargarContexto } from "../../src/importacion/contexto";
import { ESQUEMAS } from "../../src/importacion/esquemas";
import {
  ErrorCandado,
  bloquesDeFilas,
  crearImportacion,
  estadoMostrado,
  liberarCandado,
  tomarCandado,
} from "../../src/importacion/historial";
import { crearAlmacenFalso } from "./falsos";

const MIN = 60000;
const ahora = new Date("2026-10-28T12:00:00Z");
const yo = { importacionId: "i-1", uid: "u-yo", correo: "yo@x.hn" };

describe("candado por módulo", () => {
  test("libre: se toma y devuelve la hora del servidor", async () => {
    const a = crearAlmacenFalso({}, { ahora });
    const r = await tomarCandado(a, "productos", yo);
    expect(r.ahora).toEqual(ahora);
    expect(await a.leer("importaciones_bloqueo/productos")).toMatchObject({ uid: "u-yo", importacionId: "i-1" });
  });

  test("ocupado por otro y vigente: ErrorCandado con su correo", async () => {
    const a = crearAlmacenFalso(
      { "importaciones_bloqueo/productos": { uid: "u-otro", correo: "otro@x.hn", actualizado: new Date(ahora - 3 * MIN) } },
      { ahora },
    );
    await expect(tomarCandado(a, "productos", yo)).rejects.toBeInstanceOf(ErrorCandado);
    await expect(tomarCandado(a, "productos", yo)).rejects.toMatchObject({ correo: "otro@x.hn" });
  });

  test("vencido hace 11 minutos: se toma", async () => {
    const a = crearAlmacenFalso(
      { "importaciones_bloqueo/productos": { uid: "u-otro", correo: "otro@x.hn", actualizado: new Date(ahora - 11 * MIN) } },
      { ahora },
    );
    await tomarCandado(a, "productos", yo);
    expect((await a.leer("importaciones_bloqueo/productos")).uid).toBe("u-yo");
  });

  test("liberar lo borra", async () => {
    const a = crearAlmacenFalso({}, { ahora });
    await tomarCandado(a, "productos", yo);
    await liberarCandado(a, "productos");
    expect(await a.leer("importaciones_bloqueo/productos")).toBeNull();
  });
});

describe("historial", () => {
  test("crearImportacion deja el registro en proceso con marcas de servidor", async () => {
    const a = crearAlmacenFalso({}, { ahora });
    const id = await crearImportacion(a, {
      folio: "IMP-2026-0001",
      modulo: "productos",
      modo: "solo_nuevos",
      archivo: { nombre: "a.xlsx", pesoBytes: 10, hoja: "Hoja1" },
      responsable: { uid: "u", correo: "c", rol: "SUPER ADMIN" },
      conteos: { recibidos: 3 },
    });
    expect(await a.leer(`importaciones/${id}`)).toMatchObject({
      folio: "IMP-2026-0001",
      estado: "en_proceso",
      fechaInicio: ahora,
      ultimaActividad: ahora,
      fechaFin: null,
      reversion: null,
    });
  });

  test("bloquesDeFilas arma tramos de 200 con desde y hasta", () => {
    const filas = Array.from({ length: 450 }, (_, i) => ({ filaExcel: i + 2 }));
    const b = bloquesDeFilas(filas);
    expect(b.map((x) => [x.id, x.desde, x.hasta, x.filas.length])).toEqual([
      ["b0001", 2, 201, 200],
      ["b0002", 202, 401, 200],
      ["b0003", 402, 451, 50],
    ]);
  });

  test("estadoMostrado marca como interrumpida una importación sin actividad por más de 10 minutos", () => {
    const imp = (min, estado = "en_proceso") => ({ estado, ultimaActividad: new Date(ahora - min * MIN) });
    expect(estadoMostrado(imp(9), ahora)).toBe("en_proceso");
    expect(estadoMostrado(imp(11), ahora)).toBe("interrumpida_sin_actividad");
    expect(estadoMostrado(imp(11, "revirtiendo"), ahora)).toBe("interrumpida_sin_actividad");
    expect(estadoMostrado(imp(60, "completada"), ahora)).toBe("completada");
  });
});

describe("cargarContexto", () => {
  test("Productos: existentes por código normalizado, categorías e interés", async () => {
    const a = crearAlmacenFalso({
      "productos/p1": { productoId: " azu-001 " },
      "categorias/c1": { nombre: "Abarrotes" },
      "categorias/c2": { categoria: "Bebidas" },
      "parametros/general": { porcentajeInteres: 12 },
    });
    const c = await cargarContexto(a, ESQUEMAS.productos);
    expect(c.existentes.get("AZU-001").id).toBe("p1");
    expect(c.categorias).toEqual(["Abarrotes", "Bebidas"]);
    expect(c.porcentajeInteres).toBe(12);
  });

  test("Empleados: DNI existente normalizado a dígitos y departamentos", async () => {
    const a = crearAlmacenFalso({
      "empleados/e1": { codigoEmpleado: "EMP-0101", dni: "0801-1980-11111" },
      "departamentos/d1": { nombre: "Logística" },
    });
    const c = await cargarContexto(a, ESQUEMAS.empleados);
    expect(c.dnis.get("0801198011111")).toBe("EMP-0101");
    expect(c.departamentos).toEqual(["Logística"]);
  });

  test("Usuarios: existentes por correo, roles y empleados por código", async () => {
    const a = crearAlmacenFalso({
      "usuarios/u1": { correo: "Admin@X.hn" },
      "roles/r1": { nombre: "CEO" },
      "empleados/e1": { codigoEmpleado: "emp-0412" },
    });
    const c = await cargarContexto(a, ESQUEMAS.usuarios);
    expect(c.existentes.has("ADMIN@X.HN")).toBe(true);
    expect(c.roles).toEqual([{ nombre: "CEO", estado: "Activo" }]);
    expect(c.empleadosPorCodigo.get("EMP-0412").id).toBe("e1");
  });
});
