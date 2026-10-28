import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../auth/AuthProvider";
import { hasPermission, MODULES, ACTIONS } from "../../utils/roles";
import {
  isActivo,
  toDate,
  todayISO,
  parseISODate,
  monthRange,
  inRange,
  formatMonthLabel,
  formatDate,
  formatLempiras,
  normalizeText,
  fullName,
  buildPersonFinder,
} from "./dashboardUtils";
import { CHART_COLORS, STATUS_TONES } from "./chartColors";
import {
  StackedBar,
  MiniColumns,
  Meter,
  BarList,
  Legend,
  TipContent,
} from "./charts";

const MESES_TENDENCIA = 6;

// Determina qué secciones del dashboard puede ver el rol. Cada tarjeta y panel
// exige permiso de lectura sobre el módulo del que salen sus datos. Un rol que
// solo tiene acceso al dashboard (p. ej. CEO) es de consulta gerencial y ve todo.
const getVisibilidad = (role) => {
  const puede = (modulo) => hasPermission(role, modulo, ACTIONS.VIEW);
  const ver = {
    creditos: puede(MODULES.CREDITOS),
    cuotas: puede(MODULES.CUOTAS),
    productos: puede(MODULES.PRODUCTOS),
    empleados: puede(MODULES.EMPLEADOS),
  };
  const soloConsulta = !Object.values(ver).some(Boolean);
  return soloConsulta ? { creditos: true, cuotas: true, productos: true, empleados: true } : ver;
};

// Columnas del grid de KPIs según cuántas tarjetas ve el rol
const kpiGridClass = (n) =>
  n >= 5
    ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    : n === 3
      ? "md:grid-cols-3"
      : n === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 lg:grid-cols-4";

// Umbral por defecto cuando el producto no define stockMinimo (igual que Productos.jsx)
const STOCK_MINIMO_DEFAULT = 20;

// Obtiene el número total de cuotas del crédito a partir de los campos
// disponibles en el registro. Valida que el valor sea numérico y positivo;
// si no encuentra uno válido, utiliza 1 como valor predeterminado.
const getCuotasTotales = (c) => {
  const candidato = [c.cuotas, c.numeroCuotas, c.cantidadCuotas, c.totalCuotas, c.plazo, c.plazoMeses]
    .map(Number)
    .find((n) => Number.isFinite(n) && n > 0);
  return candidato || 1;
};

// Unifica los distintos valores de estado almacenados en los créditos
// para clasificarlos como Pendiente, Rechazado, Pagado o Activo,
// facilitando el cálculo uniforme de los indicadores.
const normalizeCreditStatus = (c) => {
  const raw = normalizeText(c.estado || c.status || "activo");
  if (raw === "pendiente") return "Pendiente";
  if (raw === "rechazado" || raw === "rechazo") return "Rechazado";
  if (["pagado", "liquidado", "finalizado"].includes(raw)) return "Pagado";
  return "Activo";
};

// Calcula los meses completos transcurridos entre dos fechas.
// Considera el día del mes para no contabilizar como completo
// un mes que todavía no ha terminado.
const monthsBetween = (start, end) => {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
};

const KpiCard = ({ onClick, accent, icon, badge, badgeClass, label, value, valueSuffix, chart, footer }) => (
  <article
    onClick={onClick}
    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${accent.border} cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between`}
    role="button"
    tabIndex={0}
  >
    <div>
      <div className="flex justify-between items-start mb-2">
        <div className={`p-1.5 rounded-lg ${accent.iconBg} ${accent.text} ${accent.iconHover} transition-colors`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <span className={`whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
      </div>
      <p className="min-h-[26px] text-slate-400 text-[10px] font-bold uppercase tracking-wide leading-tight">{label}</p>
      <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
        <h3 className="text-2xl font-black text-slate-900 whitespace-nowrap" style={{ fontFamily: "Manrope, sans-serif" }}>
          {value}
        </h3>
        {valueSuffix && <span className="text-xs text-slate-500 font-semibold">{valueSuffix}</span>}
      </div>
      {chart && <div className="mt-3 flex min-h-[40px] flex-col justify-end gap-1.5">{chart}</div>}
    </div>
    <div className="pt-2 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
      <span className="min-w-0 truncate text-slate-600 font-medium" title={footer}>{footer}</span>
      <span
        className={`inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-lg ${accent.iconBg} ${accent.text} ${accent.iconHover} transition-colors`}
        title="Ver detalle"
      >
        <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-0.5">arrow_forward</span>
      </span>
    </div>
  </article>
);

const ACCENTS = {
  red: { border: "border-red-600", iconBg: "bg-red-50", text: "text-red-600", iconHover: "group-hover:bg-red-100" },
  green: { border: "border-green-800", iconBg: "bg-green-50", text: "text-green-800", iconHover: "group-hover:bg-green-100" },
  emerald: { border: "border-emerald-700", iconBg: "bg-emerald-50", text: "text-emerald-700", iconHover: "group-hover:bg-emerald-100" },
  blue: { border: "border-blue-600", iconBg: "bg-blue-50", text: "text-blue-600", iconHover: "group-hover:bg-blue-100" },
};

const Pill = ({ className, children }) => (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`}>{children}</span>
);

// Establece suscripciones en tiempo real a las colecciones de empleados,
// usuarios, créditos, cuotas y productos. Actualiza los estados del componente
// cuando Firestore notifica cambios y cancela las suscripciones al desmontarlo.
export default function DashboardGerencial() {
  const { role } = useAuth();
  const ver = useMemo(() => getVisibilidad(role), [role]);
  const [modalKey, setModalKey] = useState(null);
  const [fechaFiltro, setFechaFiltro] = useState(() => todayISO());
  const [empleados, setEmpleados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [creditosRaw, setCreditosRaw] = useState([]);
  const [cuotasRaw, setCuotasRaw] = useState([]);
  const [productos, setProductos] = useState([]);

  // Solo se suscribe a las colecciones que alimentan las secciones visibles
  // para el rol. Los pagos necesitan los créditos para mostrar código y empleado.
  const verFinanzas = ver.creditos || ver.cuotas;
  useEffect(() => {
    const listen = (name, setter) =>
      onSnapshot(collection(db, name), (s) => setter(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubs = [
      (verFinanzas || ver.empleados) && listen("empleados", setEmpleados),
      verFinanzas && listen("usuarios", setUsuarios),
      verFinanzas && listen("creditos", setCreditosRaw),
      verFinanzas && listen("cuotas", setCuotasRaw),
      ver.productos && listen("productos", setProductos),
    ].filter(Boolean);
    return () => unsubs.forEach((u) => u());
  }, [verFinanzas, ver.empleados, ver.productos]);

  useEffect(() => {
    if (!modalKey) return;
    const onKey = (e) => e.key === "Escape" && setModalKey(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalKey]);

  const periodo = useMemo(() => monthRange(fechaFiltro), [fechaFiltro]);
  const periodoLabel = useMemo(() => formatMonthLabel(fechaFiltro), [fechaFiltro]);

  // Consolida la información de créditos, cuotas, empleados y usuarios.
  // Relaciona los pagos con cada crédito, calcula el monto pagado, el saldo
  // pendiente y las cuotas vencidas, y normaliza los datos para utilizarlos
  // en los indicadores de solicitudes y cartera.
  const creditos = useMemo(() => {
    const findPerson = buildPersonFinder(empleados, usuarios);
    const pagosPorCredito = new Map();
    cuotasRaw.forEach((q) => {
      const key = String(q.creditoId || "");
      if (!pagosPorCredito.has(key)) pagosPorCredito.set(key, []);
      pagosPorCredito.get(key).push(q);
    });

    const now = new Date();
    const referencia = periodo.end < now ? periodo.end : now;

    return creditosRaw.map((c) => {
      const empleadoId = String(c.empleadoId || c.usuarioId || "").trim();
      const persona = findPerson(empleadoId);
      const pagos = [
        ...(pagosPorCredito.get(String(c.id)) || []),
        ...(c.creditoId && String(c.creditoId) !== String(c.id) ? pagosPorCredito.get(String(c.creditoId)) || [] : []),
      ];
      const monto = Number(c.totalCredito || c.total || 0);
      const pagado = pagos.reduce((s, q) => s + (Number(q.monto) || 0), 0);
      const cuotasTotales = getCuotasTotales(c);
      const status = normalizeCreditStatus(c);
      const fechaInicio = toDate(c.fechaInicio || c.fechaAutoriza || c.updatedDate || c.createdAt);

      let cuotasVencidas = 0;
      if (status === "Activo" && fechaInicio && fechaInicio <= referencia) {
        const esperadas = Math.min(cuotasTotales, monthsBetween(fechaInicio, referencia));
        cuotasVencidas = Math.max(0, esperadas - pagos.length);
      }

      return {
        id: c.id,
        code: c.creditoId || c.orderId || `CR-${String(c.id).substring(0, 6).toUpperCase()}`,
        empleado: fullName(persona) || c.empleado || c.empleadoNombre || c.nombreEmpleado || "No vinculado",
        depto: persona?.departamento || "N/A",
        fechaSolicitud: toDate(c.createdAt || c.fecha || c.fechaSolicitud || c.fechaAutoriza),
        monto,
        cuotasTotales,
        status,
        saldo: status === "Pendiente" ? monto : Math.max(0, monto - pagado),
        cuotasVencidas,
      };
    });
  }, [creditosRaw, cuotasRaw, empleados, usuarios, periodo]);

  // KPI 1: Solicitudes del período
  // Filtra los créditos según su fecha de solicitud y el período seleccionado.
  // Clasifica las solicitudes como pendientes, aprobadas o rechazadas y calcula
  // el porcentaje de aprobación entre las solicitudes resueltas.
  const solicitudes = useMemo(() => {
    const delPeriodo = creditos
      .filter((c) => inRange(c.fechaSolicitud, periodo))
      .map((c) => ({
        ...c,
        estadoSolicitud:
          c.status === "Pendiente" ? "Pendiente" : c.status === "Rechazado" ? "Rechazada" : "Aprobada",
      }));
    const pendientes = delPeriodo.filter((c) => c.estadoSolicitud === "Pendiente").length;
    const aprobadas = delPeriodo.filter((c) => c.estadoSolicitud === "Aprobada").length;
    const rechazadas = delPeriodo.filter((c) => c.estadoSolicitud === "Rechazada").length;
    const resueltas = aprobadas + rechazadas;
    const orden = { Pendiente: 0, Aprobada: 1, Rechazada: 2 };
    return {
      rows: delPeriodo.sort(
        (a, b) => orden[a.estadoSolicitud] - orden[b.estadoSolicitud] || (b.fechaSolicitud || 0) - (a.fechaSolicitud || 0),
      ),
      recibidas: delPeriodo.length,
      pendientes,
      aprobadas,
      rechazadas,
      pctAprobadas: resueltas > 0 ? Math.round((aprobadas / resueltas) * 100) : 0,
    };
  }, [creditos, periodo]);

  // KPI 2: Pagos registrados en el período
  // Filtra las cuotas registradas dentro del período seleccionado, las relaciona
  // con sus créditos y prepara los datos de cada pago. Calcula el monto total
  // recaudado y organiza las transacciones por fecha, de la más reciente a la más antigua.
  const pagos = useMemo(() => {
    const creditoPorId = new Map();
    creditos.forEach((c) => creditoPorId.set(String(c.id), c));
    const rows = cuotasRaw
      .map((q) => ({ ...q, fecha: toDate(q.fechaRegistro || q.fecha) }))
      .filter((q) => inRange(q.fecha, periodo))
      .sort((a, b) => b.fecha - a.fecha)
      .map((q) => {
        const credito = creditoPorId.get(String(q.creditoId));
        return {
          id: `PAG-${String(q.id).substring(0, 6).toUpperCase()}`,
          creditoCode: credito?.code || "—",
          empleado: credito?.empleado || "No vinculado",
          fecha: q.fecha,
          monto: Number(q.monto) || 0,
          registradoPor: q.usuarioRegistro || "—",
        };
      });
    return { rows, total: rows.reduce((s, q) => s + q.monto, 0) };
  }, [cuotasRaw, creditos, periodo]);

  // Construye una serie de seis meses a partir de la fecha seleccionada
  // y acumula los montos de las cuotas registradas en cada mes para representar
  // la evolución de los cobros en el gráfico.
  const pagosMensuales = useMemo(() => {
    const base = parseISODate(fechaFiltro);
    const meses = Array.from({ length: MESES_TENDENCIA }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (MESES_TENDENCIA - 1) + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: new Intl.DateTimeFormat("es-HN", { month: "short", year: "numeric" }).format(d),
        total: 0,
      };
    });
    const porKey = new Map(meses.map((m) => [m.key, m]));
    cuotasRaw.forEach((q) => {
      const f = toDate(q.fechaRegistro || q.fecha);
      const mes = f && porKey.get(`${f.getFullYear()}-${f.getMonth()}`);
      if (mes) mes.total += Number(q.monto) || 0;
    });
    return meses;
  }, [cuotasRaw, fechaFiltro]);

  // KPI 3: Cartera (saldo pendiente, activos, pendientes y mora)
  // Selecciona los créditos activos y pendientes, determina su estado de cartera
  // según las cuotas vencidas y ordena los registros por prioridad. Calcula
  // el saldo pendiente, el monto de créditos activos y las cantidades de créditos
  // activos, pendientes y en mora.
  const cartera = useMemo(() => {
    const rows = creditos
      .filter((c) => c.status === "Activo" || c.status === "Pendiente")
      .map((c) => ({
        ...c,
        estadoCartera: c.status === "Pendiente" ? "Pendiente" : c.cuotasVencidas > 0 ? "En Mora" : "Activo",
      }));
    const orden = { "En Mora": 0, Activo: 1, Pendiente: 2 };
    rows.sort((a, b) => orden[a.estadoCartera] - orden[b.estadoCartera] || b.saldo - a.saldo);
    const activos = rows.filter((c) => c.status === "Activo");
    return {
      rows,
      saldoPendiente: activos.reduce((s, c) => s + c.saldo, 0),
      montoActivos: activos.reduce((s, c) => s + c.monto, 0),
      activos: activos.length,
      pendientes: rows.filter((c) => c.estadoCartera === "Pendiente").length,
      enMora: rows.filter((c) => c.estadoCartera === "En Mora").length,
    };
  }, [creditos]);

  // KPI 4: Inventario bajo
  // Compara el stock actual de cada producto con su stock mínimo establecido.
  // Si el producto no tiene un mínimo definido, utiliza el valor predeterminado.
  // Clasifica los productos como críticos o bajos y prioriza los que requieren
  // reposición con mayor urgencia.
  const inventarioBajo = useMemo(
    () =>
      productos
        .map((p) => {
          const stockActual = Number(p.stock) || 0;
          const stockMinimo = Number(p.stockMinimo) || STOCK_MINIMO_DEFAULT;
          return {
            id: p.id,
            codigo: p.productoId || p.codigo || String(p.id).substring(0, 8).toUpperCase(),
            producto: p.nombre || "Sin nombre",
            categoria: p.categoria || "Sin categoría",
            stockActual,
            stockMinimo,
            estado: stockActual <= Math.floor(stockMinimo / 2) ? "Crítico" : "Bajo",
          };
        })
        .filter((p) => p.stockActual <= p.stockMinimo)
        .sort((a, b) => a.stockActual / a.stockMinimo - b.stockActual / b.stockMinimo),
    [productos],
  );

  // Tabla B: Distribución de productos por categoría
  // Agrupa los productos por categoría y calcula la cantidad de productos,
  // las unidades disponibles y el porcentaje que representa cada categoría
  // respecto al catálogo total. Ordena los resultados por cantidad de productos.
  const distribucionCategorias = useMemo(() => {
    const grupos = {};
    productos.forEach((p) => {
      const cat = p.categoria || "Sin categoría";
      if (!grupos[cat]) grupos[cat] = { categoria: cat, productos: 0, unidades: 0 };
      grupos[cat].productos += 1;
      grupos[cat].unidades += Number(p.stock) || 0;
    });
    const total = productos.length || 1;
    return Object.values(grupos)
      .map((g) => ({ ...g, porcentaje: Math.round((g.productos / total) * 100) }))
      .sort((a, b) => b.productos - a.productos);
  }, [productos]);

  // KPI 5: Personal
  // Clasifica a los empleados como activos o inactivos (sin estado cuenta como
  // activo, igual que Empleados.jsx) y agrupa a los activos por departamento.
  const personal = useMemo(() => {
    const rows = empleados
      .map((e) => ({
        id: e.id,
        codigo: e.codigoEmpleado || String(e.id).substring(0, 8).toUpperCase(),
        nombre: fullName(e) || "Sin nombre",
        departamento: e.departamento || "Sin departamento",
        limiteCredito: Number(e.limiteCredito) || 0,
        estado: isActivo(e.estado || "activo") ? "Activo" : "Inactivo",
      }))
      .sort((a, b) => (a.estado === b.estado ? a.nombre.localeCompare(b.nombre) : a.estado === "Activo" ? -1 : 1));
    const activos = rows.filter((e) => e.estado === "Activo");
    const grupos = {};
    activos.forEach((e) => {
      grupos[e.departamento] = (grupos[e.departamento] || 0) + 1;
    });
    const departamentos = Object.entries(grupos)
      .map(([departamento, total]) => ({ departamento, total }))
      .sort((a, b) => b.total - a.total);
    return { rows, activos: activos.length, inactivos: rows.length - activos.length, departamentos };
  }, [empleados]);

  const carteraTop = useMemo(() => cartera.rows.filter((c) => c.status === "Activo").slice(0, 5), [cartera]);

  const numKpis = [ver.creditos, ver.cuotas, ver.creditos, ver.productos, ver.empleados].filter(Boolean).length;

  const areasVisibles = [
    ver.creditos && "solicitudes y cartera",
    ver.cuotas && "cobros",
    ver.productos && "inventario",
    ver.empleados && "personal",
  ].filter(Boolean);
  const subtituloAreas =
    areasVisibles.length > 1
      ? `${areasVisibles.slice(0, -1).join(", ")} y ${areasVisibles[areasVisibles.length - 1]}`
      : areasVisibles[0];

  // ──────────────────────────────────────────────────────────
  // CONFIGURACIÓN DE MODALES DINÁMICOS POR KPI
  // ──────────────────────────────────────────────────────────
  const kpiConfigs = {
    solicitudes: {
      titulo: "Auditoría de Solicitudes del Período",
      subtitulo: `${solicitudes.recibidas} recibidas en ${periodoLabel}: ${solicitudes.pendientes} pendientes de revisión, ${solicitudes.aprobadas} aprobadas (${solicitudes.pctAprobadas}% de resolución) y ${solicitudes.rechazadas} rechazadas`,
      datos: solicitudes.rows,
      columns: ["ID", "Empleado", "Departamento", "Fecha", "Monto", "Cuotas", "Estado"],
    },
    pagos: {
      titulo: "Total de Pagos Registrados en el Período",
      subtitulo: `${formatLempiras(pagos.total)} recaudados en ${pagos.rows.length} transacciones durante ${periodoLabel}`,
      datos: pagos.rows,
      columns: ["ID Recibo", "ID Crédito", "Empleado", "Fecha", "Monto", "Registrado por", "Estado"],
    },
    cartera: {
      titulo: "Cartera de Créditos: Activos, Pendientes y Mora",
      subtitulo: `${formatLempiras(cartera.saldoPendiente)} en saldo pendiente total (${cartera.activos} activos, ${cartera.pendientes} pendientes, ${cartera.enMora} en mora)`,
      datos: cartera.rows,
      columns: ["ID Crédito", "Empleado", "Departamento", "Monto Total", "Saldo Pendiente", "Cuotas Venc.", "Estado"],
    },
    inventario: {
      titulo: "Detalle de Productos con Inventario Bajo",
      subtitulo: `${inventarioBajo.length} artículos en o por debajo del stock mínimo establecido que requieren reposición`,
      datos: inventarioBajo,
      columns: ["Código", "Producto", "Categoría", "Stock Actual", "Stock Mínimo", "Nivel Alerta"],
    },
    personal: {
      titulo: "Plantilla de Empleados",
      subtitulo: `${personal.activos} activos y ${personal.inactivos} inactivos, distribuidos en ${personal.departamentos.length} departamentos`,
      datos: personal.rows,
      columns: ["Código", "Empleado", "Departamento", "Límite de Crédito", "Estado"],
    },
  };

  const modalData = modalKey ? kpiConfigs[modalKey] : null;

  const solicitudPillClass = (estado) =>
    estado === "Aprobada" ? "bg-green-100 text-green-800" : estado === "Rechazada" ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-700";
  const carteraPillClass = (estado) =>
    estado === "En Mora" ? "bg-red-100 text-red-700" : estado === "Activo" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800";
  const alertaPillClass = (estado) => (estado === "Crítico" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-gray-50 text-gray-900 space-y-4"
      >
        {/* 1. CABECERA CON FILTRO NATIVO COMPACTO */}
        <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              Dashboard Gerencial
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-0.5">
              Seguimiento de {subtituloAreas} de Comisariato Pro.
            </p>
          </div>

          {verFinanzas && (
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
              {periodoLabel}
            </span>
          </div>
          )}
        </section>

        {/* 2. TARJETAS KPI (según los módulos que puede ver el rol) */}
        <section className={`grid grid-cols-1 ${kpiGridClass(numKpis)} gap-4`}>
          {ver.creditos && (
          <KpiCard
            onClick={() => setModalKey("solicitudes")}
            accent={ACCENTS.red}
            icon="pending_actions"
            badge={`${solicitudes.pendientes} pendientes`}
            badgeClass="bg-red-100 text-red-700"
            label="Solicitudes del Período"
            value={solicitudes.pendientes}
            valueSuffix={`de ${solicitudes.recibidas} recibidas`}
            chart={
              <>
                <StackedBar
                  emptyLabel="Sin solicitudes en el período"
                  segments={[
                    { label: "aprobadas", value: solicitudes.aprobadas, color: CHART_COLORS.primary },
                    { label: "pendientes", value: solicitudes.pendientes, color: CHART_COLORS.amber },
                    { label: "rechazadas", value: solicitudes.rechazadas, color: CHART_COLORS.neutral },
                  ]}
                />
                <Legend
                  items={[
                    { label: "aprob.", value: solicitudes.aprobadas, color: CHART_COLORS.primary },
                    { label: "pend.", value: solicitudes.pendientes, color: CHART_COLORS.amber },
                    { label: "rech.", value: solicitudes.rechazadas, color: CHART_COLORS.neutral },
                  ]}
                />
              </>
            }
            footer={`${solicitudes.pctAprobadas}% aprobadas`}
          />
          )}
          {ver.cuotas && (
          <KpiCard
            onClick={() => setModalKey("pagos")}
            accent={ACCENTS.green}
            icon="payments"
            badge={`${pagos.rows.length} pagos`}
            badgeClass="bg-green-100 text-green-800"
            label="Total Pagos Registrados"
            value={formatLempiras(pagos.total, 0)}
            chart={
              <MiniColumns
                height={40}
                highlightKey={pagosMensuales[pagosMensuales.length - 1]?.key}
                data={pagosMensuales.map((m) => ({
                  key: m.key,
                  value: m.total,
                  tip: <TipContent value={formatLempiras(m.total, 0)} label={m.label} />,
                }))}
              />
            }
            footer={`${MESES_TENDENCIA} meses de cobro`}
          />
          )}
          {ver.creditos && (
          <KpiCard
            onClick={() => setModalKey("cartera")}
            accent={ACCENTS.emerald}
            icon="account_balance_wallet"
            badge={`${cartera.enMora} en mora`}
            badgeClass={cartera.enMora > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}
            label="Saldo Pendiente"
            value={formatLempiras(cartera.saldoPendiente, 0)}
            chart={
              <>
                <div className="flex items-baseline justify-between text-[10px] text-slate-500">
                  <span>Recuperado de la cartera</span>
                  <strong className="font-bold text-slate-700">
                    {cartera.montoActivos > 0
                      ? `${Math.round(((cartera.montoActivos - cartera.saldoPendiente) / cartera.montoActivos) * 100)}%`
                      : "—"}
                  </strong>
                </div>
                <Meter
                  value={cartera.montoActivos - cartera.saldoPendiente}
                  max={cartera.montoActivos}
                  tone={cartera.enMora > 0 ? STATUS_TONES.warning : STATUS_TONES.good}
                  label="Porcentaje recuperado de la cartera activa"
                />
              </>
            }
            footer={`${cartera.activos} activos · ${cartera.pendientes} pend.`}
          />
          )}
          {ver.productos && (
          <KpiCard
            onClick={() => setModalKey("inventario")}
            accent={ACCENTS.red}
            icon="inventory_2"
            badge="Bajo mínimo"
            badgeClass="bg-red-100 text-red-700"
            label="Inventario Bajo Stock"
            value={inventarioBajo.length}
            valueSuffix={`de ${productos.length} productos`}
            chart={
              <>
                <StackedBar
                  emptyLabel="Sin productos registrados"
                  segments={[
                    { label: "críticos", value: inventarioBajo.filter((p) => p.estado === "Crítico").length, color: STATUS_TONES.critical.fill },
                    { label: "bajos", value: inventarioBajo.filter((p) => p.estado === "Bajo").length, color: STATUS_TONES.warning.fill },
                    { label: "en stock", value: productos.length - inventarioBajo.length, color: "#bbf7d0" },
                  ]}
                />
                <Legend
                  items={[
                    { label: "crít.", value: inventarioBajo.filter((p) => p.estado === "Crítico").length, color: STATUS_TONES.critical.fill },
                    { label: "bajo", value: inventarioBajo.filter((p) => p.estado === "Bajo").length, color: STATUS_TONES.warning.fill },
                    { label: "ok", value: productos.length - inventarioBajo.length, color: "#bbf7d0" },
                  ]}
                />
              </>
            }
            footer="Por reponer"
          />
          )}
          {ver.empleados && (
          <KpiCard
            onClick={() => setModalKey("personal")}
            accent={ACCENTS.blue}
            icon="badge"
            badge={`${personal.inactivos} inactivos`}
            badgeClass="bg-blue-100 text-blue-700"
            label="Empleados Activos"
            value={personal.activos}
            valueSuffix={`de ${personal.rows.length} registrados`}
            chart={
              <>
                <StackedBar
                  emptyLabel="Sin empleados registrados"
                  segments={[
                    { label: "activos", value: personal.activos, color: CHART_COLORS.blue },
                    { label: "inactivos", value: personal.inactivos, color: CHART_COLORS.neutral },
                  ]}
                />
                <Legend
                  items={[
                    { label: "activos", value: personal.activos, color: CHART_COLORS.blue },
                    { label: "inactivos", value: personal.inactivos, color: CHART_COLORS.neutral },
                  ]}
                />
              </>
            }
            footer={`${personal.departamentos.length} departamentos`}
          />
          )}
        </section>

        {/* 3. PANELES RESUMEN (según los módulos que puede ver el rol) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel: Créditos activos con mayor riesgo */}
          {ver.creditos && (
          <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Créditos Activos con Mayor Riesgo
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Primero los créditos en mora, luego los de mayor saldo</p>
              </div>
              <button
                onClick={() => setModalKey("cartera")}
                className="shrink-0 whitespace-nowrap text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Ver cartera ({cartera.rows.length}) →
              </button>
            </div>

            <ul className="divide-y divide-slate-100">
              {carteraTop.map((cred) => {
                const tone = cred.estadoCartera === "En Mora" ? STATUS_TONES.critical : STATUS_TONES.good;
                return (
                  <li key={cred.id} className="py-2.5 first:pt-1">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-gray-900" title={cred.empleado}>
                          {cred.empleado}
                        </p>
                        <p className="truncate font-mono text-[10px] font-medium text-slate-400">{cred.code}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="whitespace-nowrap text-[11px] tabular-nums">
                          <strong className="font-black text-slate-900">{formatLempiras(cred.saldo, 0)}</strong>
                          <span className="font-medium text-slate-400"> / {formatLempiras(cred.monto, 0)}</span>
                        </p>
                        <p className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${tone.text}`}>
                          <span className="material-symbols-outlined text-[12px]">{tone.icon}</span>
                          {cred.cuotasVencidas > 0 ? `${cred.cuotasVencidas} cuotas vencidas` : "Al día"}
                        </p>
                      </div>
                    </div>
                    <Meter
                      value={cred.monto - cred.saldo}
                      max={cred.monto}
                      tone={tone}
                      label={`${cred.empleado}: ${formatLempiras(cred.monto - cred.saldo, 0)} pagados de ${formatLempiras(cred.monto, 0)}`}
                    />
                  </li>
                );
              })}
              {carteraTop.length === 0 && (
                <li className="py-6 text-center text-[11px] font-medium text-slate-400">No hay créditos activos.</li>
              )}
            </ul>
          </article>
          )}

          {/* Panel: Empleados activos por departamento */}
          {ver.empleados && (
          <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Empleados Activos por Departamento
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  Distribución de los {personal.activos} empleados activos
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {personal.departamentos.length} Departamentos
              </span>
            </div>

            <BarList
              color={CHART_COLORS.blue}
              emptyLabel="No hay empleados activos."
              items={personal.departamentos.slice(0, 7).map((d) => ({
                key: d.departamento,
                label: d.departamento,
                value: d.total,
                valueLabel: `${Math.round((d.total / (personal.activos || 1)) * 100)}%`,
                secondary: `${d.total} emp.`,
                tip: <TipContent value={`${d.total} ${d.total === 1 ? "empleado" : "empleados"}`} label={d.departamento} />,
              }))}
            />
          </article>
          )}

          {/* Tabla A: Últimos productos con inventario bajo */}
          {ver.productos && (
          <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Últimos Productos con Inventario Bajo
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Artículos que alcanzaron el stock mínimo de reposición</p>
              </div>
              <button
                onClick={() => setModalKey("inventario")}
                className="shrink-0 whitespace-nowrap text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                Ver todos ({inventarioBajo.length}) →
              </button>
            </div>

            <ul className="divide-y divide-slate-100">
              {inventarioBajo.slice(0, 5).map((prod) => {
                const tone = prod.estado === "Crítico" ? STATUS_TONES.critical : STATUS_TONES.warning;
                return (
                  <li key={prod.id} className="py-2.5 first:pt-1">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-gray-900" title={prod.producto}>
                          {prod.producto}
                        </p>
                        <p className="truncate text-[10px] font-medium text-slate-400">{prod.categoria}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="whitespace-nowrap text-[11px] tabular-nums">
                          <strong className="font-black text-slate-900">{prod.stockActual}</strong>
                          <span className="font-medium text-slate-400"> / {prod.stockMinimo} unid.</span>
                        </p>
                        <p className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${tone.text}`}>
                          <span className="material-symbols-outlined text-[12px]">{tone.icon}</span>
                          {prod.stockActual === 0 ? "Agotado" : prod.estado}
                        </p>
                      </div>
                    </div>
                    <Meter
                      value={prod.stockActual}
                      max={prod.stockMinimo}
                      tone={tone}
                      label={`${prod.producto}: ${prod.stockActual} de ${prod.stockMinimo} unidades mínimas`}
                    />
                  </li>
                );
              })}
              {inventarioBajo.length === 0 && (
                <li className="py-6 text-center text-[11px] font-medium text-slate-400">
                  Todo el inventario está sobre el stock mínimo.
                </li>
              )}
            </ul>
          </article>
          )}

          {/* Tabla B: Distribución de productos por categoría */}
          {ver.productos && (
          <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Distribución de Productos por Categoría
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  % del catálogo ({productos.length} productos) y unidades en stock
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-bold text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                {distribucionCategorias.length} Categorías
              </span>
            </div>

            <BarList
              emptyLabel="No hay productos registrados."
              items={distribucionCategorias.slice(0, 7).map((cat) => ({
                key: cat.categoria,
                label: cat.categoria,
                value: cat.productos,
                valueLabel: `${cat.porcentaje}%`,
                secondary: `${cat.unidades.toLocaleString("es-HN")} u.`,
                tip: (
                  <TipContent
                    value={`${cat.productos} ${cat.productos === 1 ? "producto" : "productos"}`}
                    label={`${cat.categoria} · ${cat.unidades.toLocaleString("es-HN")} unidades`}
                  />
                ),
              }))}
            />
          </article>
          )}
        </section>
      </motion.div>

      {/* 4. MODAL DE DETALLE (fuera de motion.div para evitar línea blanca superior) */}
      <AnimatePresence>
        {modalData && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalKey(null);
            }}
            className="fixed inset-0 !m-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col cursor-default border border-slate-100"
            >
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                    {modalData.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{modalData.subtitulo}</p>
                </div>
                <button
                  onClick={() => setModalKey(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              <div className="overflow-y-auto overflow-x-auto flex-1 mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                    <tr>
                      {modalData.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalKey === "solicitudes" &&
                      modalData.datos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{item.code}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.empleado}</td>
                          <td className="px-3 py-2 text-slate-600">{item.depto}</td>
                          <td className="px-3 py-2 text-slate-500">{formatDate(item.fechaSolicitud)}</td>
                          <td className="px-3 py-2 font-black text-green-800">{formatLempiras(item.monto)}</td>
                          <td className="px-3 py-2 text-slate-600">{item.cuotasTotales} {item.cuotasTotales === 1 ? "cuota" : "cuotas"}</td>
                          <td className="px-3 py-2">
                            <Pill className={solicitudPillClass(item.estadoSolicitud)}>{item.estadoSolicitud}</Pill>
                          </td>
                        </tr>
                      ))}

                    {modalKey === "pagos" &&
                      modalData.datos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{item.id}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{item.creditoCode}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.empleado}</td>
                          <td className="px-3 py-2 text-slate-500">{formatDate(item.fecha)}</td>
                          <td className="px-3 py-2 font-black text-green-800">{formatLempiras(item.monto)}</td>
                          <td className="px-3 py-2 text-slate-600">{item.registradoPor}</td>
                          <td className="px-3 py-2">
                            <Pill className="bg-green-100 text-green-800">Aplicado</Pill>
                          </td>
                        </tr>
                      ))}

                    {modalKey === "cartera" &&
                      modalData.datos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{item.code}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.empleado}</td>
                          <td className="px-3 py-2 text-slate-600">{item.depto}</td>
                          <td className="px-3 py-2 text-slate-600">{formatLempiras(item.monto)}</td>
                          <td className="px-3 py-2 font-black text-slate-900">{formatLempiras(item.saldo)}</td>
                          <td className="px-3 py-2 font-semibold text-center">
                            {item.cuotasVencidas > 0 ? (
                              <span className="text-red-600 font-bold">{item.cuotasVencidas} cuotas</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Pill className={carteraPillClass(item.estadoCartera)}>{item.estadoCartera}</Pill>
                          </td>
                        </tr>
                      ))}

                    {modalKey === "inventario" &&
                      modalData.datos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{item.codigo}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.producto}</td>
                          <td className="px-3 py-2 text-slate-600">{item.categoria}</td>
                          <td className="px-3 py-2">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {item.stockActual} unid.
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-semibold">{item.stockMinimo} unid.</td>
                          <td className="px-3 py-2">
                            <Pill className={alertaPillClass(item.estado)}>{item.estado}</Pill>
                          </td>
                        </tr>
                      ))}

                    {modalKey === "personal" &&
                      modalData.datos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{item.codigo}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.nombre}</td>
                          <td className="px-3 py-2 text-slate-600">{item.departamento}</td>
                          <td className="px-3 py-2 font-black text-green-800">{formatLempiras(item.limiteCredito)}</td>
                          <td className="px-3 py-2">
                            <Pill className={item.estado === "Activo" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}>
                              {item.estado}
                            </Pill>
                          </td>
                        </tr>
                      ))}

                    {modalData.datos.length === 0 && (
                      <tr>
                        <td colSpan={modalData.columns.length} className="px-3 py-8 text-center text-slate-400 font-medium">
                          No hay registros para este período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Registros mostrados: <strong className="text-slate-700">{modalData.datos.length}</strong>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
