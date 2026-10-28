import React from "react";
import { MODOS } from "../../importacion/validar";
import { formatearPeso } from "./estados";

const Cifra = ({ titulo, valor, desc, icono, clase }) => (
  <div className={`p-4 rounded-2xl border space-y-1 ${clase}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-black uppercase tracking-wide">{titulo}</span>
      <span className="material-symbols-outlined text-lg">{icono}</span>
    </div>
    <p className="text-3xl font-black" style={{ fontFamily: "Manrope, sans-serif" }}>
      {valor}
    </p>
    <p className="text-[11px] font-medium">{desc}</p>
  </div>
);

export default function Paso3Confirmacion({ esquema, archivo, lectura, clasificacion, modo }) {
  const { resumen } = clasificacion;
  const aEscribir = resumen.nuevos + resumen.actualizar;
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-800 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">{esquema.icono}</span>
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Módulo destino</p>
            <h4 className="font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              {esquema.nombre}
            </h4>
            <p className="text-[11px] text-slate-500">
              {esquema.soloCreacion ? "Solo creación" : modo === MODOS.NUEVOS_Y_ACTUALIZAR ? "Agregar nuevos y actualizar existentes" : "Solo agregar nuevos"}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2 min-w-0">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Archivo origen</p>
          <h4 className="font-black text-slate-900 truncate" style={{ fontFamily: "Manrope, sans-serif" }}>
            {archivo.name}
          </h4>
          <p className="text-xs text-slate-600">
            {formatearPeso(archivo.size)} • hoja {lectura.hoja} • {resumen.recibidos} filas leídas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Cifra titulo="A insertar" valor={resumen.nuevos} desc="Registros nuevos" icono="add_task" clase="bg-emerald-50 border-emerald-300 text-emerald-900" />
        <Cifra titulo="A actualizar" valor={resumen.actualizar} desc="Solo campos que cambian" icono="sync" clase="bg-blue-50 border-blue-300 text-blue-900" />
        <Cifra
          titulo="Omitidos"
          valor={resumen.omitidos + resumen.sinCambios}
          desc="Existentes o sin cambios"
          icono="content_copy"
          clase="bg-amber-50 border-amber-300 text-amber-900"
        />
        <Cifra titulo="Descartados" valor={resumen.rechazados} desc="Filas con datos inválidos" icono="cancel" clase="bg-red-50 border-red-300 text-red-900" />
      </div>

      {aEscribir === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-300 text-xs text-slate-700 font-medium">
          No hay registros nuevos ni cambios para aplicar.
        </div>
      ) : (
        <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-300 flex items-center gap-4 text-xs text-amber-950 font-medium">
          <span className="material-symbols-outlined text-xl text-amber-800">warning</span>
          <p className="leading-relaxed">
            Al confirmar se escriben {aEscribir} registros en {esquema.nombre}. Podés deshacer la importación desde el historial durante las 12 horas
            siguientes.
          </p>
        </div>
      )}
    </div>
  );
}
