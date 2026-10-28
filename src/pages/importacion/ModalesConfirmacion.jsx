import React from "react";

const Fondo = ({ children, onCerrar }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCerrar}>
    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

export function ModalCancelar({ abierto, onCerrar, onConfirmar }) {
  if (!abierto) return null;
  return (
    <Fondo onCerrar={onCerrar}>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          ¿Cancelar la importación?
        </h3>
        <p className="text-sm text-slate-600">Se descarta el archivo cargado. No se escribió nada en el sistema.</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCerrar} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl">
          Seguir importando
        </button>
        <button onClick={onConfirmar} className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-5 py-3 rounded-2xl">
          Sí, cancelar
        </button>
      </div>
    </Fondo>
  );
}

export function ModalConfirmar({ abierto, onCerrar, onConfirmar, esquema, resumen }) {
  if (!abierto) return null;
  const aEscribir = resumen.nuevos + resumen.actualizar;
  return (
    <Fondo onCerrar={onCerrar}>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          Confirmar importación en {esquema.nombre}
        </h3>
        <ul className="text-sm text-slate-700 space-y-1">
          <li>
            <strong className="text-emerald-800">{resumen.nuevos}</strong> registros nuevos
          </li>
          <li>
            <strong className="text-blue-800">{resumen.actualizar}</strong> registros a actualizar
          </li>
          <li>
            <strong className="text-amber-800">{resumen.omitidos + resumen.sinCambios}</strong> omitidos y{" "}
            <strong className="text-red-800">{resumen.rechazados}</strong> rechazados (no se escriben)
          </li>
        </ul>
        {esquema.soloCreacion && aEscribir > 0 && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Se van a crear {aEscribir} accesos al sistema y cada persona recibirá un correo para establecer su contraseña.
          </p>
        )}
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCerrar} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl">
          Volver
        </button>
        <button
          onClick={onConfirmar}
          disabled={aEscribir === 0}
          className="text-xs font-bold text-white bg-green-700 hover:bg-green-800 px-5 py-3 rounded-2xl disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Sí, importar
        </button>
      </div>
    </Fondo>
  );
}
