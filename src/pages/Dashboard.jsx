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
  const [creditosData, setCreditosData] = useState([]);
  const [cuotasData, setCuotasData] = useState([]);
  const [productosData, setProductosData] = useState([]);

  useEffect(() => {
    const unsubE = onSnapshot(collection(db, "empleados"), (s) =>
      setEmpleadosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
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

    const weeklyCompilation = [1, 2, 3, 4].map((week) => ({
      label: `SEM ${week}`,
      solicitudes: 0,
      cobros: 0,
    }));

    creditosMes.forEach((tx) => {
      const date = tx.fechaAutoriza?.toDate
        ? tx.fechaAutoriza.toDate()
        : new Date();
      const bucket = Math.min(3, Math.floor((date.getDate() - 1) / 7));
      weeklyCompilation[bucket].solicitudes += Number(tx.totalCredito) || 0;
    });

    cuotasMes.forEach((tx) => {
      const date = tx.fecha?.toDate ? tx.fecha.toDate() : new Date();
      const bucket = Math.min(3, Math.floor((date.getDate() - 1) / 7));
      // If saldoPendiente === 0 it means it's paid (or practically speaking, the 'monto' is what we collected)
      weeklyCompilation[bucket].cobros += Number(tx.monto) || 0;
    });

    const pagosMensuales = cuotasMes.reduce(
      (sum, tx) => sum + (Number(tx.monto) || 0),
      0,
    );
    const revisionesPendientes = creditosData.filter(
      (c) => c.estado === "Pendiente",
    ).length;

    const reservasDelMes = creditosMes.length;
    const creditosActivos = creditosData.filter(
      (c) => c.estado === "Activo",
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
        const emp =
          empleadosData.find(
            (e) => e.empleadoId === tx.empleadoId || e.id === tx.empleadoId,
          ) || {};
        return {
          name: emp.nombres ? `${emp.nombres} ${emp.apellidos}` : "Desconocido",
          id: tx.creditoId || tx.id.substring(0, 6).toUpperCase(),
          amount: formatAmount(tx.totalCredito || 0),
          dept: emp.departamento || "N/A",
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
      revisionesPendientes,
      pagosMensuales,
      metaCobranza,
      empleadosActivos:
        empleadosActivos > 0 ? empleadosActivos : EMPLEADOS_ACTIVOS_BASE,
      empleadosConReserva: reservasDelMes,
      weeklyCompilation,
      approvals,
    };
  }, [monthKey, empleadosData, creditosData, cuotasData]);

  const maxSolicitudes = Math.max(
    ...monthlyData.weeklyCompilation.map((week) => week.solicitudes),
    1,
  );

  const kpis = [
    {
      icon: "payments",
      label: "Creditos Activos",
      value: monthlyData.creditosActivos.toLocaleString("es-HN"),
      sub: `Revisiones pendientes: ${monthlyData.revisionesPendientes}`,
      badge: null,
      badgeClass: "",
      iconBg: "bg-green-100 text-green-800",
      border: "border-green-800",
    },
    {
      icon: "account_balance_wallet",
      label: "Pagos Mensuales",
      value: formatMoney(monthlyData.pagosMensuales / 1000),
      sub: "Compilacion del mes seleccionado",
      badge: `Meta ${monthlyData.metaCobranza}%`,
      badgeClass: "bg-green-50 text-green-700",
      iconBg: "bg-green-100 text-green-800",
      border: "border-green-700",
    },
    {
      icon: "event_note",
      label: "Reservas del Mes",
      value: monthlyData.empleadosConReserva.toLocaleString("es-HN"),
      sub: "Solicitudes registradas durante el mes",
      badge: "Mensual",
      badgeClass: "bg-emerald-50 text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-700",
      border: "border-emerald-700",
    },
    {
      icon: "groups",
      label: "Empleados Activos",
      value: monthlyData.empleadosActivos.toLocaleString("es-HN"),
      sub: "Colaboradores activos en planilla",
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

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-800">
          <div className="p-2 rounded-xl bg-green-100 text-green-800 w-fit mb-4">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Créditos Activos
          </p>
          <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
            {monthlyData.creditosActivos}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            En seguimiento y cobranza
          </p>
        </article>

        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-700">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Pendientes de Revisión
          </p>
          <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
            {monthlyData.revisionesPendientes}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Requieren aprobación
          </p>
        </article>

        <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-700">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
            <span className="material-symbols-outlined">attach_money</span>
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Cobranza del Mes
          </p>
          <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
            {formatMoney(monthlyData.pagosMensuales / 1000)}
          </h3>
          <p className="text-slate-400 text-xs mt-2 font-medium">
            Meta: {monthlyData.metaCobranza}%
          </p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-8">
        <article className="bg-slate-100 p-8 rounded-2xl relative overflow-hidden">
          <h4
            className="text-xl font-bold text-gray-900 mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Actividad Semanal
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            Solicitudes vs Cobranza
          </p>
          <div className="flex items-end justify-between h-40 gap-3 pt-4">
            {monthlyData.weeklyCompilation.map((week) => (
              <div
                key={week.label}
                className="flex-1 bg-green-900/10 rounded-t-lg relative group"
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
                        ? Math.max(15, (week.cobros / week.solicitudes) * 100)
                        : 15
                    }%`,
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
      .sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0))
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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
                {totalProductos} Productos
              </span>
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
                    {["Producto", "Precio", "Stock"].map((head) => (
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
                      <td className="px-4 py-3 text-xs font-bold">
                        {formatAmount(prod.precio || 0)}
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

    const empConMasCreditos = [...creditosData]
      .reduce((acc, c) => {
        const empId = c.empleadoId || c.id;
        const idx = acc.findIndex((e) => e.id === empId);
        if (idx === -1) {
          acc.push({ id: empId, cantidad: 1 });
        } else {
          acc[idx].cantidad++;
        }
        return acc;
      }, [])
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)
      .map((item) => {
        const emp = empleadosData.find(
          (e) => e.empleadoId === item.id || e.id === item.id,
        ) || {};
        return {
          nombre: emp.nombres
            ? `${emp.nombres} ${emp.apellidos}`
            : "Desconocido",
          cantidad: item.cantidad,
          departamento: emp.departamento || "N/A",
        };
      });

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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
                {empleadosActivos} Activos
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-700">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
              <span className="material-symbols-outlined">group</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Total de Empleados
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
              {totalEmpleados}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              En el sistema
            </p>
          </article>

          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-700">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 w-fit mb-4">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Empleados Activos
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
              {empleadosActivos}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              {totalEmpleados > 0
                ? Math.round((empleadosActivos / totalEmpleados) * 100)
                : 0}
              % activos
            </p>
          </article>

          <article className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-700">
            <div className="p-2 rounded-xl bg-green-100 text-green-800 w-fit mb-4">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Créditos del Mes
            </p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
              {monthlyData.empleadosConReserva}
            </h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              Nuevas solicitudes
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
            <div className="px-6 py-4 bg-gradient-to-r from-lime-50 to-green-50 border-b border-slate-100">
              <h4
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Top Empleados (Más Créditos)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Empleado", "Dpto.", "Créditos"].map((head) => (
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
                  {empConMasCreditos.map((emp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {emp.nombre.split(" ").slice(0, 2).join(" ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {emp.departamento}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-black px-2 py-1 rounded-full bg-green-100 text-green-800">
                          {emp.cantidad}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
              <Link
                to="/empleados"
                className="text-green-800 text-xs font-bold hover:underline"
              >
                Ver todos los empleados →
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
                Actividad Semanal
              </h4>
              <p className="text-sm text-slate-500">
                Flujo de creditos vs cobranza
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
                className="flex-1 bg-green-900/10 rounded-t-lg relative group"
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
                        ? Math.max(15, (week.cobros / week.solicitudes) * 100)
                        : 15
                    }%`,
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
