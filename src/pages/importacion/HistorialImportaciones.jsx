import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { almacenFirestore } from "../../importacion/almacenFirestore";
import { puedeDeshacer } from "../../importacion/deshacer";
import { ESQUEMAS } from "../../importacion/esquemas";
import { estadoMostrado } from "../../importacion/historial";
import { ACTIONS, MODULES, hasPermission, modulosConImport } from "../../utils/roles";
import DetalleImportacion from "./DetalleImportacion";
import { ESTADOS_IMPORTACION, MOTIVOS_NO_DESHACER, formatearDuracion, formatearFechaHora } from "./estados";
import ModalDeshacer from "./ModalDeshacer";

const POR_PAGINA = 25;
const ESTADOS_FILTRABLES = ["en_proceso", "completada", "completada_con_advertencias", "interrumpida", "revirtiendo", "revertida", "revertida_parcial"];

const idDeModulo = (moduloPermiso) => Object.values(ESQUEMAS).find((e) => e.moduloPermiso === moduloPermiso)?.id;

export default function HistorialImportaciones() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const verTodo = hasPermission(role, MODULES.IMPORTACIONES, ACTIONS.VIEW);
  const importables = modulosConImport(role).map(idDeModulo);
  const modulosVisibles = verTodo ? Object.keys(ESQUEMAS) : importables;
  const usuario = { uid: user?.uid, correo: user?.email, rol: role };

  const [filtros, setFiltros] = useState({ modulo: "", estado: "", desde: "", hasta: "" });
  const [filas, setFilas] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [menuNueva, setMenuNueva] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [deshacer, setDeshacer] = useState(null);
  const [ahora, setAhora] = useState(() => new Date());

  const cargar = useCallback(
    async (despuesDe = null) => {
      setCargando(true);
      setError(null);
      const donde = [];
      if (filtros.modulo) donde.push(["modulo", "==", filtros.modulo]);
      else if (!verTodo) donde.push(["modulo", "in", modulosVisibles.length ? modulosVisibles : ["-"]]);
      if (filtros.estado) donde.push(["estado", "==", filtros.estado]);
      if (filtros.desde) donde.push(["fechaInicio", ">=", new Date(`${filtros.desde}T00:00:00`)]);
      if (filtros.hasta) donde.push(["fechaInicio", "<=", new Date(`${filtros.hasta}T23:59:59`)]);
      try {
        const r = await almacenFirestore.consultar("importaciones", { donde, orden: ["fechaInicio", "desc"], limite: POR_PAGINA, despuesDe });
        setFilas((previas) => (despuesDe ? [...previas, ...r.docs] : r.docs));
        setCursor(r.ultimo);
        setHayMas(r.docs.length === POR_PAGINA);
        setAhora(new Date());
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar el historial. Si el error menciona un índice, hay que publicar firestore.indexes.json.");
      } finally {
        setCargando(false);
      }
    },
    // modulosVisibles se deriva del rol: basta con depender de role y verTodo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtros, verTodo, role],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const opcionDeshacer = (imp) => puedeDeshacer(imp, { uid: user?.uid, role }, ahora);

  const botonDeshacer = (imp, compacto = false) => {
    const op = opcionDeshacer(imp);
    if (!op.ok) {
      return op.motivo === "plazo_vencido" || op.motivo === "sin_permiso" ? (
        <span className="text-[10px] text-slate-400" title={MOTIVOS_NO_DESHACER[op.motivo]}>
          {compacto ? "—" : MOTIVOS_NO_DESHACER[op.motivo]}
        </span>
      ) : null;
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDeshacer({ importacion: imp, ...op });
        }}
        className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 px-2.5 py-1 rounded-lg whitespace-nowrap"
        title={op.reanudar ? "Reanudar la reversión interrumpida" : `Disponible por ${formatearDuracion(op.restanteMs)}`}
      >
        {op.reanudar ? "Reanudar reversión" : `Deshacer · ${formatearDuracion(op.restanteMs)}`}
      </button>
    );
  };

  const cambiarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            Historial de importaciones
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Cada carga desde Excel, con su folio, resultado y responsable.</p>
        </div>
        {importables.length > 0 && (
          <div className="relative self-start md:self-auto">
            <button
              onClick={() => setMenuNueva((v) => !v)}
              className="bg-green-700 hover:bg-green-800 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-green-900/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              Nueva importación
            </button>
            {menuNueva && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
                {importables.map((id) => (
                  <button
                    key={id}
                    onClick={() => navigate(`/importar/${id}`)}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-green-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base text-green-800">{ESQUEMAS[id].icono}</span>
                    {ESQUEMAS[id].nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select value={filtros.modulo} onChange={(e) => cambiarFiltro("modulo", e.target.value)} className="bg-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none">
          <option value="">Todos los módulos</option>
          {modulosVisibles.map((id) => (
            <option key={id} value={id}>
              {ESQUEMAS[id].nombre}
            </option>
          ))}
        </select>
        <select value={filtros.estado} onChange={(e) => cambiarFiltro("estado", e.target.value)} className="bg-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none">
          <option value="">Todos los estados</option>
          {ESTADOS_FILTRABLES.map((e) => (
            <option key={e} value={e}>
              {ESTADOS_IMPORTACION[e].etiqueta}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 text-xs text-slate-500">
          Desde
          <input type="date" value={filtros.desde} onChange={(e) => cambiarFiltro("desde", e.target.value)} className="bg-transparent font-semibold text-slate-700 outline-none flex-1" />
        </label>
        <label className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 text-xs text-slate-500">
          Hasta
          <input type="date" value={filtros.hasta} onChange={(e) => cambiarFiltro("hasta", e.target.value)} className="bg-transparent font-semibold text-slate-700 outline-none flex-1" />
        </label>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200">
              <tr>
                {["Folio", "Archivo", "Módulo", "Fecha", "Recib.", "Insert.", "Actual.", "Omit.", "Rechaz.", "Responsable", "Estado", ""].map((t) => (
                  <th key={t} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((imp) => {
                const est = estadoMostrado(imp, ahora);
                const c = imp.conteos || {};
                return (
                  <tr key={imp.id} onClick={() => setDetalle(imp)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{imp.folio}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={imp.archivo?.nombre}>
                      {imp.archivo?.nombre}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ESQUEMAS[imp.modulo]?.nombre}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatearFechaHora(imp.fechaInicio)}</td>
                    <td className="px-4 py-3 font-semibold">{c.recibidos}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-800">{c.insertados}</td>
                    <td className="px-4 py-3 font-semibold text-blue-800">{c.actualizados}</td>
                    <td className="px-4 py-3 font-semibold text-amber-800">{(c.omitidos ?? 0) + (c.sinCambios ?? 0)}</td>
                    <td className="px-4 py-3 font-semibold text-red-800">{c.rechazados}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate" title={imp.responsable?.correo}>
                      {imp.responsable?.correo}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADOS_IMPORTACION[est]?.clase}`}>
                        {ESTADOS_IMPORTACION[est]?.etiqueta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{botonDeshacer(imp, true)}</td>
                  </tr>
                );
              })}
              {!cargando && !error && filas.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No hay importaciones con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(error || cargando || hayMas) && (
          <div className="p-4 border-t border-slate-100 text-center text-xs">
            {error ? (
              <p className="text-red-700">{error}</p>
            ) : cargando ? (
              <p className="text-slate-400">Cargando...</p>
            ) : (
              <button onClick={() => cargar(cursor)} className="font-bold text-green-800 hover:underline">
                Cargar más
              </button>
            )}
          </div>
        )}
      </div>

      {detalle && (
        <DetalleImportacion
          importacion={detalle}
          estadoVisible={estadoMostrado(detalle, ahora)}
          accionDeshacer={botonDeshacer(detalle)}
          onCerrar={() => setDetalle(null)}
        />
      )}
      {deshacer && (
        <ModalDeshacer
          importacion={deshacer.importacion}
          restanteMs={deshacer.restanteMs}
          reanudar={deshacer.reanudar}
          usuario={usuario}
          role={role}
          onCerrar={() => setDeshacer(null)}
          onTerminado={() => {
            setDetalle(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
