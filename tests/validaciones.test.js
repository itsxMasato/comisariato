import { describe, expect, test } from "vitest";
import { normalizarClave, skuDuplicado } from "../src/utils/validaciones";

describe("normalizarClave", () => {
  test("recorta, pasa a mayúsculas y convierte números a texto", () => {
    expect(normalizarClave(" azu-001-st ")).toBe("AZU-001-ST");
    expect(normalizarClave(1025)).toBe("1025");
    expect(normalizarClave(null)).toBe("");
  });
});

describe("skuDuplicado", () => {
  const productos = [{ id: "a", productoId: "AZU-001", nombre: "Azúcar" }];

  test("encuentra el producto con el mismo código sin importar mayúsculas ni espacios", () => {
    expect(skuDuplicado(productos, " azu-001 ", null)).toBe(productos[0]);
  });

  test("al editar no se cuenta el mismo producto", () => {
    expect(skuDuplicado(productos, "AZU-001", "a")).toBeNull();
  });

  test("código distinto o vacío no es duplicado", () => {
    expect(skuDuplicado(productos, "ARR-002", null)).toBeNull();
    expect(skuDuplicado(productos, "", null)).toBeNull();
  });
});
