import { describe, expect, test } from "vitest";
import {
  aDni,
  aEntero,
  aFecha,
  aNumero,
  aTexto,
  esCorreo,
  normalizarEncabezado,
} from "../../src/importacion/normalizar";

describe("números", () => {
  test("aceptan prefijo L y separador de miles", () => {
    expect(aNumero("L 1,250.00")).toEqual({ ok: true, valor: 1250 });
    expect(aNumero(820)).toEqual({ ok: true, valor: 820 });
    expect(aNumero("-15.00")).toEqual({ ok: true, valor: -15 });
  });

  test("texto que no es número o vacío no se acepta", () => {
    expect(aNumero("abc").ok).toBe(false);
    expect(aNumero("").ok).toBe(false);
  });

  test("entero rechaza decimales", () => {
    expect(aEntero("12.5").ok).toBe(false);
    expect(aEntero("1,250")).toEqual({ ok: true, valor: 1250 });
  });
});

describe("fechas", () => {
  const ymd = (r) => [r.valor.getFullYear(), r.valor.getMonth() + 1, r.valor.getDate()];

  test("número de serie de Excel", () => {
    expect(ymd(aFecha(45000))).toEqual([2023, 3, 15]);
  });

  test("dd/mm/aaaa y aaaa-mm-dd", () => {
    expect(ymd(aFecha("14/02/2021"))).toEqual([2021, 2, 14]);
    expect(ymd(aFecha("2021-02-14"))).toEqual([2021, 2, 14]);
  });

  test("fechas imposibles se rechazan", () => {
    expect(aFecha("31/02/2026").ok).toBe(false);
    expect(aFecha("2026-05-40").ok).toBe(false);
    expect(aFecha("ayer").ok).toBe(false);
  });
});

describe("DNI", () => {
  test("13 dígitos con o sin guiones", () => {
    expect(aDni("0801-1990-12345")).toEqual({ ok: true, valor: "0801199012345" });
    expect(aDni("0801199012345").valor).toBe("0801199012345");
  });

  test("DNI leído como número pierde el cero inicial y se rechaza", () => {
    const r = aDni(801199012345);
    expect(r.ok).toBe(false);
    expect(r.mensaje).toMatch(/13 dígitos/);
  });
});

describe("texto, correo y encabezados", () => {
  test("aTexto recorta, reduce espacios y convierte números", () => {
    expect(aTexto("  Arroz   Blanco ")).toBe("Arroz Blanco");
    expect(aTexto(1025)).toBe("1025");
    expect(aTexto(null)).toBe("");
  });

  test("esCorreo", () => {
    expect(esCorreo("marta.solis@comisariato.hn")).toBe(true);
    expect(esCorreo("carlos_pena_sin_dominio")).toBe(false);
  });

  test("normalizarEncabezado quita acentos, mayúsculas, espacios y signos", () => {
    expect(normalizarEncabezado("Código ")).toBe("codigo");
    expect(normalizarEncabezado("Precio de Contado (L)")).toBe("preciodecontadol");
  });
});
