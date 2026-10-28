import { describe, expect, test } from "vitest";
import { crearAlmacenFalso, crearCuentasFalsas } from "./falsos";

describe("almacén falso", () => {
  test("leer y leerTodos devuelven solo documentos directos de la colección", async () => {
    const a = crearAlmacenFalso({
      "productos/p1": { nombre: "Arroz" },
      "productos/p2": { nombre: "Frijol" },
      "importaciones/i1/filas/b0001": { desde: 2 },
    });
    expect(await a.leer("productos/p1")).toEqual({ nombre: "Arroz" });
    expect(await a.leer("productos/nada")).toBeNull();
    expect((await a.leerTodos("productos")).map((d) => d.id)).toEqual(["p1", "p2"]);
    expect(await a.leerTodos("importaciones")).toEqual([]);
  });

  test("lote aplica todo o nada cuando falla el commit", async () => {
    const a = crearAlmacenFalso({ "productos/p1": { stock: 1 } });
    a.fallarCommit(1);
    const l1 = a.lote();
    l1.set("productos/p2", { stock: 2 });
    l1.update("productos/p1", { stock: 5 });
    await expect(l1.commit()).rejects.toThrow();
    expect(await a.leer("productos/p2")).toBeNull();
    expect((await a.leer("productos/p1")).stock).toBe(1);

    const l2 = a.lote();
    l2.set("productos/p2", { stock: 2 });
    l2.update("productos/p1", { stock: 5 });
    l2.delete("productos/p2");
    await l2.commit();
    expect(await a.leer("productos/p2")).toBeNull();
    expect((await a.leer("productos/p1")).stock).toBe(5);
    expect(a.commits).toBe(1);
  });

  test("update de un documento inexistente falla, como en Firestore", async () => {
    const a = crearAlmacenFalso();
    const l = a.lote();
    l.update("productos/x", { stock: 1 });
    await expect(l.commit()).rejects.toThrow(/no existe/);
    await expect(a.actualizar("productos/x", { stock: 1 })).rejects.toThrow(/no existe/);
  });

  test("marcaServidor se guarda como la hora del almacén y campoBorrado elimina el campo", async () => {
    const ahora = new Date("2026-10-28T10:00:00Z");
    const a = crearAlmacenFalso({ "empleados/e1": { uid: "u1", nombres: "Ana" } }, { ahora });
    await a.actualizar("empleados/e1", { uid: a.campoBorrado(), fechaModificacion: a.marcaServidor() });
    expect(await a.leer("empleados/e1")).toEqual({ nombres: "Ana", fechaModificacion: ahora });
  });

  test("transaccion lee y escribe", async () => {
    const a = crearAlmacenFalso({ "contadores/x": { ultimo: 3 } });
    const r = await a.transaccion(async (tx) => {
      const c = await tx.leer("contadores/x");
      tx.update("contadores/x", { ultimo: c.ultimo + 1 });
      tx.set("contadores/y", { ultimo: 1 });
      return c.ultimo + 1;
    });
    expect(r).toBe(4);
    expect((await a.leer("contadores/x")).ultimo).toBe(4);
    expect((await a.leer("contadores/y")).ultimo).toBe(1);
  });

  test("consultar filtra con == e in, ordena y pagina", async () => {
    const a = crearAlmacenFalso({
      "importaciones/a": { modulo: "productos", n: 1 },
      "importaciones/b": { modulo: "empleados", n: 2 },
      "importaciones/c": { modulo: "productos", n: 3 },
      "importaciones/d": { modulo: "usuarios", n: 4 },
    });
    const p1 = await a.consultar("importaciones", {
      donde: [["modulo", "in", ["productos", "empleados"]]],
      orden: ["n", "desc"],
      limite: 2,
    });
    expect(p1.docs.map((d) => d.id)).toEqual(["c", "b"]);
    const p2 = await a.consultar("importaciones", {
      donde: [["modulo", "in", ["productos", "empleados"]]],
      orden: ["n", "desc"],
      limite: 2,
      despuesDe: p1.ultimo,
    });
    expect(p2.docs.map((d) => d.id)).toEqual(["a"]);
    const solo = await a.consultar("importaciones", { donde: [["modulo", "==", "usuarios"]] });
    expect(solo.docs.map((d) => d.id)).toEqual(["d"]);
  });
});

describe("cuentas falsas", () => {
  test("crear devuelve uid y un correo existente lanza email-already-in-use", async () => {
    const c = crearCuentasFalsas({ existentes: ["ya@x.hn"] });
    const cuenta = await c.crear("nuevo@x.hn", "clave");
    expect(cuenta.uid).toBeTruthy();
    expect(c.creadas).toEqual([{ uid: cuenta.uid, correo: "nuevo@x.hn" }]);
    await expect(c.crear("ya@x.hn", "clave")).rejects.toMatchObject({ code: "auth/email-already-in-use" });
    await cuenta.borrar();
    expect(c.borradas).toEqual([cuenta.uid]);
  });

  test("fallarCon simula errores de Auth por correo", async () => {
    const c = crearCuentasFalsas({ fallarCon: { "b@x.hn": "auth/too-many-requests" } });
    await expect(c.crear("b@x.hn", "clave")).rejects.toMatchObject({ code: "auth/too-many-requests" });
  });
});
