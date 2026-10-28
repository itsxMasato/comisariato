import React from "react";

const PASOS = [
  { numero: 1, titulo: "Seleccionar archivo", desc: "Modo y documento .xlsx" },
  { numero: 2, titulo: "Vista previa y validación", desc: "Reglas, filtros y duplicados" },
  { numero: 3, titulo: "Confirmar", desc: "Resumen antes de escribir" },
  { numero: 4, titulo: "Resultado", desc: "Folio y conteos finales" },
];

export default function StepperHeader({ pasoActual, esquema, origen, onVolver, onIrAPaso, bloqueado }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <button
              onClick={onVolver}
              disabled={bloqueado}
              className="hover:text-green-800 flex items-center gap-1 text-slate-500 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              {origen}
            </button>
            <span>/</span>
            <span className="text-green-800 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">table_view</span>
              Importar desde Excel
            </span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            Importar desde Excel
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Carga masiva con validación automática antes de escribir en el sistema.
          </p>
        </div>
        <span className="self-start md:self-auto text-xs font-black text-green-800 bg-green-50 px-3 py-1.5 rounded-xl border border-green-200 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">{esquema.icono}</span>
          Importando en: {esquema.nombre}
        </span>
      </div>

      <div className="bg-white rounded-3xl p-4 md:p-6 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PASOS.map((p) => {
            const completado = pasoActual > p.numero;
            const actual = pasoActual === p.numero;
            const navegable = completado && !bloqueado && pasoActual < 4;
            return (
              <button
                key={p.numero}
                type="button"
                disabled={!navegable}
                onClick={() => navegable && onIrAPaso(p.numero)}
                className={`text-left flex items-center gap-3.5 p-3 rounded-2xl transition-all ${
                  actual
                    ? "bg-green-900 text-white shadow-md shadow-green-900/15"
                    : completado
                      ? `bg-green-50/70 border border-green-200/80 ${navegable ? "hover:bg-green-100/60 cursor-pointer" : ""}`
                      : "bg-slate-50/60 border border-slate-100 opacity-60"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    actual ? "bg-white text-green-900" : completado ? "bg-green-700 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {completado ? <span className="material-symbols-outlined text-lg">check</span> : p.numero}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-black truncate ${actual ? "text-white" : completado ? "text-green-950" : "text-slate-600"}`}
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {p.titulo}
                  </p>
                  <p className={`text-[11px] truncate ${actual ? "text-green-200" : completado ? "text-green-700" : "text-slate-400"}`}>
                    {p.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
