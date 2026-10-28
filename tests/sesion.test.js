import { describe, expect, test } from "vitest";
import { resolverSesion } from "../src/auth/sesion";

describe("resolverSesion", () => {
  test("sin documento no tiene acceso", () => {
    expect(resolverSesion(null)).toMatchObject({ acceso: false, rol: null, motivo: "sin_documento" });
  });

  test("documento inactivo no tiene acceso", () => {
    expect(resolverSesion({ estado: "Deshabilitado", rol: "ADMIN" })).toMatchObject({
      acceso: false,
      rol: null,
      motivo: "inactivo",
    });
  });

  test("Activo y active tienen acceso", () => {
    expect(resolverSesion({ estado: "Activo", rol: "ADMIN", nombre: "Ana", fotoURL: "f.png" })).toEqual({
      acceso: true,
      rol: "ADMIN",
      nombre: "Ana",
      foto: "f.png",
      motivo: null,
    });
    expect(resolverSesion({ estado: "active", rol: "CEO" })).toMatchObject({ acceso: true, rol: "CEO" });
  });

  test("documento sin rol no recibe rol de administrador", () => {
    const sesion = resolverSesion({ estado: "Activo" });
    expect(sesion.rol).toBe("Usuario");
    expect(sesion.rol).not.toBe("Administrador");
  });
});
