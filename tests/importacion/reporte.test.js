import { expect, test } from "vitest";
import * as XLSX from "xlsx";
import { ESQUEMAS } from "../../src/importacion/esquemas";
import { generarPlantilla, generarReporteRechazos } from "../../src/importacion/reporte";

const leer = async (blob) => {
  const libro = XLSX.read(await blob.arrayBuffer(), { type: "array" });
  return XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, defval: "" });
};

test("la plantilla de Productos tiene exactamente las etiquetas de las columnas del esquema", async () => {
  const [encabezados] = await leer(await generarPlantilla(ESQUEMAS.productos));
  expect(encabezados).toEqual(ESQUEMAS.productos.columnas.map((c) => c.etiqueta));
});

test("el reporte de rechazos tiene una fila por rechazo con sus datos originales y el motivo", async () => {
  const filas = [
    { filaExcel: 5, estado: "rechazado", crudos: { Código: "P-1", Nombre: "" }, errores: [{ mensaje: "Nombre es obligatorio" }] },
    { filaExcel: 6, estado: "insertado", crudos: { Código: "P-2", Nombre: "Sal" }, errores: [] },
    {
      filaExcel: 9,
      estado: "rechazado",
      crudos: { Código: "P-3", Nombre: "Té" },
      errores: [{ mensaje: "Stock: no puede ser negativo" }, { mensaje: "Estado: debe ser Activo o Inactivo" }],
    },
  ];
  const datos = await leer(await generarReporteRechazos(ESQUEMAS.productos, filas));
  expect(datos).toEqual([
    ["Fila", "Código", "Nombre", "Motivo"],
    [5, "P-1", "", "Nombre es obligatorio"],
    [9, "P-3", "Té", "Stock: no puede ser negativo; Estado: debe ser Activo o Inactivo"],
  ]);
});
