// Lectura de la primera hoja de un archivo Excel con SheetJS.
// Devuelve las filas con su número de fila real en Excel.

export const TAMANO_MAXIMO = 15 * 1024 * 1024;
const EXTENSIONES = ["xlsx", "xls"];

export class ErrorArchivo extends Error {
  constructor(titulo, mensaje) {
    super(mensaje);
    this.name = "ErrorArchivo";
    this.titulo = titulo;
    this.mensaje = mensaje;
  }
}

const vacia = (celda) => celda === "" || celda === null || celda === undefined;

// Primera fila con al menos 2 celdas de texto: así se saltan títulos sobre la tabla
const indiceEncabezados = (matriz) =>
  matriz.findIndex((fila) => fila.filter((c) => typeof c === "string" && c.trim() !== "").length >= 2);

export const leerExcel = async (archivo, { topeFilas }) => {
  const extension = String(archivo.name || "").split(".").pop().toLowerCase();
  if (!EXTENSIONES.includes(extension)) {
    throw new ErrorArchivo(
      "Archivo no admitido",
      `El archivo «${archivo.name}» no es una hoja de cálculo de Excel. Solo se admiten archivos .xlsx y .xls.`,
    );
  }
  if (archivo.size > TAMANO_MAXIMO) {
    throw new ErrorArchivo("Archivo demasiado grande", "El archivo supera el máximo de 15 MB.");
  }

  const XLSX = await import("xlsx");
  let libro;
  try {
    libro = XLSX.read(await archivo.arrayBuffer(), { type: "array", cellDates: false });
  } catch {
    throw new ErrorArchivo("No se pudo leer el archivo", "El archivo está dañado o no es un Excel válido.");
  }

  const hoja = libro.SheetNames[0];
  const matriz = hoja ? XLSX.utils.sheet_to_json(libro.Sheets[hoja], { header: 1, raw: true, defval: "" }) : [];
  const inicio = indiceEncabezados(matriz);
  if (inicio === -1) {
    throw new ErrorArchivo("El archivo no tiene datos", "No se encontró una fila de encabezados en la primera hoja.");
  }

  const encabezados = matriz[inicio].map((c) => String(c ?? "").trim());
  const repetidos = encabezados.filter((e, i) => e && encabezados.indexOf(e) !== i);
  if (repetidos.length) {
    throw new ErrorArchivo("Columnas repetidas", `Estas columnas aparecen más de una vez: ${[...new Set(repetidos)].join(", ")}.`);
  }

  const filas = [];
  for (let i = inicio + 1; i < matriz.length; i += 1) {
    if (matriz[i].every(vacia)) continue;
    const valores = {};
    encabezados.forEach((enc, col) => {
      if (enc) valores[enc] = matriz[i][col] ?? "";
    });
    filas.push({ filaExcel: i + 1, valores });
  }

  if (filas.length === 0) {
    throw new ErrorArchivo("El archivo no tiene datos", "La hoja tiene encabezados pero ninguna fila con datos.");
  }
  if (filas.length > topeFilas) {
    throw new ErrorArchivo(
      "Demasiadas filas",
      `El archivo tiene ${filas.length.toLocaleString("es-HN")} filas y el máximo por importación es ${topeFilas.toLocaleString("es-HN")}. Divídalo en varios archivos.`,
    );
  }

  return { hoja, encabezados: encabezados.filter(Boolean), filas };
};
