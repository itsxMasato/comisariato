import React, { useEffect, useMemo, useState } from "react";
import { almacenFirestore } from "../../importacion/almacenFirestore";
import { ESQUEMAS } from "../../importacion/esquemas";
import { descargarArchivo, generarReporteRechazos } from "../../importacion/reporte";
import { ESTADOS_FILA, ESTADOS_IMPORTACION, ESTADOS_REVERSION, formatearFechaHora } from "./estados";
import ModalDetalleFila from "./ModalDetalleFila";

// Detalle de una importación: cada fila con su resultado y, si se deshizo, su reversión
export default function DetalleImportacion({ importacion, estadoVisible, accionDeshacer, onCerrar }) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [filaDetalle, setFilaDetalle] = useState(null);
  const esquema = ESQUEMAS[importacion.modulo];

  useEffect(() => {
    let vigente = true;
    almacenFirestore
      .leerTodos(`importaciones/${importacion.id}/filas`)
      .then((bloques) => {
        if (!vigente) return;
        bloques.sort((a, b) => a.id.localeCompare(b.id));
        setFilas(bloques.flatMap((b) => b.filas));
      })
      .catch((e) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [importacion.id, importacion.estado]);

  const estadosPresentes = useMemo(() => [...new Set((filas || []).map((f) => f.estado))], [filas]);
  const visibles = (filas || []).filter((f) => filtro === "todos" || f.estado === filtro);
  const hayRechazos = (filas || []).some((f) => f.estado === "rechazado");
  const c = importacion.conteos || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
      <div
        className="bg-white rounded-3xl p-6 max-w-5xl w-full shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black text-slate-900 font-mono">{importacion.folio}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADOS_IMPORTACION[estadoVisible]?.clase}`}>
                {ESTADOS_IMPORTACION[estadoVisible]?.etiqueta}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {esquema?.nombre} · {importacion.archivo?.nombre} · {formatearFechaHora(importacion.fechaInicio)} · {importacion.responsable?.correo}
            </p>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              {c.recibidos} recibidos · {c.insertados} insertados · {c.actualizados} actualizados · {(c.sinCambios ?? 0) + (c.omitidos ?? 0)} omitidos ·{" "}
              {c.rechazados} rechazados{c.noProcesados ? ` · ${c.noProcesados} no procesados` : ""}
            </p>
            {importacion.error && <p className="text-xs text-red-700 mt-1">Error: {importacion.error}</p>}
            {importacion.reversion?.conteos && (
              <p className="text-xs text-slate-600 mt-1">
                Reversión por {importacion.reversion.responsable?.correo}: {importacion.reversion.conteos.revertidos} revertidos ·{" "}
                {importacion.reversion.conteos.parciales} parciales · {importacion.reversion.conteos.noRevertidos} no revertidos
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {accionDeshacer}
            <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {["todos", ...estadosPresentes].map((e) => (
              <button
                key={e}
                onClick={() => setFiltro(e)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold ${filtro === e ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {e === "todos" ? "Todos" : ESTADOS_FILA[e]?.etiqueta}
              </button>
            ))}
          </div>
          {hayRechazos && (
            <button
              onClick={async () => descargarArchivo(await generarReporteRechazos(esquema, filas), `rechazados_${importacion.folio}.xlsx`)}
              className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-xl flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Descargar rechazados
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1">
          {error ? (
            <p className="text-sm text-red-700 p-6 text-center">No se pudo cargar el detalle: {error}</p>
          ) : !filas ? (
            <p className="text-sm text-slate-400 p-6 text-center">Cargando filas...</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {["Fila", "Clave", "Resultado", "Motivo / aviso", "Reversión", ""].map((t) => (
                    <th key={t} className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((f) => (
                  <tr key={f.filaExcel} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-400">#{f.filaExcel}</td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-800">{f.clave || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`border text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADOS_FILA[f.estado]?.clase}`}>
                        {ESTADOS_FILA[f.estado]?.etiqueta}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={f.errores?.map((e) => e.mensaje).join("; ") || f.aviso || ""}>
                      {f.errores?.map((e) => e.mensaje).join("; ") || f.aviso || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{f.reversion ? ESTADOS_REVERSION[f.reversion.estado] : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setFilaDetalle(f)} className="text-[11px] font-bold text-green-800 hover:underline">
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ModalDetalleFila fila={filaDetalle} esquema={esquema} onCerrar={() => setFilaDetalle(null)} />
      </div>
    </div>
  );
}
