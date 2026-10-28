import { describe, expect, test } from "vitest";
import { valorParaMostrar } from "../src/pages/importacion/estados";

describe("valorParaMostrar", () => {
  test("muestra el valor corregido y lo que decía el Excel cuando solo cambió la forma de escribirlo", () => {
    expect(valorParaMostrar("alcohol", "Alcohol")).toEqual({ texto: "Alcohol", original: "alcohol" });
    expect(valorParaMostrar("Jardineria", "Jardinería")).toEqual({ texto: "Jardinería", original: "Jardineria" });
  });

  test("sin marca cuando el valor ya venía igual o solo sobraban espacios", () => {
    expect(valorParaMostrar("Alcohol", "Alcohol")).toEqual({ texto: "Alcohol", original: null });
    expect(valorParaMostrar("  Alcohol ", "Alcohol")).toEqual({ texto: "Alcohol", original: null });
  });

  test("números y fechas se muestran formateados, sin marca", () => {
    expect(valorParaMostrar("L 1,250.00", 1250)).toEqual({ texto: (1250).toLocaleString("es-HN"), original: null });
    expect(valorParaMostrar(45000, new Date(2023, 2, 15))).toEqual({
      texto: new Date(2023, 2, 15).toLocaleDateString("es-HN"),
      original: null,
    });
  });

  test("si el campo fue rechazado (no hay valor convertido) se muestra lo que vino en el Excel", () => {
    expect(valorParaMostrar("Ferretería", undefined)).toEqual({ texto: "Ferretería", original: null });
    expect(valorParaMostrar("", undefined)).toEqual({ texto: "—", original: null });
  });
});
