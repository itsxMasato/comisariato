import React, { useRef } from "react";
import { MODOS } from "../../importacion/validar";
import { formatearPeso } from "./estados";

const OPCIONES_MODO = [
  {
    id: MODOS.SOLO_NUEVOS,
    titulo: "Solo agregar nuevos",
    desc: "Los registros que ya existen se omiten y no se modifican.",
    icono: "playlist_add",
  },
  {
    id: MODOS.NUEVOS_Y_ACTUALIZAR,
    titulo: "Agregar nuevos y actualizar existentes",
    desc: "Los existentes se actualizan solo en los campos que cambian. Vas a ver cada cambio antes de confirmar.",
    icono: "sync",
  },
];

export default function Paso1Seleccion({
  esquema,
  modo,
  onCambiarModo,
  archivo,
  lectura,
  columnasIgnoradas = [],
  cargando,
  error,
  onCerrarError,
  onSeleccionarArchivo,
  onQuitarArchivo,
  onDescargarPlantilla,
}) {
  const input = useRef(null);
  const abrirSelector = () => input.current?.click();
  const alSoltar = (e) => {
    e.preventDefault();
    const archivoSoltado = e.dataTransfer.files?.[0];
    if (archivoSoltado) onSeleccionarArchivo(archivoSoltado);
  };

  return (
    <div className="space-y-6">
      {/* Módulo y columnas */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-green-800 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">{esquema.icono}</span>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-black uppercase text-green-900 bg-green-100/80 px-2.5 py-0.5 rounded-full border border-green-300">
              Importando en: {esquema.nombre}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-xs text-slate-500 font-bold">Columnas:</span>
              {esquema.columnas.map((c) => (
                <span
                  key={c.campo}
                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                    c.obligatoria ? "bg-slate-800 text-white border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                  title={c.obligatoria ? "Obligatoria" : "Opcional"}
                >
                  {c.etiqueta}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">Las columnas oscuras son obligatorias. Máximo {esquema.topeFilas.toLocaleString("es-HN")} filas.</p>
          </div>
        </div>
        <button
          onClick={onDescargarPlantilla}
          className="text-green-800 hover:text-green-950 text-xs font-bold flex items-center gap-1.5 shrink-0 bg-green-50 hover:bg-green-100 px-4 py-2.5 rounded-xl border border-green-200"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Descargar plantilla .xlsx
        </button>
      </div>

      {/* Modo */}
      {esquema.soloCreacion ? (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-700">info</span>
          En {esquema.nombre} solo se crean registros nuevos. Los que ya existen se omiten. Cada usuario recibe un correo para establecer su contraseña.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPCIONES_MODO.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onCambiarModo(o.id)}
              className={`text-left p-5 rounded-3xl border-2 transition-all flex gap-3 ${
                modo === o.id ? "border-green-800 bg-green-50/40" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${modo === o.id ? "text-green-800" : "text-slate-400"}`}>
                {modo === o.id ? "radio_button_checked" : "radio_button_unchecked"}
              </span>
              <div>
                <p className="font-black text-slate-900 text-sm flex items-center gap-1.5" style={{ fontFamily: "Manrope, sans-serif" }}>
                  <span className="material-symbols-outlined text-base text-slate-500">{o.icono}</span>
                  {o.titulo}
                </p>
                <p className="text-xs text-slate-500 mt-1">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Archivo */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: "Manrope, sans-serif" }}>
            <span className="material-symbols-outlined text-green-800">upload_file</span>
            Seleccione el archivo Excel a importar
          </h2>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
            Formatos: .xlsx / .xls
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-800">
            <span className="material-symbols-outlined text-red-600 shrink-0 text-xl">error</span>
            <div className="flex-1">
              <p className="font-bold">{error.titulo}</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{error.mensaje}</p>
            </div>
            <button onClick={onCerrarError} className="text-red-500 hover:text-red-700" aria-label="Cerrar">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            const elegido = e.target.files?.[0];
            e.target.value = "";
            if (elegido) onSeleccionarArchivo(elegido);
          }}
        />

        {!cargando && lectura && columnasIgnoradas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <span className="material-symbols-outlined text-amber-700 text-xl">info</span>
            <p className="leading-relaxed">
              Estas columnas no se reconocen y se van a ignorar: <strong>{columnasIgnoradas.join(", ")}</strong>. Si alguna debía importarse,
              renombrala como en la plantilla.
            </p>
          </div>
        )}

        {cargando ? (
          <div className="border-2 border-dashed border-green-300 bg-green-50/40 rounded-3xl p-10 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-green-200 border-t-green-800 animate-spin" />
            <h4 className="font-black text-slate-800" style={{ fontFamily: "Manrope, sans-serif" }}>
              Leyendo archivo Excel...
            </h4>
          </div>
        ) : archivo && lectura ? (
          <div className="border-2 border-green-800 bg-green-50/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                <span className="material-symbols-outlined text-3xl">description</span>
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="font-black text-slate-900 truncate" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {archivo.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Peso: <strong className="text-slate-700">{formatearPeso(archivo.size)}</strong> • Hoja:{" "}
                  <strong className="text-slate-700">{lectura.hoja}</strong> • Filas con datos:{" "}
                  <strong className="text-slate-700">{lectura.filas.length}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={abrirSelector}
                className="flex-1 md:flex-none text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Cambiar archivo
              </button>
              <button
                onClick={onQuitarArchivo}
                className="flex-1 md:flex-none text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl border border-red-200 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={alSoltar}
            onClick={abrirSelector}
            className="border-2 border-dashed border-slate-300 hover:border-green-700 hover:bg-green-50/20 rounded-3xl p-10 md:p-12 cursor-pointer flex flex-col items-center text-center space-y-4 group"
          >
            <div className="w-16 h-16 rounded-3xl bg-slate-100 group-hover:bg-green-100 group-hover:text-green-800 text-slate-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            <p className="text-base font-black text-slate-800 group-hover:text-green-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              Haga clic para examinar o arrastre el archivo Excel aquí
            </p>
            <p className="text-xs text-slate-400 font-medium">
              Archivos compatibles: <strong className="text-slate-600">.xlsx, .xls</strong> (máximo 15 MB)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
