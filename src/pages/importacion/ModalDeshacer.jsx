import React, { useEffect, useState } from "react";
import { almacenFirestore } from "../../importacion/almacenFirestore";
import { ErrorDeshacer, deshacerImportacion } from "../../importacion/deshacer";
import { ESQUEMAS } from "../../importacion/esquemas";
import { ErrorCandado } from "../../importacion/historial";
import { MOTIVOS_NO_DESHACER, formatearDuracion } from "./estados";

const ETAPAS = {
  preparando: "Preparando la reversión...",
  revisando: "Revisando cada registro...",
  guardando: "Guardando los cambios...",
};

// Panel de avance: deja claro que el sistema está trabajando y cuánto falta
const PanelAvance = ({ avance }) => {
  const pct = avance?.total ? Math.round((avance.procesadas / avance.total) * 100) : 0;
  return (
    <div className="space-y-4 py-2" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-red-100 border-t-red-600 animate-spin shrink-0" />
        <div>
          <p className="text-sm font-black text-slate-900">{ETAPAS[avance?.etapa] || ETAPAS.preparando}</p>
          <p className="text-xs text-slate-500">
            {avance?.total ? `${avance.procesadas} de ${avance.total} registros` : "Verificando permisos y datos relacionados"}
          </p>
        </div>
      </div>
      <div className="w-full bg-red-50 h-2.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-red-600 transition-all duration-300 ${avance?.total ? "" : "w-1/3 animate-pulse"}`}
          style={avance?.total ? { width: `${Math.max(pct, 3)}%` } : undefined}
        />
      </div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <span className="material-symbols-outlined text-sm text-amber-600">warning</span>
        No cierres esta ventana hasta que termine. Si se corta, la reversión se puede reanudar desde el historial.
      </p>
    </div>
  );
};

export default function ModalDeshacer({ importacion, restanteMs, reanudar, usuario, role, onCerrar, onTerminado }) {
  const [estado, setEstado] = useState("confirmar"); // confirmar | ejecutando | listo
  const [resultado, setResultado] = useState(null);
  const [noRevertidas, setNoRevertidas] = useState([]);
  const [error, setError] = useState(null);
  const [avance, setAvance] = useState(null);

  // Mientras se deshace, el navegador avisa antes de cerrar la pestaña
  useEffect(() => {
    if (estado !== "ejecutando") return undefined;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado]);

  if (!importacion) return null;

  const esquema = ESQUEMAS[importacion.modulo];
  const { insertados = 0, actualizados = 0 } = importacion.conteos || {};

  const confirmar = async () => {
    setEstado("ejecutando");
    setError(null);
    setAvance(null);
    try {
      const r = await deshacerImportacion({ almacen: almacenFirestore, importacionId: importacion.id, usuario, role, alAvanzar: setAvance });
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

        {estado === "ejecutando" && <PanelAvance avance={avance} />}

        {estado === "confirmar" && (
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
