import { expect, test } from "vitest";
import { generarContrasena } from "../../src/importacion/contrasena";

test("generarContrasena tiene 20 caracteres y no se repite", () => {
  const a = generarContrasena();
  expect(a).toHaveLength(20);
  expect(generarContrasena()).not.toBe(a);
});
