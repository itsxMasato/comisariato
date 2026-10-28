import React, { useState } from "react";
import { almacenFirestore } from "../../importacion/almacenFirestore";
import { ErrorDeshacer, deshacerImportacion } from "../../importacion/deshacer";
import { ESQUEMAS } from "../../importacion/esquemas";
import { ErrorCandado } from "../../importacion/historial";
import { MOTIVOS_NO_DESHACER, formatearDuracion } from "./estados";

export default function ModalDeshacer({ importacion, restanteMs, reanudar, usuario, role, onCerrar, onTerminado }) {
  const [estado, setEstado] = useState("confirmar"); // confirmar | ejecutando | listo
  const [resultado, setResultado] = useState(null);
  const [noRevertidas, setNoRevertidas] = useState([]);
  const [error, setError] = useState(null);
  if (!importacion) return null;

  const esquema = ESQUEMAS[importacion.modulo];
  const { insertados = 0, actualizados = 0 } = importacion.conteos || {};

  const confirmar = async () => {
    setEstado("ejecutando");
    setError(null);
    try {
      const r = await deshacerImportacion({ almacen: almacenFirestore, importacionId: importacion.id, usuario, role });
      const bloques = await almacenFirestore.leerTodos(`importaciones/${importacion.id}/filas`);
      setNoRevertidas(
        bloques.flatMap((b) => b.filas).filter((f) => f.reversion && f.reversion.estado !== "revertido"),
      );
      setResultado(r);
      setEstado("listo");
      onTerminado();
    } catch (e) {
      setError(
        e instanceof ErrorDeshacer ? MOTIVOS_NO_DESHACER[e.motivo] : e instanceof ErrorCandado ? e.message : e.message || "Error inesperado",
      );
      setEstado("confirmar");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 max-h-[85vh] overflow-y-auto">
        <h3 className="text-xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          {reanudar ? "Reanudar reversión" : "Deshacer importación"} {importacion.folio}
        </h3>

        {estado !== "listo" && (
          <>
            <ul className="text-sm text-slate-700 space-y-1.5">
              {esquema.soloCreacion ? (
                <li>
                  Se <strong>deshabilitan</strong> los {insertados} usuarios creados y se desvinculan de sus empleados. Las cuentas no se borran.
                </li>
              ) : (
                <>
                  <li>
                    Se <strong>borran</strong> los {insertados} registros insertados, salvo los que ya se usan en un crédito o reserva, o que
                    alguien editó después.
                  </li>
                  <li>
                    Se <strong>restauran</strong> los valores anteriores de los {actualizados} registros actualizados, solo en los campos que nadie
                    cambió después.
                  </li>
                </>
              )}
            </ul>
            {!reanudar && (
              <p className="text-xs text-slate-500">
                Disponible por {formatearDuracion(restanteMs)} más. Una importación se puede deshacer una sola vez.
              </p>
            )}
            {error && <p className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-900 font-medium">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCerrar}
                disabled={estado === "ejecutando"}
                className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl disabled:opacity-50"
              >
                Volver
              </button>
              <button
                onClick={confirmar}
                disabled={estado === "ejecutando"}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-5 py-3 rounded-2xl disabled:opacity-60 flex items-center gap-2"
              >
                {estado === "ejecutando" && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {estado === "ejecutando" ? "Deshaciendo..." : reanudar ? "Sí, reanudar" : "Sí, deshacer"}
              </button>
            </div>
          </>
        )}

        {estado === "listo" && resultado && (
          <>
            <p className="text-sm text-slate-700">
              {resultado.estado === "revertida"
                ? "Se revirtieron todos los registros."
                : resultado.estado === "revirtiendo"
                  ? `La reversión se cortó (${resultado.error}). Podés reanudarla desde el historial.`
                  : "Se revirtió parte de la importación. Estos registros hay que corregirlos a mano:"}
            </p>
            <p className="text-xs text-slate-600 font-semibold">
              {resultado.conteos.revertidos} revertidos · {resultado.conteos.parciales} parciales · {resultado.conteos.noRevertidos} no revertidos
            </p>
            {noRevertidas.length > 0 && (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {noRevertidas.map((f) => (
                  <li key={f.filaExcel} className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                    <strong>Fila {f.filaExcel}</strong> {f.clave && <span className="font-mono">({f.clave})</span>}:{" "}
                    {f.reversion.motivo || `campos sin revertir: ${f.reversion.camposNoRevertidos.join(", ")}`}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button onClick={onCerrar} className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-5 py-3 rounded-2xl">
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
