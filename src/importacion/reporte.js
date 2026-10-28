// Archivos Excel que genera la importación: la plantilla de cada módulo
// (sale del esquema, así nunca se desincroniza) y el reporte de filas rechazadas.

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const libroABlob = async (filas, nombreHoja) => {
  const XLSX = await import("xlsx");
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja["!cols"] = filas[0].map((titulo) => ({ wch: Math.max(12, String(titulo).length + 4) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  return new Blob([XLSX.write(libro, { bookType: "xlsx", type: "array" })], { type: TIPO_XLSX });
};

export const generarPlantilla = (esquema) => libroABlob([esquema.columnas.map((c) => c.etiqueta)], esquema.nombre);

// Columnas: número de fila, los encabezados originales del archivo y el motivo
export const generarReporteRechazos = (esquema, filas) => {
  const rechazadas = filas.filter((f) => f.estado === "rechazado");
  const encabezados = [...new Set(rechazadas.flatMap((f) => Object.keys(f.crudos || {})))];
  return libroABlob(
    [
      ["Fila", ...encabezados, "Motivo"],
      ...rechazadas.map((f) => [
        f.filaExcel,
        ...encabezados.map((e) => f.crudos?.[e] ?? ""),
        f.errores.map((e) => e.mensaje).join("; "),
      ]),
    ],
    "Rechazos",
  );
};

// Descarga un Blob en el navegador
export const descargarArchivo = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
