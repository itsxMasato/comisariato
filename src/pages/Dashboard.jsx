import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

const EMPLEADOS_ACTIVOS_BASE = 840;

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("es-HN", {
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatAmount = (value) =>
  `L ${Number(value).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCompactAmount = (value) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace("HNL", "L");

const formatMoney = (value) =>
  `L ${Number(value).toLocaleString("es-HN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}k`;

export default function Dashboard() {
  const { userName, role: authRole } = useAuth();
  const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());
  const [empleadosData, setEmpleadosData] = useState([]);
  const [usuariosData, setUsuariosData] = useState([]);
  const [creditosData, setCreditosData] = useState([]);
  const [cuotasData, setCuotasData] = useState([]);
  const [productosData, setProductosData] = useState([]);

  useEffect(() => {
    const unsubE = onSnapshot(collection(db, "empleados"), (s) =>
      setEmpleadosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubU = onSnapshot(collection(db, "usuarios"), (s) =>
      setUsuariosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubC = onSnapshot(collection(db, "creditos"), (s) =>
      setCreditosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubQ = onSnapshot(collection(db, "cuotas"), (s) =>
      setCuotasData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubP = onSnapshot(collection(db, "productos"), (s) =>
      setProductosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubE();
      unsubU();
      unsubC();
      unsubQ();
      unsubP();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const activeMonth = getCurrentMonthKey();
      if (activeMonth !== monthKey) {
        setMonthKey(activeMonth);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [monthKey]);

  const monthLabel = useMemo(() => formatMonthLabel(monthKey), [monthKey]);

  const monthlyData = useMemo(() => {
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const creditosMes = creditosData.filter((c) => {
      const date = c.fechaAutoriza?.toDate
        ? c.fechaAutoriza.toDate()
        : new Date();
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    const cuotasMes = cuotasData.filter((c) => {
      const date = c.fecha?.toDate ? c.fecha.toDate() : new Date();
      return date.getFullYear() === year && date.getMonth() + 1 === month;
    });

    // Generar últimos 3 meses de datos
    const monthlyYearlyCompilation = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = new Intl.DateTimeFormat("es-HN", {
        month: "short",
        year: "2-digit",
      }).format(d);
      
      const creditosMonth = creditosData.filter((c) => {
        const date = c.fechaAutoriza?.toDate
          ? c.fechaAutoriza.toDate()
          : new Date();
        return date.getFullYear() === d.getFullYear() && date.getMonth() + 1 === d.getMonth() + 1;
      });
      
      const cuotasMonth = cuotasData.filter((c) => {
        const date = c.fecha?.toDate ? c.fecha.toDate() : new Date();
        return date.getFullYear() === d.getFullYear() && date.getMonth() + 1 === d.getMonth() + 1;
      });
      
      const solicitudesTotales = creditosMonth.reduce((sum, tx) => sum + (Number(tx.totalCredito) || 0), 0);
      const cobrosTotales = cuotasMonth.reduce((sum, tx) => sum + (Number(tx.monto) || 0), 0);
      
      monthlyYearlyCompilation.push({
        label: monthLabel,
        solicitudes: solicitudesTotales,
        cobros: cobrosTotales,
      });
    }

    const weeklyCompilation = monthlyYearlyCompilation;
    const pagosUltimosTresMeses = monthlyYearlyCompilation.reduce(
      (sum, month) => sum + (Number(month.cobros) || 0),
      0,
    );

    const pagosMensuales = cuotasMes.reduce(
      (sum, tx) => sum + (Number(tx.monto) || 0),
      0,
    );

    const normalizeStatus = (value) => String(value || "").trim().toLowerCase();
    const isStatusActivo = (value) =>
      normalizeStatus(value) === "activo";
    const isStatusAprobado = (value) =>
      ["aprobado", "aprobados"].includes(normalizeStatus(value));
    const isStatusPagado = (value) =>
      ["pagado", "finalizado"].includes(normalizeStatus(value));
    const isStatusRechazado = (value) =>
      ["rechazado", "rechazo"].includes(normalizeStatus(value));

    const revisionesPendientes = creditosMes.filter(
      (c) => normalizeStatus(c.estado) === "pendiente",
    ).length;

    const reservasDelMes = creditosMes.length;
    const creditosActivos = creditosMes.filter(
      (c) => isStatusActivo(c.estado),
    ).length;
    const creditosAprobados = creditosMes.filter(
      (c) => isStatusAprobado(c.estado),
    ).length;
    const creditosPagados = creditosMes.filter(
      (c) => isStatusPagado(c.estado),
    ).length;
    const creditosRechazados = creditosMes.filter(
      (c) => isStatusRechazado(c.estado),
    ).length;

    // Meta example calculation. Let's make it hit 85 if we met goals.
    const expected = cuotasMes.reduce(
      (sum, tx) => sum + (Number(tx.monto) + Number(tx.saldoPendiente || 0)),
      0,
    );
    const metaCobranza =
      expected > 0 ? Math.round((pagosMensuales / expected) * 100) : 100;

    const approvals = [...creditosData]
      .sort((a, b) => {
        const dA = a.fechaAutoriza?.toDate
          ? a.fechaAutoriza.toDate().getTime()
          : 0;
        const dB = b.fechaAutoriza?.toDate
          ? b.fechaAutoriza.toDate().getTime()
          : 0;
        return dB - dA;
      })
      .slice(0, 5)
      .map((tx, idx) => {
        const targetId = String(tx.empleadoId || tx.usuarioId || "").trim();
        const emp =
          empleadosData.find(
            (e) => String(e.id) === targetId || 
                   String(e.empleadoId) === targetId ||
                   String(e.uid) === targetId ||
                   String(e.dni) === targetId,
          );
        const usr =
          usuariosData.find(
            (u) => String(u.id) === targetId || 
                   String(u.uid) === targetId ||
                   String(u.empleadoId) === targetId ||
                   String(u.dni) === targetId,
          );
        
        const personMatch = emp || usr || {};
        
        const nombres = personMatch.nombres || personMatch.nombre || "";
        const apellidos = personMatch.apellidos || "";
        const nombreCompleto = nombres && apellidos 
          ? `${nombres} ${apellidos}`
          : nombres || tx.empleado || tx.empleadoNombre || tx.nombreEmpleado || "Desconocido";
          
        return {
          name: nombreCompleto,
          id: tx.creditoId || tx.id.substring(0, 6).toUpperCase(),
          amount: formatAmount(tx.totalCredito || 0),
          dept: personMatch.departamento || personMatch.rol || "N/A",
          status: tx.estado || "PENDIENTE",
          statusClass:
            tx.estado === "Activo"
              ? "bg-green-100 text-green-800"
              : tx.estado === "Finalizado"
                ? "bg-sky-100 text-sky-800"
                : "bg-orange-100 text-orange-800",
          dot: tx.estado === "Activo" ? "bg-green-600" : "bg-orange-600",
        };
      });

    const empleadosActivos = empleadosData.filter(
      (e) => e.estado === "active" || e.estado === "Activo",
    ).length;

    return {
      creditosActivos,
      creditosAprobados,
      revisionesPendientes,
      pagosMensuales,
      pagosUltimosTresMeses,
      metaCobranza,
      empleadosActivos:
        empleadosActivos > 0 ? empleadosActivos : EMPLEADOS_ACTIVOS_BASE,
      empleadosConReserva: reservasDelMes,
      creditosPagados,
      creditosRechazados,
      weeklyCompilation,
      approvals,
    };
  }, [monthKey, empleadosData, usuariosData, creditosData, cuotasData]);

  const maxSolicitudes = Math.max(
    ...monthlyData.weeklyCompilation.map((week) => week.solicitudes),
    1,
  );

  const kpis = [
    {
      icon: "people",
      label: "Total de Usuarios",
      value: usuariosData.length.toLocaleString("es-HN"),
      sub: `Usuarios registrados en el sistema`,
      badge: null,
      badgeClass: "",
      iconBg: "bg-green-100 text-green-800",
      border: "border-green-800",
    },
    {
      icon: "inventory_2",
      label: "Total de Productos",
      value: productosData.length.toLocaleString("es-HN"),
      sub: "Bienes disponibles en inventario",
      badge: null,
      badgeClass: "",
      iconBg: "bg-green-100 text-green-800",
      border: "border-green-700",
    },
    {
      icon: "payments",
      label: "Pagos 3 Meses",
      value: formatMoney(monthlyData.pagosUltimosTresMeses / 1000),
      sub: "Total cobrado en los últimos 3 meses",
      badge: "3M",
      badgeClass: "bg-emerald-50 text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-700",
    },
    {
      icon: "paid",
      label: "Créditos Pagados",
      value: monthlyData.creditosPagados.toLocaleString("es-HN"),
      sub: "Créditos cerrados este mes",
      badge: null,
      badgeClass: "",
      iconBg: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-700",
    },
  ];

  // ──────────────────────────────────────────────────────
  // DASHBOARD PARA CADA ROL
  // ──────────────────────────────────────────────────────

  // CEO: Solo métricas de alto nivel
  const renderDashboardCEO = () => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-gray-50 text-gray-900 space-y-8"
    >
      <section className="pt-2 md:pt-3 mb-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              className="text-3xl font-black text-slate-900 tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Tablero Ejecutivo
            </h2>
            <p className="text-slate-500 font-medium">
              Indicadores clave del desempeño operativo.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Mes actual
            </label>
            <span className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-800 capitalize">
              {monthLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${kpi.border}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl ${kpi.iconBg}`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              {kpi.label}
            </p>
            <h3
              className="text-3xl font-extrabold text-gray-900 mt-1"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {kpi.value}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">{kpi.sub}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 p-6">
          <h4
            className="text-xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Resumen Mensual
          </h4>
          <div className="space-y-6">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Meta de Cobranza
              </p>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black text-green-700">
                  {monthlyData.metaCobranza}%
                </h3>
                <p className="text-sm text-slate-500 mb-1">de objetivo</p>
              </div>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-500">Pagos Recaudados</span>
              <span className="font-black text-slate-900">
                {formatMoney(monthlyData.pagosMensuales / 1000)}
              </span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-500">Créditos en Curso</span>
              <span className="font-black text-slate-900">
                {monthlyData.creditosActivos}
              </span>
            </div>
          </div>
        </article>

        <article className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl overflow-hidden shadow-sm border border-emerald-200 p-6">
          <h4
            className="text-xl font-bold text-emerald-900 mb-4"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Análisis Rápido
          </h4>
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur p-4 rounded-xl">
              <p className="text-emerald-700 text-xs font-bold uppercase mb-1">
                Empleados Activos
              </p>
              <p className="text-2xl font-black text-emerald-900">
                {monthlyData.empleadosActivos}/{EMPLEADOS_ACTIVOS_BASE}
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur p-4 rounded-xl">
              <p className="text-emerald-700 text-xs font-bold uppercase mb-1">
                Revisiones Pendientes
              </p>
              <p className="text-2xl font-black text-emerald-700">
                {monthlyData.revisionesPendientes}
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur p-4 rounded-xl">
              <p className="text-emerald-700 text-xs font-bold uppercase mb-1">
                Nuevas Solicitudes
              </p>
              <p className="text-2xl font-black text-emerald-700">
                {monthlyData.empleadosConReserva}
              </p>
            </div>
          </div>
        </article>
      </section>
    </motion.div>
  );

  // EDITOR CREDITOS: Enfocado en créditos y cuotas
  const renderDashboardEditorCreditos = () => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-gray-50 text-gray-900 space-y-8"
    >
      <section className="pt-2 md:pt-3 mb-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              className="text-3xl font-black text-slate-900 tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Gestión de Créditos
            </h2>
            <p className="text-slate-500 font-medium">
              Control de solicitudes, cuotas y recuperación de cartera.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Período
            </label>
            <span className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-800 capitalize">
              {monthLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-700">
          <div className="p-2 rounded-xl bg-green-100 text-green-800 w-fit mb-4">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Créditos Activos
          </p>
          <h3 className="text-3xl font-extrabold text-green-700 mt-1">
            {monthlyData.creditosActivos}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Operativos este mes
          </p>
        </article>

        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-700">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
            <span className="material-symbols-outlined">thumb_up</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Créditos Aprobados
          </p>
          <h3 className="text-3xl font-extrabold text-emerald-700 mt-1">
            {monthlyData.creditosAprobados}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Solicitudes aprobadas este mes
          </p>
        </article>

        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-600">
          <div className="p-2 rounded-xl bg-emerald-100 text-green-800 w-fit mb-4">
            <span className="material-symbols-outlined">block</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Créditos Rechazados
          </p>
          <h3 className="text-3xl font-extrabold text-emerald-700 mt-1">
            {monthlyData.creditosRechazados}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Solicitudes rechazadas este mes
          </p>
        </article>

        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-800">
          <div className="p-2 rounded-xl bg-green-100 text-green-800 w-fit mb-4">
            <span className="material-symbols-outlined">paid</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Créditos Pagados
          </p>
          <h3 className="text-3xl font-extrabold text-green-800 mt-1">
            {monthlyData.creditosPagados}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Créditos cerrados este mes
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-8">
        <article className="bg-slate-100 p-8 rounded-2xl relative overflow-hidden">
          <h4
            className="text-xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Actividad Mensual
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            Últimos 3 meses - Solicitudes vs Cobranza
          </p>
          <div className="flex items-end justify-between h-40 gap-3 pt-4">
            {monthlyData.weeklyCompilation.map((week) => (
              <div
                key={week.label}
                className="flex-1 bg-green-900/10 rounded-t-lg relative group overflow-hidden"
                style={{
                  height: `${Math.max(32, (week.solicitudes / maxSolicitudes) * 100)}%`,
                }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  {formatCompactAmount(week.solicitudes)}
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 bg-green-800/40 rounded-t-lg transition-all group-hover:bg-green-800/60"
                  style={{
                    height: `${
                      week.solicitudes > 0
                        ? Math.min(
                            100,
                            Math.max(15, (week.cobros / week.solicitudes) * 100),
                          )
                        : 15
                    }%`,
                    maxHeight: "100%",
                  }}
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-green-900/80">
                  {formatCompactAmount(week.cobros)}
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">
                  {week.label}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </motion.div>
  );

  // EDITOR INVENTARIO: Enfocado en productos
  const renderDashboardEditorInventario = () => {
    // Función para obtener el precio desde múltiples campos posibles
    const getPrecio = (producto) => {
      return Number(
        producto.precio ||
        producto.precioUnitario ||
        producto.precioVenta ||
        producto.costo ||
        0
      );
    };

    const productosPorCategoria = {};
    const totalProductos = productosData.length;
    const productosActivos = productosData.filter(
      (p) => p.estado === "Activo" || p.estado === "active",
    ).length;
    const productosBajoStock = productosData.filter(
      (p) => Number(p.stock || 0) < 10,
    ).length;

    productosData.forEach((p) => {
      const cat = p.categoria || "Sin Categoría";
      if (!productosPorCategoria[cat]) {
        productosPorCategoria[cat] = 0;
      }
      productosPorCategoria[cat]++;
    });

    const topProductos = [...productosData]
      .sort((a, b) => getPrecio(b) - getPrecio(a))
      .slice(0, 5);

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-gray-50 text-gray-900 space-y-8"
      >
        <section className="pt-2 md:pt-3 mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                className="text-3xl font-black text-slate-900 tracking-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Gestión de Inventario
              </h2>
              <p className="text-slate-500 font-medium">
                Control de productos y stock disponible.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-800">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
              <span className="material-symbols-outlined">inventory</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Total en Catálogo
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
              {totalProductos}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              Productos disponibles
            </p>
          </article>

          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-700">
            <div className="p-2 rounded-xl bg-green-100 text-green-800 w-fit mb-4">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Productos Activos
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
              {productosActivos}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              {Math.round((productosActivos / totalProductos) * 100)}% del total
            </p>
          </article>

          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-600">
            <div className="p-2 rounded-xl bg-red-100 text-red-800 w-fit mb-4">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Bajo Stock
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
              {productosBajoStock}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              Menos de 10 unidades
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-slate-100">
              <h4
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Productos por Categoría
              </h4>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(productosPorCategoria)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">
                      {cat}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-700 transition-all"
                          style={{
                            width: `${Math.min(100, (count / (totalProductos / 5)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="font-black text-slate-900 text-sm w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </article>

          <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-slate-100">
              <h4
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Top Productos (Mayor Valor)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Producto", "Stock"].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topProductos.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {prod.nombre || "Sin nombre"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-black px-2 py-1 rounded-full ${
                            Number(prod.stock || 0) < 10
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {prod.stock || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
              <Link
                to="/productos"
                className="text-green-800 text-xs font-bold hover:underline"
              >
                Ver inventario completo →
              </Link>
            </div>
          </article>
        </section>
      </motion.div>
    );
  };

  // EDITOR EMPLEADOS: Enfocado en empleados
  const renderDashboardEditorEmpleados = () => {
    const departamentos = {};
    const totalEmpleados = empleadosData.length;
    const empleadosActivos = empleadosData.filter(
      (e) => e.estado === "active" || e.estado === "Activo",
    ).length;

    empleadosData.forEach((e) => {
      const dept = e.departamento || "Sin Departamento";
      if (!departamentos[dept]) {
        departamentos[dept] = { total: 0, activos: 0 };
      }
      departamentos[dept].total++;
      if (e.estado === "active" || e.estado === "Activo") {
        departamentos[dept].activos++;
      }
    });

    // Calcular nómina activa y límite de crédito total
    const nominaActiva = empleadosData
      .filter((e) => e.estado === "active" || e.estado === "Activo")
      .reduce((sum, e) => sum + (Number(e.salario) || 0), 0);
    
    const limiteCreditoTotal = empleadosData.reduce(
      (sum, e) => sum + (Number(e.limiteCredito) || 0),
      0,
    );

    // Nuevas métricas: promedio de salarios y empleados inactivos
    const promedioSalarios = empleadosActivos > 0 ? nominaActiva / empleadosActivos : 0;
    const empleadosInactivos = totalEmpleados - empleadosActivos;

    // Empleado con mayor salario
    const empleadoMaxSalario = empleadosData.reduce((max, emp) => {
      const salario = Number(emp.salario) || 0;
      const maxSalario = Number(max.salario) || 0;
      return salario > maxSalario ? emp : max;
    }, {});

    // Calcular salarios y límites de crédito por departamento
    const salariosPorDepartamento = {};
    const limitesPorDepartamento = {};
    
    empleadosData.forEach((e) => {
      const dept = e.departamento || "Sin Departamento";
      if (!salariosPorDepartamento[dept]) {
        salariosPorDepartamento[dept] = 0;
        limitesPorDepartamento[dept] = 0;
      }
      salariosPorDepartamento[dept] += Number(e.salario || 0);
      limitesPorDepartamento[dept] += Number(e.limiteCredito || 0);
    });

    const resumenSalarios = Object.entries(salariosPorDepartamento)
      .map(([dept, salario]) => ({
        departamento: dept,
        salarioTotal: salario,
        limiteTotal: limitesPorDepartamento[dept] || 0,
      }))
      .sort((a, b) => b.salarioTotal - a.salarioTotal);

    const formatCurrency = (value) =>
      `L ${Number(value).toLocaleString("es-HN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-gray-50 text-gray-900 space-y-8"
      >
        <section className="pt-2 md:pt-3 mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                className="text-3xl font-black text-slate-900 tracking-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Gestión de Empleados
              </h2>
              <p className="text-slate-500 font-medium">
                Información de personal y actividad de créditos.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-700">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
              <span className="material-symbols-outlined">paid</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Promedio de Salarios
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-700 mt-1">
              {formatCurrency(promedioSalarios)}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              Por empleado activo
            </p>
          </article>

          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-700">
            <div className="p-2 rounded-xl bg-green-100 text-green-800 w-fit mb-4">
              <span className="material-symbols-outlined">star</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Empleado con Mayor Salario
            </p>
            <h3 className="text-3xl font-extrabold text-green-700 mt-1">
              {empleadoMaxSalario.nombre || empleadoMaxSalario.nombres || "Sin nombre"}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              {formatCurrency(Number(empleadoMaxSalario.salario) || 0)} mensuales
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 border-b border-slate-100">
              <h4
                className="text-lg font-bold text-white"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Empleados por Departamento
              </h4>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(departamentos)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([dept, data]) => (
                  <div key={dept} className="border-b border-slate-100 last:border-0 pb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-slate-700">
                        {dept}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {data.activos}/{data.total}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-700"
                        style={{
                          width: `${(data.activos / data.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </article>

          <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 border-b border-slate-100">
              <h4
                className="text-lg font-bold text-white"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Resumen Financiero por Departamento
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Departamento", "Salarios", "Límites Crédito"].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {resumenSalarios.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-900">
                          {item.departamento}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-green-700">
                          {formatCurrency(item.salarioTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-300 text-green-900">
                          {formatCurrency(item.limiteTotal)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-emerald-50 border-t border-slate-100">
              <Link
                to="/empleados"
                className="text-green-900 text-xs font-bold hover:underline"
              >
                Gestionar empleados →
              </Link>
            </div>
          </article>
        </section>
      </motion.div>
    );
  };

  // ADMIN/SUPER ADMIN: Dashboard completo (original)
  const renderDashboardAdmin = () => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-gray-50 text-gray-900 space-y-8"
    >
      <section className="pt-2 md:pt-3 mb-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2
              className="text-3xl font-black text-slate-900 tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Dashboard
            </h2>
            <p className="text-slate-500 font-medium">
              Gestion mensual de indicadores operativos del comisariato.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Filtro mensual automatico
            </label>
            <span className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-800 capitalize">
              {monthLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${kpi.border}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl ${kpi.iconBg}`}>
                <span className="material-symbols-outlined">{kpi.icon}</span>
              </div>
              {kpi.badge && (
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-lg ${kpi.badgeClass}`}
                >
                  {kpi.badge}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              {kpi.label}
            </p>
            <h3
              className="text-3xl font-extrabold text-gray-900 mt-1"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              {kpi.value}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">{kpi.sub}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-8">
        <article className="bg-slate-100 p-8 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h4
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Actividad Mensual
              </h4>
              <p className="text-sm text-slate-500">
                Últimos 3 meses - Flujo de créditos vs cobranza
              </p>
              <div className="mt-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-green-900/30" />
                  Monto Solicitado
                </span>
                <span className="inline-flex items-center gap-1 text-green-800">
                  <span className="h-2 w-2 rounded-full bg-green-700/70" />
                  Monto Cobrado
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 text-xs font-bold bg-white rounded-lg shadow-sm border border-slate-100">
                Mes actual
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between h-48 gap-4 pt-4">
            {monthlyData.weeklyCompilation.map((week) => (
              <div
                key={week.label}
                className="flex-1 bg-green-900/10 rounded-t-lg relative group overflow-hidden"
                style={{
                  height: `${Math.max(32, (week.solicitudes / maxSolicitudes) * 100)}%`,
                }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                  {formatCompactAmount(week.solicitudes)}
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 bg-green-800/40 rounded-t-lg transition-all group-hover:bg-green-800/60"
                  style={{
                    height: `${
                      week.solicitudes > 0
                        ? Math.min(
                            100,
                            Math.max(15, (week.cobros / week.solicitudes) * 100),
                          )
                        : 15
                    }%`,
                    maxHeight: "100%",
                  }}
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-green-900/80">
                  {formatCompactAmount(week.cobros)}
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">
                  {week.label}
                </div>
              </div>
            ))}
          </div>
        </article>

      </section>
    </motion.div>
  );

  // ──────────────────────────────────────────────────────
  // RETORNO CONDICIONAL SEGÚN ROL
  // ──────────────────────────────────────────────────────

  const normalizeRole = (role) => {
    if (!role) return "ADMIN";
    const normalized = role.toUpperCase().trim();
    if (normalized.includes("CEO")) return "CEO";
    if (normalized.includes("EDITOR CREDITO")) return "EDITOR_CREDITOS";
    if (normalized.includes("EDITOR INVENTARIO")) return "EDITOR_INVENTARIO";
    if (normalized.includes("EDITOR EMPLEADO")) return "EDITOR_EMPLEADOS";
    if (normalized.includes("SUPER ADMIN")) return "SUPER_ADMIN";
    if (normalized.includes("ADMIN")) return "ADMIN";
    return "ADMIN";
  };

  const userRole = normalizeRole(authRole);

  switch (userRole) {
    case "CEO":
      return renderDashboardCEO();
    case "EDITOR_CREDITOS":
      return renderDashboardEditorCreditos();
    case "EDITOR_INVENTARIO":
      return renderDashboardEditorInventario();
    case "EDITOR_EMPLEADOS":
      return renderDashboardEditorEmpleados();
    case "SUPER_ADMIN":
    case "ADMIN":
    default:
      return renderDashboardAdmin();
  }
}
