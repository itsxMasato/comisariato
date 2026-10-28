import React, { useMemo } from "react";
import { ESTADOS_FILA, valorParaMostrar } from "./estados";

const FILTROS = [
  { id: "todos", etiqueta: "Todos", resumen: "recibidos" },
  { id: "nuevo", etiqueta: "Nuevos", resumen: "nuevos" },
  { id: "actualizar", etiqueta: "A actualizar", resumen: "actualizar" },
  { id: "sin_cambios", etiqueta: "Sin cambios", resumen: "sinCambios" },
  { id: "omitido", etiqueta: "Omitidos", resumen: "omitidos" },
  { id: "rechazado", etiqueta: "Rechazados", resumen: "rechazados" },
];

const TARJETAS = [
  { resumen: "recibidos", titulo: "Filas recibidas", desc: "Leídas del archivo", icono: "receipt_long", color: "blue" },
  { resumen: "nuevos", titulo: "Nuevos", desc: "Se van a insertar", icono: "add_circle", color: "emerald" },
  { resumen: "actualizar", titulo: "A actualizar", desc: "Solo los campos que cambian", icono: "sync", color: "blue" },
  { resumen: "omitidos", titulo: "Omitidos / sin cambios", desc: "No se escriben", icono: "content_copy", color: "amber" },
  { resumen: "rechazados", titulo: "Rechazados", desc: "Datos inválidos", icono: "cancel", color: "red" },
];

const COLOR = {
  blue: "border-blue-200 text-blue-800 bg-blue-50",
  emerald: "border-emerald-200 text-emerald-800 bg-emerald-50",
  amber: "border-amber-200 text-amber-800 bg-amber-50",
  red: "border-red-200 text-red-800 bg-red-50",
};

export default function Paso2VistaPrevia({ esquema, clasificacion, mapa, filtro, onFiltro, busqueda, onBusqueda, onVerFila, aviso }) {
  const { resumen } = clasificacion;
  // Encabezado del archivo para cada campo del esquema, para mostrar lo que vino en el Excel
  const columnasVisibles = useMemo(() => {
    const encabezadoDe = Object.fromEntries(Object.entries(mapa).map(([enc, campo]) => [campo, enc]));
    return esquema.columnas
      .filter((c) => c.campo !== esquema.claveDuplicado && encabezadoDe[c.campo])
      .slice(0, 4)
      .map((c) => ({ ...c, encabezado: encabezadoDe[c.campo] }));
  }, [esquema, mapa]);

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clasificacion.filas.filter((f) => {
      if (filtro !== "todos" && f.estado !== filtro) return false;
      if (!q) return true;
      return [f.clave, ...Object.values(f.crudos)].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [clasificacion, filtro, busqueda]);

  return (
    <div className="space-y-6">
      {aviso && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-sm text-amber-900">
          <span className="material-symbols-outlined text-amber-700">warning</span>
          <p className="text-xs font-medium leading-relaxed">{aviso}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {TARJETAS.map((t) => (
          <div key={t.resumen} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-wider truncate">{t.titulo}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1" style={{ fontFamily: "Manrope, sans-serif" }}>
                {t.resumen === "omitidos" ? resumen.omitidos + resumen.sinCambios : resumen[t.resumen]}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate">{t.desc}</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${COLOR[t.color]}`}>
              <span className="material-symbols-outlined text-xl">{t.icono}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 mr-1 uppercase tracking-wider">Filtrar:</span>
          {FILTROS.filter((f) => f.id === "todos" || resumen[f.resumen] > 0).map((f) => (
            <button
              key={f.id}
              onClick={() => onFiltro(f.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                filtro === f.id ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.etiqueta}
              <span className={`text-[10px] px-1.5 rounded-full ${filtro === f.id ? "bg-white/20" : "bg-slate-300/60"}`}>{resumen[f.resumen]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Buscar en las filas..."
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            className="w-full bg-slate-100 border-none rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-green-700 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                {["Fila", "Estado", "Clave", ...columnasVisibles.map((c) => c.etiqueta), "Detalle"].map((t) => (
                  <th key={t} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={4 + columnasVisibles.length} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No hay filas con el filtro aplicado.
                  </td>
                </tr>
              ) : (
                filas.map((f) => {
                  const est = ESTADOS_FILA[f.estado];
                  const conDetalle = ["rechazado", "actualizar", "omitido"].includes(f.estado);
                  return (
                    <tr key={f.filaExcel} className={f.estado === "rechazado" ? "bg-red-50/30" : ""}>
                      <td className="px-5 py-3 font-mono font-bold text-slate-400">#{f.filaExcel}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 border text-[10px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${est.clase}`}>
                          <span className="material-symbols-outlined text-xs">{est.icono}</span>
                          {est.etiqueta}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-800">{f.clave || <span className="text-slate-400 font-sans">Se asigna al importar</span>}</td>
                      {columnasVisibles.map((c) => {
                        const { texto, original } = valorParaMostrar(f.crudos[c.encabezado], f.valores[c.campo]);
                        return (
                          <td key={c.campo} className="px-5 py-3 text-slate-700 max-w-[220px]">
                            <span className="block truncate" title={texto}>
                              {texto}
                            </span>
                            {original && (
                              <span
                                className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700"
                                title="El sistema lo ajustó al nombre registrado"
                              >
                                <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                                en el Excel: «{original}»
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-right">
                        {conDetalle ? (
                          <button
                            onClick={() => onVerFila(f)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-900 text-white whitespace-nowrap"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            {f.estado === "rechazado" ? "Ver motivo" : f.estado === "actualizar" ? "Ver cambios" : "Ver detalle"}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          Mostrando <strong className="text-slate-800">{filas.length}</strong> de <strong className="text-slate-800">{clasificacion.filas.length}</strong> filas.
          Las filas rechazadas, omitidas y sin cambios no se escriben. Los valores marcados con{" "}
          <span className="material-symbols-outlined text-[12px] align-middle text-blue-700">auto_fix_high</span> se ajustaron al nombre
          registrado en el sistema (mayúsculas o tildes).
        </div>
      </div>
    </div>
  );
}
