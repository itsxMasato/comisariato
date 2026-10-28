import React from "react";
import { ESTADOS_IMPORTACION } from "./estados";

const TITULOS = {
  completada: { titulo: "Importación completada", icono: "task_alt", clase: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  completada_con_advertencias: { titulo: "Importación completada con advertencias", icono: "task_alt", clase: "bg-amber-100 text-amber-800 border-amber-300" },
  interrumpida: { titulo: "Importación interrumpida", icono: "error", clase: "bg-red-100 text-red-800 border-red-300" },
};

export default function Paso4Resultado({ progreso, resultado, esquema, hayRechazos, onDescargarRechazos, onVerHistorial, onNueva }) {
  if (!resultado) {
    const pct = progreso?.total ? Math.round((progreso.procesadas / progreso.total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 rounded-full border-4 border-green-200 border-t-green-800 animate-spin mx-auto" />
        <h2 className="text-2xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          Importando...
        </h2>
        <p className="text-sm text-slate-500">No cierres esta pestaña hasta que termine.</p>
        <div className="w-full bg-green-100 h-2.5 rounded-full overflow-hidden">
          <div className="bg-green-800 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-600 font-semibold">
          {progreso?.procesadas ?? 0} de {progreso?.total ?? "…"} filas procesadas
        </p>
      </div>
    );
  }

  const t = TITULOS[resultado.estado] || TITULOS.completada;
  const c = resultado.conteos;
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm text-center space-y-6">
      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border-2 ${t.clase}`}>
        <span className="material-symbols-outlined text-4xl">{t.icono}</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
          {t.titulo}
        </h2>
        <p className="text-slate-600 text-sm font-medium">
          {c.insertados} insertados y {c.actualizados} actualizados en {esquema.nombre}.
        </p>
      </div>

      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folio:</span>
          <span className="font-mono text-xs font-black text-green-900 bg-green-100 px-3 py-1 rounded-lg border border-green-300">{resultado.folio}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADOS_IMPORTACION[resultado.estado]?.clase}`}>
            {ESTADOS_IMPORTACION[resultado.estado]?.etiqueta}
          </span>
        </div>
        <p className="text-xs text-slate-700 font-semibold">
          {c.recibidos} recibidos · {c.insertados} insertados · {c.actualizados} actualizados · {c.sinCambios + c.omitidos} omitidos · {c.rechazados}{" "}
          rechazados{c.noProcesados > 0 ? ` · ${c.noProcesados} no procesados` : ""}
        </p>
      </div>

      {resultado.estado === "interrumpida" ? (
        <p className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 font-medium text-left leading-relaxed">
          Lo procesado quedó guardado. Para terminar, volvé a importar el mismo archivo en modo «Solo agregar nuevos»: lo que ya entró se omite
          automáticamente. El detalle de cada fila está en el historial.
        </p>
      ) : (
        c.insertados + c.actualizados > 0 && (
          <p className="text-xs text-slate-500">Podés deshacer esta importación durante las próximas 12 horas desde el historial.</p>
        )
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {hayRechazos && (
          <button
            onClick={onDescargarRechazos}
            className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Descargar rechazados
          </button>
        )}
        <button
          onClick={onVerHistorial}
          className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">history</span>
          Ver historial
        </button>
        <button
          onClick={onNueva}
          className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-5 py-3.5 rounded-2xl shadow-xl shadow-green-900/20 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">replay</span>
          Realizar otra importación
        </button>
      </div>
    </div>
  );
}
