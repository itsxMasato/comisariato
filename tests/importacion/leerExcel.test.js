import { describe, expect, test } from "vitest";
import * as XLSX from "xlsx";
import { ErrorArchivo, leerExcel } from "../../src/importacion/leerExcel";

// Simula un File del navegador a partir de filas (arreglo de arreglos)
const archivo = (filas, { nombre = "datos.xlsx", bookType = "xlsx", size } = {}) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), "Hoja1");
  const buffer = XLSX.write(wb, { bookType, type: "array" });
  return { name: nombre, size: size ?? buffer.byteLength, arrayBuffer: async () => buffer };
};

const errorDe = async (promesa) => {
  try {
    await promesa;
  } catch (e) {
    return e;
  }
  throw new Error("se esperaba un error");
};

describe("leerExcel", () => {
  test("lee .xlsx con filaExcel desde 2", async () => {
    const r = await leerExcel(archivo([["Código", "Nombre"], ["A-1", "Arroz"], ["B-2", "Frijol"]]), { topeFilas: 10 });
    expect(r.hoja).toBe("Hoja1");
    expect(r.encabezados).toEqual(["Código", "Nombre"]);
    expect(r.filas).toEqual([
      { filaExcel: 2, valores: { Código: "A-1", Nombre: "Arroz" } },
      { filaExcel: 3, valores: { Código: "B-2", Nombre: "Frijol" } },
    ]);
  });

  test("lee .xls", async () => {
    const r = await leerExcel(archivo([["Código", "Nombre"], ["A-1", "Arroz"]], { nombre: "viejo.xls", bookType: "biff8" }), {
      topeFilas: 10,
    });
    expect(r.filas[0].valores).toEqual({ Código: "A-1", Nombre: "Arroz" });
  });

  test("salta filas vacías intermedias sin alterar el número de fila", async () => {
    const r = await leerExcel(archivo([["Código", "Nombre"], ["A-1", "Arroz"], ["", ""], ["C-3", "Sal"]]), { topeFilas: 10 });
    expect(r.filas.map((f) => f.filaExcel)).toEqual([2, 4]);
  });

  test("detecta encabezados debajo de un título", async () => {
    const r = await leerExcel(archivo([["Catálogo abril"], [], ["Código", "Nombre"], ["A-1", "Arroz"]]), { topeFilas: 10 });
    expect(r.encabezados).toEqual(["Código", "Nombre"]);
    expect(r.filas).toEqual([{ filaExcel: 4, valores: { Código: "A-1", Nombre: "Arroz" } }]);
  });

  test("extensión no admitida", async () => {
    const e = await errorDe(leerExcel({ name: "reporte.pdf", size: 10, arrayBuffer: async () => new ArrayBuffer(10) }, { topeFilas: 10 }));
    expect(e).toBeInstanceOf(ErrorArchivo);
    expect(e.titulo).toBe("Archivo no admitido");
  });

  test("archivo de más de 15 MB", async () => {
    const e = await errorDe(leerExcel(archivo([["A", "B"]], { size: 16 * 1024 * 1024 }), { topeFilas: 10 }));
    expect(e.titulo).toBe("Archivo demasiado grande");
  });

  test("hoja sin filas de datos", async () => {
    const e = await errorDe(leerExcel(archivo([["Código", "Nombre"]]), { topeFilas: 10 }));
    expect(e.titulo).toBe("El archivo no tiene datos");
  });

  test("más filas que el tope", async () => {
    const filas = [["Código", "Nombre"], ...Array.from({ length: 2001 }, (_, i) => [`C-${i}`, "x"])];
    const e = await errorDe(leerExcel(archivo(filas), { topeFilas: 2000 }));
    expect(e.titulo).toBe("Demasiadas filas");
    expect(e.mensaje).toMatch(/2[.,]?000/);
  });

  test("columnas con el mismo encabezado", async () => {
    const e = await errorDe(leerExcel(archivo([["Nombre", "Nombre"], ["a", "b"]]), { topeFilas: 10 }));
    expect(e.titulo).toBe("Columnas repetidas");
    expect(e.mensaje).toMatch(/Nombre/);
  });

  test("archivo dañado", async () => {
    const e = await errorDe(
      leerExcel({ name: "roto.xlsx", size: 5, arrayBuffer: async () => new TextEncoder().encode("hola").buffer }, { topeFilas: 10 }),
    );
    expect(e).toBeInstanceOf(ErrorArchivo);
  });
});
