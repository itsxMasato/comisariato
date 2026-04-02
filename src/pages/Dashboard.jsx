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
    return () => {
      unsubE();
      unsubC();
      unsubQ();
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
      badgeClass: "bg-amber-50 text-amber-700",
      iconBg: "bg-amber-100 text-amber-800",
      border: "border-amber-700",
    },
    {
      icon: "event_note",
      label: "Reservas del Mes",
      value: monthlyData.empleadosConReserva.toLocaleString("es-HN"),
      sub: "Solicitudes registradas durante el mes",
      badge: "Mensual",
      badgeClass: "bg-sky-50 text-sky-700",
      iconBg: "bg-sky-100 text-sky-700",
      border: "border-sky-600",
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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
                <button className="px-3 py-1 text-xs font-bold bg-white rounded-lg shadow-sm border border-slate-100">
                  Mes actual
                </button>
                <button className="px-3 py-1 text-xs font-bold text-slate-400 hover:bg-white rounded-lg transition-all">
                  {monthLabel}
                </button>
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

          <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="px-8 py-6 flex justify-between items-center">
              <h4
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Aprobaciones Recientes
              </h4>
              <Link
                to="/creditos"
                className="text-green-800 text-xs font-bold hover:underline"
              >
                Ver Todo
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    {["Empleado", "Monto", "Departamento", "Estado"].map(
                      (head, i) => (
                        <th
                          key={head}
                          className={`px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 3 ? "text-right" : ""}`}
                        >
                          {head}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {monthlyData.approvals.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-gray-900">
                          {row.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          ID: {row.id}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-sm font-bold">
                        {row.amount}
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">
                        {row.dept}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${row.statusClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${row.dot}`}
                          />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="relative rounded-2xl h-48 overflow-hidden group">
            <img
              alt="Productos del comisariato"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 to-transparent flex flex-col justify-end p-6">
              <h5
                className="text-white font-bold text-lg"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Reporte Semanal
              </h5>
              <p className="text-green-200 text-xs mt-1">
                Indicadores del comisariato actualizados
              </p>
              <div className="flex gap-2 mt-4">
                <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-bold">
                  PDF
                </span>
                <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-bold">
                  XLS
                </span>
              </div>
            </div>
          </article>

          <article className="bg-slate-100 p-6 rounded-2xl">
            <h4
              className="text-lg font-bold text-gray-900"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Resumen del Mes
            </h4>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Datos generales del mes seleccionado para seguimiento operativo.
            </p>
            <hr className="my-6 border-slate-200" />
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-500">
                  Empleados activos
                </span>
                <span className="font-black text-slate-900">
                  {monthlyData.empleadosActivos.toLocaleString("es-HN")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-500">
                  Reservas del mes
                </span>
                <span className="font-black text-slate-900">
                  {monthlyData.empleadosConReserva.toLocaleString("es-HN")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-500">
                  Meta de cobranza
                </span>
                <span className="font-black text-green-800">
                  {monthlyData.metaCobranza}%
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </motion.div>
  );
}
