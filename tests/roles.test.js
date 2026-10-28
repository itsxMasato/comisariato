import { beforeEach, describe, expect, test } from "vitest";
import {
  ACTIONS,
  MODULES,
  hasPermission,
  modulosConImport,
  setDynamicRoles,
} from "../src/utils/roles";

const IMPORT = "IMPORT";

describe("acción IMPORT", () => {
  beforeEach(() => setDynamicRoles([]));

  test("IMPORT no se concede con comodín de módulo", () => {
    setDynamicRoles([{ nombre: "R", permisos: { PRODUCTOS: ["*"] } }]);
    expect(hasPermission("R", "PRODUCTOS", IMPORT)).toBe(false);
    expect(hasPermission("R", "PRODUCTOS", "EDIT")).toBe(true);
  });

  test("IMPORT no se concede con acceso total", () => {
    setDynamicRoles([{ nombre: "R", permisos: { "*": ["*"] } }]);
    expect(hasPermission("R", "PRODUCTOS", IMPORT)).toBe(false);
  });

  test("IMPORT no se concede con formato de lista", () => {
    setDynamicRoles([{ nombre: "X", permisos: ["PRODUCTOS"] }]);
    expect(hasPermission("X", "PRODUCTOS", IMPORT)).toBe(false);
    expect(hasPermission("X", "PRODUCTOS", "VIEW")).toBe(true);
  });

  test("IMPORT explícito sí se concede", () => {
    setDynamicRoles([{ nombre: "R", permisos: { PRODUCTOS: ["VIEW", "IMPORT"] } }]);
    expect(hasPermission("R", "PRODUCTOS", IMPORT)).toBe(true);
    expect(hasPermission("R", "EMPLEADOS", IMPORT)).toBe(false);
    expect(modulosConImport("R")).toEqual(["PRODUCTOS"]);
  });

  test("SUPER ADMIN estático importa en los tres módulos y ve IMPORTACIONES", () => {
    expect(ACTIONS.IMPORT).toBe(IMPORT);
    expect(MODULES.IMPORTACIONES).toBe("IMPORTACIONES");
    ["PRODUCTOS", "EMPLEADOS", "USUARIOS"].forEach((m) =>
      expect(hasPermission("SUPER ADMIN", m, IMPORT)).toBe(true),
    );
    expect(hasPermission("SUPER ADMIN", "IMPORTACIONES", "VIEW")).toBe(true);
    expect(hasPermission("SUPER ADMIN", "IMPORTACIONES", "EDIT")).toBe(true);
    expect(hasPermission("SUPER ADMIN", "PRODUCTOS", "VIEW")).toBe(false);
  });

  test("rol desconocido o nulo no tiene permisos", () => {
    expect(hasPermission(null, "PRODUCTOS", "VIEW")).toBe(false);
    expect(hasPermission("NO EXISTE", "PRODUCTOS", IMPORT)).toBe(false);
    expect(modulosConImport(null)).toEqual([]);
  });
});
