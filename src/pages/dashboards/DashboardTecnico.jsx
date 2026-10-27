import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import {
  toDate,
  todayISO,
  lastDaysRange,
  inRange,
  formatDateTime,
  normalizeText,
  isActivo,
} from "./dashboardUtils";
import { CHART_COLORS } from "./chartColors";
import { StackedBar, MiniColumns, BarList, Legend, TipContent } from "./charts";

const DIAS_PERIODO = 30;
const ULTIMOS_REGISTROS = 5;
const MAX_ROLES_VISIBLES = 6;

// Color por tipo de evento (mismo orden en barras, leyenda y etiquetas de la bitácora)
const TIPOS_EVENTO = [
  { tipo: "Creación", color: CHART_COLORS.primary, pill: "bg-green-100 text-green-800" },
  { tipo: "Modificación", color: CHART_COLORS.blue, pill: "bg-blue-100 text-blue-800" },
  { tipo: "Acceso", color: CHART_COLORS.amber, pill: "bg-amber-100 text-amber-800" },
];
const PILL_TIPO = Object.fromEntries(TIPOS_EVENTO.map((t) => [t.tipo, t.pill]));

// Colección de Firestore -> módulo mostrado en el dashboard
const COLECCIONES_MODULO = {
  creditos: "Créditos",
  cuotas: "Créditos",
  productos: "Productos",
  usuarios: "Usuarios",
  roles: "Usuarios",
  empleados: "Empleados",
};

// Módulos de logActividad que se agrupan como configuración
const MODULOS_CONFIGURACION = ["departamentos", "categorias", "parametros generales"];

const obtenerUsuario = (data) =>
  [
    data.usuarioModifico,
    data.usuario,
    data.usuarioRegistro,
    data.updatedBy,
    data.createdBy,
    data.email,
    data.correo,
  ]
    .map((v) => String(v || "").trim())
    .find((v) => v && v.toLowerCase() !== "sistema") || "Sistema";

const describirRegistro = (coleccion, data) => {
  const nombre =
    data.nombre ||
    [data.nombres, data.apellidos].filter(Boolean).join(" ") ||
    data.creditoId ||
    data.email ||
    "";
  const etiqueta = {
    creditos: "crédito",
    cuotas: "pago de cuota",
    productos: "producto",
    usuarios: "usuario",
    roles: "rol",
    empleados: "empleado",
  }[coleccion];
  return nombre ? `${etiqueta} (${nombre})` : etiqueta;
};

const capitalizar = (texto) => texto.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const fechaCreacion = (data) => toDate(data.fechaRegistro || data.createdAt || data.fecha);
const fechaModificacion = (data) =>
  toDate(data.fechaModificacion || data.fechaActualizacion || data.updatedDate || data.updatedAt);

const KpiCard = ({ accent, icon, badge, badgeClass, label, value, valueSuffix, valueSuffixClass, chart, footer }) => (
  <article className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${accent.border} flex flex-col justify-between`}>
    <div>
      <div className="flex justify-between items-start mb-2">
        <div className={`p-1.5 rounded-lg ${accent.iconBg} ${accent.text}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <span className={`whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
      </div>
      <p className="min-h-[26px] text-slate-400 text-[10px] font-bold uppercase tracking-wide leading-tight">{label}</p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <h3 className="text-2xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
          {value}
        </h3>
        <span className={`text-xs ${valueSuffixClass}`}>{valueSuffix}</span>
      </div>
      {chart && <div className="mt-3 flex min-h-[40px] flex-col justify-end gap-1.5">{chart}</div>}
    </div>
    <div className="pt-2 mt-3 border-t border-slate-100 text-[11px] text-slate-600 font-medium leading-snug">{footer}</div>
  </article>
);

const ACCENTS = {
  green: { border: "border-green-800", iconBg: "bg-green-50", text: "text-green-800" },
  emerald: { border: "border-emerald-700", iconBg: "bg-emerald-50", text: "text-emerald-700" },
};

export default function DashboardTecnico() {
  const [fechaFiltro, setFechaFiltro] = useState(() => todayISO());
  const [colecciones, setColecciones] = useState({});

  useEffect(() => {
    const nombres = ["bitacoraactividades", ...Object.keys(COLECCIONES_MODULO)];
    const unsubs = nombres.map((nombre) =>
      onSnapshot(collection(db, nombre), (s) =>
        setColecciones((prev) => ({ ...prev, [nombre]: s.docs.map((d) => ({ id: d.id, ...d.data() })) })),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const periodo = useMemo(() => lastDaysRange(fechaFiltro, DIAS_PERIODO), [fechaFiltro]);
  const usuarios = useMemo(() => colecciones.usuarios || [], [colecciones.usuarios]);
  const roles = useMemo(() => colecciones.roles || [], [colecciones.roles]);

  // ──────────────────────────────────────────────────────────
  // EVENTOS (bitácora explícita + creaciones/modificaciones por colección)
  // ──────────────────────────────────────────────────────────
  const eventos = useMemo(() => {
    const lista = [];

    (colecciones.bitacoraactividades || []).forEach((d) => {
      const fecha = toDate(d.fechaRegistro);
      if (!fecha) return;
      const accion = String(d.tipoModificacion || d.accion || "Evento del sistema");
      const accionNorm = normalizeText(accion);
      const moduloNorm = normalizeText(d.modulo);
      lista.push({
        id: `bit-${d.id}`,
        fecha,
        usuario: obtenerUsuario(d),
        modulo: MODULOS_CONFIGURACION.includes(moduloNorm) ? "Configuración" : d.modulo || "Sistema",
        detalle: accion,
        tipoOp: accionNorm.includes("sesion")
          ? "Acceso"
          : accionNorm.includes("creacion")
            ? "Creación"
            : "Modificación",
      });
    });

    Object.entries(COLECCIONES_MODULO).forEach(([nombre, modulo]) => {
      (colecciones[nombre] || []).forEach((d) => {
        const creado = fechaCreacion(d);
        const modificado = fechaModificacion(d);
        const descripcion = describirRegistro(nombre, d);
        if (creado) {
          lista.push({
            id: `${nombre}-${d.id}-c`,
            fecha: creado,
            usuario: obtenerUsuario(d),
            modulo,
            detalle: `Registro de ${descripcion}`,
            tipoOp: "Creación",
          });
        }
        if (modificado && (!creado || modificado.getTime() !== creado.getTime())) {
          lista.push({
            id: `${nombre}-${d.id}-m`,
            fecha: modificado,
            usuario: obtenerUsuario(d),
            modulo,
            detalle: d.tipoModificacion || `Actualización de ${descripcion}`,
            tipoOp: "Modificación",
          });
        }
      });
    });

    return lista.sort((a, b) => b.fecha - a.fecha);
  }, [colecciones]);

  const eventosPeriodo = useMemo(() => eventos.filter((e) => inRange(e.fecha, periodo)), [eventos, periodo]);

  const actividad = useMemo(() => {
    const porModulo = {};
    const totales = { Creación: 0, Modificación: 0, Acceso: 0 };
    eventosPeriodo.forEach((e) => {
      totales[e.tipoOp] += 1;
      if (!porModulo[e.modulo]) {
        porModulo[e.modulo] = { modulo: e.modulo, Creación: 0, Modificación: 0, Acceso: 0, totalActividad: 0 };
      }
      porModulo[e.modulo][e.tipoOp] += 1;
      porModulo[e.modulo].totalActividad += 1;
    });
    const modulos = Object.values(porModulo).sort((a, b) => b.totalActividad - a.totalActividad);
    return {
      modulos,
      max: modulos[0]?.totalActividad || 0,
      creados: totales["Creación"],
      modificados: totales["Modificación"],
      accesos: totales.Acceso,
    };
  }, [eventosPeriodo]);

  const cuentas = useMemo(() => {
    const habilitados = usuarios.filter((u) => isActivo(u.estado));
    return {
      habilitados,
      deshabilitadas: usuarios.length - habilitados.length,
      registradas: usuarios.filter((u) => inRange(fechaCreacion(u), periodo)).length,
      modificadas: usuarios.filter((u) => inRange(fechaModificacion(u), periodo)).length,
    };
  }, [usuarios, periodo]);

  const rolesResumen = useMemo(() => {
    const activos = roles.filter((r) => (r.estado || "Activo") !== "Deshabilitado");
    return { activos: activos.length, inactivos: roles.length - activos.length };
  }, [roles]);

  // Usuarios habilitados por rol (barras ordenadas; la cola se agrupa en "Otros")
  const rolesDetalle = useMemo(() => {
    const conteo = {};
    cuentas.habilitados.forEach((u) => {
      const rol = String(u.rol || "Sin rol").trim();
      conteo[rol] = (conteo[rol] || 0) + 1;
    });
    const ordenados = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    if (ordenados.length <= MAX_ROLES_VISIBLES) return ordenados.map(([rol, usuariosRol]) => ({ rol, usuarios: usuariosRol }));
    const visibles = ordenados.slice(0, MAX_ROLES_VISIBLES - 1);
    const otros = ordenados.slice(MAX_ROLES_VISIBLES - 1);
    return [
      ...visibles.map(([rol, usuariosRol]) => ({ rol, usuarios: usuariosRol })),
      {
        rol: `Otros (${otros.length} roles)`,
        usuarios: otros.reduce((s, [, n]) => s + n, 0),
        detalle: otros.map(([r, n]) => `${r.toLowerCase()} ${n}`).join(" · "),
      },
    ];
  }, [cuentas.habilitados]);

  const totalHabilitados = cuentas.habilitados.length;

  // Tendencia diaria de eventos dentro del período
  const actividadDiaria = useMemo(() => {
    const dias = Array.from({ length: DIAS_PERIODO }, (_, i) => {
      const d = new Date(periodo.start.getFullYear(), periodo.start.getMonth(), periodo.start.getDate() + i);
      return { key: d.toDateString(), fecha: d, total: 0 };
    });
    const porKey = new Map(dias.map((d) => [d.key, d]));
    eventosPeriodo.forEach((e) => {
      const dia = porKey.get(e.fecha.toDateString());
      if (dia) dia.total += 1;
    });
    return dias;
  }, [eventosPeriodo, periodo]);

  const bitacoraRegistros = useMemo(
    () => eventos.filter((e) => e.fecha <= periodo.end).slice(0, ULTIMOS_REGISTROS),
    [eventos, periodo],
  );

  const eventosModulos = actividad.creados + actividad.modificados;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-gray-50 text-gray-900 space-y-4"
    >
      {/* 1. CABECERA */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
            Dashboard Técnico
          </h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">
            Supervisión de cuentas, roles, auditoría de eventos y actividad por módulo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
            <span className="material-symbols-outlined text-slate-500 text-base">calendar_today</span>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => e.target.value && setFechaFiltro(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>
          <span className="whitespace-nowrap rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">
            Últimos {DIAS_PERIODO} días
          </span>
        </div>
      </section>

      {/* 2. TARJETAS KPI */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          accent={ACCENTS.green}
          icon="people"
          badge={`${cuentas.deshabilitadas} deshab.`}
          badgeClass={cuentas.deshabilitadas > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}
          label="Cuentas de Usuario"
          value={totalHabilitados}
          valueSuffix="habilitadas"
          valueSuffixClass="text-green-800 font-bold"
          chart={
            <>
              <StackedBar
                emptyLabel="Sin cuentas registradas"
                segments={[
                  { label: "habilitadas", value: totalHabilitados, color: CHART_COLORS.primary },
                  { label: "deshabilitadas", value: cuentas.deshabilitadas, color: CHART_COLORS.neutral },
                ]}
              />
              <Legend
                items={[
                  { label: "habilitadas", value: totalHabilitados, color: CHART_COLORS.primary },
                  { label: "deshab.", value: cuentas.deshabilitadas, color: CHART_COLORS.neutral },
                ]}
              />
            </>
          }
          footer={`${cuentas.registradas} registradas · ${cuentas.modificadas} modificadas`}
        />
        <KpiCard
          accent={ACCENTS.green}
          icon="admin_panel_settings"
          badge={`${rolesResumen.inactivos} inact.`}
          badgeClass="bg-slate-100 text-slate-700"
          label="Roles de Seguridad"
          value={rolesResumen.activos}
          valueSuffix="activos"
          valueSuffixClass="text-green-800 font-bold"
          chart={
            <>
              <StackedBar
                emptyLabel="Sin roles registrados"
                segments={[
                  { label: "activos", value: rolesResumen.activos, color: CHART_COLORS.primary },
                  { label: "inactivos", value: rolesResumen.inactivos, color: CHART_COLORS.neutral },
                ]}
              />
              <Legend
                items={[
                  { label: "activos", value: rolesResumen.activos, color: CHART_COLORS.primary },
                  { label: "inactivos", value: rolesResumen.inactivos, color: CHART_COLORS.neutral },
                ]}
              />
            </>
          }
          footer={`${totalHabilitados} usuarios asignados`}
        />
        <KpiCard
          accent={ACCENTS.emerald}
          icon="history"
          badge={`${actividad.modulos.length} móds.`}
          badgeClass="bg-emerald-100 text-emerald-800"
          label="Actividad Registrada"
          value={eventosPeriodo.length}
          valueSuffix="eventos"
          valueSuffixClass="text-slate-500 font-semibold"
          chart={
            <MiniColumns
              height={40}
              gap={1}
              data={actividadDiaria.map((d) => ({
                key: d.key,
                value: d.total,
                tip: (
                  <TipContent
                    value={`${d.total} ${d.total === 1 ? "evento" : "eventos"}`}
                    label={d.fecha.toLocaleDateString("es-HN", { day: "2-digit", month: "short" })}
                  />
                ),
              }))}
            />
          }
          footer={`Por día · ${actividad.creados} creac. · ${actividad.modificados} modif. · ${actividad.accesos} acc.`}
        />
        <KpiCard
          accent={ACCENTS.emerald}
          icon="sync_alt"
          badge="Trazabilidad"
          badgeClass="bg-emerald-100 text-emerald-800"
          label="Eventos en Módulos"
          value={eventosModulos}
          valueSuffix="transacciones"
          valueSuffixClass="text-slate-500 font-semibold"
          chart={
            <>
              <StackedBar
                emptyLabel="Sin transacciones en el período"
                segments={[
                  { label: "creados", value: actividad.creados, color: CHART_COLORS.primary },
                  { label: "modificados", value: actividad.modificados, color: CHART_COLORS.blue },
                ]}
              />
              <Legend
                items={[
                  { label: "creados", value: actividad.creados, color: CHART_COLORS.primary },
                  { label: "modificados", value: actividad.modificados, color: CHART_COLORS.blue },
                ]}
              />
            </>
          }
          footer="Creaciones y modificaciones de registros"
        />
      </section>

      {/* 3. GRÁFICOS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel A: Actividad y trazabilidad por módulo (barras apiladas por tipo) */}
        <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                Actividad y Trazabilidad por Módulo
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">Eventos del período por tipo de operación</p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {eventosPeriodo.length} Eventos
            </span>
          </div>

          <Legend
            className="mb-3"
            items={[
              { label: "Creación", value: actividad.creados, color: CHART_COLORS.primary },
              { label: "Modificación", value: actividad.modificados, color: CHART_COLORS.blue },
              { label: "Acceso", value: actividad.accesos, color: CHART_COLORS.amber },
            ]}
          />

          {actividad.modulos.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-400 font-medium">Sin actividad registrada en el período.</p>
          ) : (
            <ul className="space-y-3">
              {actividad.modulos.map((m) => (
                <li key={m.modulo} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2rem] items-center gap-3">
                  <span className="truncate text-[11px] font-semibold text-slate-700" title={m.modulo}>
                    {m.modulo}
                  </span>
                  <span className="block" style={{ width: `${(m.totalActividad / actividad.max) * 100}%` }}>
                    <StackedBar
                      height={10}
                      segments={TIPOS_EVENTO.map((t) => ({
                        label: t.tipo,
                        value: m[t.tipo],
                        color: t.color,
                        tip: <TipContent value={m[t.tipo]} label={`${t.tipo} · ${m.modulo}`} />,
                      }))}
                    />
                  </span>
                  <strong className="text-right text-[11px] font-black text-slate-900 tabular-nums">{m.totalActividad}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Panel B: Usuarios habilitados por rol (barras ordenadas) */}
        <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                Usuarios Habilitados por Rol
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">Cuentas activas asignadas a cada rol</p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-[10px] font-bold text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              {totalHabilitados} Cuentas
            </span>
          </div>

          <BarList
            emptyLabel="No hay cuentas habilitadas."
            items={rolesDetalle.map((r) => {
              const nombre = r.detalle ? r.rol : capitalizar(r.rol);
              const pct = totalHabilitados > 0 ? Math.round((r.usuarios / totalHabilitados) * 100) : 0;
              return {
                key: r.rol,
                label: nombre,
                value: r.usuarios,
                valueLabel: r.usuarios,
                secondary: `${pct}%`,
                tip: (
                  <TipContent
                    value={`${r.usuarios} ${r.usuarios === 1 ? "usuario" : "usuarios"}`}
                    label={r.detalle || nombre}
                  />
                ),
              };
            })}
          />
        </article>
      </section>

      {/* 4. TABLA DE BITÁCORA */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
          <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
            Últimos Registros de Bitácora
          </h4>
          <span className="text-[10px] font-bold text-slate-400">{bitacoraRegistros.length} eventos recientes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                <th className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bitacoraRegistros.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap">{formatDateTime(item.fecha)}</td>
                  <td className="px-3 py-2 font-mono text-slate-900 font-bold">{item.usuario}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{item.modulo}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${PILL_TIPO[item.tipoOp]}`}
                    >
                      {item.tipoOp}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.detalle}</td>
                </tr>
              ))}
              {bitacoraRegistros.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400 font-medium">
                    No hay registros en la bitácora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
