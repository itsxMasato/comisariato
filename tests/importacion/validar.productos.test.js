import { describe, expect, test } from "vitest";
import { productos } from "../../src/importacion/esquemas/productos";
import { validar, validarEncabezados } from "../../src/importacion/validar";

const ENC = ["Código", "Nombre", "Categoría", "Precio de contado", "Stock"];

const contexto = (existentes = []) => ({
  existentes: new Map(existentes.map((p) => [p.productoId.toUpperCase(), p])),
  categorias: ["Granos y Cereales", "Abarrotes"],
  porcentajeInteres: 15,
});

const fila = (filaExcel, [codigo, nombre, categoria, precio, stock], extra = {}) => ({
  filaExcel,
  valores: { Código: codigo, Nombre: nombre, Categoría: categoria, "Precio de contado": precio, Stock: stock, ...extra },
});

const clasificar = (filas, { existentes, modo = "solo_nuevos" } = {}) =>
  validar({ esquema: productos, encabezados: Object.keys(filas[0].valores), filas, modo, contexto: contexto(existentes) });

describe("encabezados de Productos", () => {
  test("acepta alias y reporta columnas obligatorias faltantes por su etiqueta", () => {
    const r = validarEncabezados(productos, ["SKU", "Producto", "Categoria", "Stock", "Color"]);
    expect(r.mapa).toMatchObject({ SKU: "productoId", Producto: "nombre", Categoria: "categoria", Stock: "stock" });
    expect(r.faltantes).toEqual(["Precio de contado"]);
    expect(r.ignorados).toEqual(["Color"]);
  });

  test("validar no clasifica filas si faltan columnas obligatorias", () => {
    const r = validar({
      esquema: productos,
      encabezados: ["Código", "Nombre"],
      filas: [{ filaExcel: 2, valores: { Código: "A", Nombre: "B" } }],
      modo: "solo_nuevos",
      contexto: contexto(),
    });
    expect(r.faltantes.length).toBeGreaterThan(0);
    expect(r.filas).toEqual([]);
  });
});

describe("reglas de Productos", () => {
  test("fila válida queda nueva con precioCredito calculado y valores por defecto", () => {
    const [f] = clasificar([fila(2, ["PROD-1025", "Azúcar 50kg", "granos y cereales", "L 820.00", 45])]).filas;
    expect(f.estado).toBe("nuevo");
    expect(f.clave).toBe("PROD-1025");
    expect(f.documento).toMatchObject({
      productoId: "PROD-1025",
      nombre: "Azúcar 50kg",
      categoria: "Granos y Cereales",
      precioContado: 820,
      stock: 45,
      estado: "Activo",
      descripcion: "",
    });
    expect(f.documento.precioCredito).toBeCloseTo(943, 2);
    expect(f.documento).not.toHaveProperty("stockMinimo");
  });

  test("precio negativo se rechaza indicando el campo", () => {
    const [f] = clasificar([fila(5, ["PROD-1031", "Harina", "Abarrotes", "-15.00", 80])]).filas;
    expect(f.estado).toBe("rechazado");
    expect(f.errores).toEqual([expect.objectContaining({ campo: "precioContado", valorRecibido: "-15.00" })]);
  });

  test("nombre vacío se rechaza", () => {
    const [f] = clasificar([fila(8, ["PROD-1032", "", "Abarrotes", 50, 40])]).filas;
    expect(f.estado).toBe("rechazado");
    expect(f.errores[0].campo).toBe("nombre");
  });

  test("stock negativo y estado no reconocido dan dos errores", () => {
    const [f] = clasificar([fila(10, ["PROD-1033", "Sal", "Abarrotes", 8.5, -10], { Estado: "Pendiente_Revision" })]).filas;
    expect(f.estado).toBe("rechazado");
    expect(f.errores.map((e) => e.campo).sort()).toEqual(["estado", "stock"]);
  });

  test("categoría inexistente se rechaza", () => {
    const [f] = clasificar([fila(2, ["P-1", "Jabón", "Higiene", 18, 300])]).filas;
    expect(f.estado).toBe("rechazado");
    expect(f.errores[0]).toMatchObject({ campo: "categoria", valorRecibido: "Higiene" });
  });

  test("código numérico de Excel se compara como texto", () => {
    const [f] = clasificar([fila(2, [1025, "Café", "Abarrotes", 65, 120])]).filas;
    expect(f.clave).toBe("1025");
    expect(f.documento.productoId).toBe("1025");
  });
});

describe("duplicados de Productos", () => {
  test("clave repetida en el archivo, con otra capitalización y espacios", () => {
    const r = clasificar([
      fila(2, [" azu-001-st", "Azúcar", "Abarrotes", 12.5, 10]),
      fila(3, ["AZU-001-ST", "Azúcar bis", "Abarrotes", 12.5, 10]),
    ]);
    expect(r.filas[0].estado).toBe("nuevo");
    expect(r.filas[1].estado).toBe("rechazado");
    expect(r.filas[1].errores[0].mensaje).toBe("Repetido en la fila 2");
  });

  const existente = {
    id: "doc-1",
    productoId: "AZU-001-ST",
    nombre: "Azúcar Refinada",
    categoria: "Abarrotes",
    precioContado: 12.5,
    precioCredito: 14.375,
    stock: 1250,
    stockMinimo: 30,
    estado: "Activo",
  };

  test("existente en modo solo nuevos queda omitido", () => {
    const r = clasificar([fila(2, ["azu-001-st", "Azúcar Refinada", "Abarrotes", 12.5, 1250])], { existentes: [existente] });
    expect(r.filas[0]).toMatchObject({ estado: "omitido", existenteId: "doc-1" });
  });

  test("existente con precio distinto en modo actualizar trae cambios de precio y precio de crédito", () => {
    const r = clasificar([fila(2, ["AZU-001-ST", "Azúcar Refinada", "Abarrotes", 14, 1250])], {
      existentes: [existente],
      modo: "nuevos_y_actualizar",
    });
    const f = r.filas[0];
    expect(f.estado).toBe("actualizar");
    expect(f.cambios.map((c) => c.campo).sort()).toEqual(["precioContado", "precioCredito"]);
    expect(f.cambios.find((c) => c.campo === "precioContado")).toMatchObject({ anterior: 12.5, nuevo: 14 });
    expect(f.documento).toEqual({ precioContado: 14, precioCredito: 16.1 });
  });

  test("existente sin diferencias queda sin cambios, y una columna opcional ausente no cuenta", () => {
    const r = clasificar([fila(2, ["AZU-001-ST", "Azúcar Refinada", "Abarrotes", 12.5, 1250])], {
      existentes: [existente],
      modo: "nuevos_y_actualizar",
    });
    expect(r.filas[0].estado).toBe("sin_cambios");
    expect(r.filas[0].cambios).toEqual([]);
  });

  test("resumen cuenta cada estado", () => {
    const r = clasificar(
      [
        fila(2, ["NUEVO-1", "Arroz", "Abarrotes", 28.5, 250]),
        fila(3, ["AZU-001-ST", "Azúcar Refinada", "Abarrotes", 12.5, 1250]),
        fila(4, ["MAL-1", "", "Abarrotes", 1, 1]),
      ],
      { existentes: [existente] },
    );
    expect(r.resumen).toEqual({ recibidos: 3, nuevos: 1, actualizar: 0, sinCambios: 0, omitidos: 1, rechazados: 1 });
  });
});
