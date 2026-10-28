import React from "react";
import { ESTADOS_FILA, ESTADOS_REVERSION, formatearValor } from "./estados";

// Detalle de una fila: motivo de rechazo, cambios campo por campo o por qué se omitió
export default function ModalDetalleFila({ fila, esquema, onCerrar }) {
  if (!fila) return null;
  const est = ESTADOS_FILA[fila.estado];
  const etiqueta = (campo) => esquema.columnas.find((c) => c.campo === campo)?.etiqueta ?? campo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
      <div
        className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-flex items-center gap-1 border text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${est.clase}`}>
              <span className="material-symbols-outlined text-xs">{est.icono}</span>
              {est.etiqueta}
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-2" style={{ fontFamily: "Manrope, sans-serif" }}>
              Fila {fila.filaExcel} del Excel
            </h3>
            {fila.clave && <p className="text-xs text-slate-500 font-mono mt-0.5">{fila.clave}</p>}
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {fila.errores?.length > 0 && (
          <ul className="space-y-2">
            {fila.errores.map((e, i) => (
              <li key={i} className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-900">
                <p className="font-bold">{e.mensaje}</p>
                {e.valorRecibido !== "" && (
                  <p className="text-red-700 mt-0.5">
                    Valor recibido: <span className="font-mono">{String(e.valorRecibido)}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {fila.cambios?.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="text-left py-2">Campo</th>
                <th className="text-left py-2">Valor actual</th>
                <th className="text-left py-2">Valor nuevo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fila.cambios.map((c) => (
                <tr key={c.campo}>
                  <td className="py-2 font-bold text-slate-700">{etiqueta(c.campo)}</td>
                  <td className="py-2 text-slate-500 line-through">{formatearValor(c.anterior)}</td>
                  <td className="py-2 font-bold text-blue-800">{formatearValor(c.nuevo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {fila.estado === "omitido" && !fila.errores?.length && (
          <p className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-medium">
            {esquema.soloCreacion
              ? "Ya existe un registro con esta clave. En este módulo solo se crean registros nuevos, así que se conserva el existente."
              : "Ya existe un registro con esta clave. Con el modo «Solo agregar nuevos» se conserva el existente sin cambios."}
          </p>
        )}

        {fila.aviso && <p className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-medium">{fila.aviso}</p>}
        {fila.reversion && (
          <p className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 font-medium">
            Reversión: {ESTADOS_REVERSION[fila.reversion.estado]}
            {fila.reversion.motivo ? ` — ${fila.reversion.motivo}` : ""}
            {fila.reversion.camposNoRevertidos?.length ? ` (sin revertir: ${fila.reversion.camposNoRevertidos.map(etiqueta).join(", ")})` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
