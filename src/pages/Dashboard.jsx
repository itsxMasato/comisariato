import React from "react";
import { Link } from "react-router-dom";

const KPIS = [
  {
    icon: "payments",
    label: "Creditos Activos",
    value: "1,248",
    sub: "Revisiones pendientes: 14",
    badge: "+12%",
    badgeClass: "bg-green-50 text-green-700",
    iconBg: "bg-green-100 text-green-800",
    border: "border-green-800",
  },
  {
    icon: "account_balance_wallet",
    label: "Pagos Mensuales",
    value: "L 42.8k",
    sub: "Incremento vs mes anterior",
    badge: "Meta 85%",
    badgeClass: "bg-amber-50 text-amber-700",
    iconBg: "bg-amber-100 text-amber-800",
    border: "border-amber-700",
  },
  {
    icon: "inventory_2",
    label: "Productos Stock Bajo",
    value: "24",
    sub: "8 ordenes sugeridas hoy",
    badge: "Critico",
    badgeClass: "bg-red-50 text-red-700",
    iconBg: "bg-red-100 text-red-700",
    border: "border-red-600",
  },
  {
    icon: "group_work",
    label: "Empleados Pendientes",
    value: "86",
    sub: "Por concepto de vales de campo",
    badge: null,
    badgeClass: "",
    iconBg: "bg-sky-100 text-sky-700",
    border: "border-sky-600",
  },
];

const BARS = [
  { day: "LUN", h: "75%", fill: "40%" },
  { day: "MAR", h: "100%", fill: "70%" },
  { day: "MIE", h: "80%", fill: "55%" },
  { day: "JUE", h: "50%", fill: "25%" },
  { day: "VIE", h: "90%", fill: "80%" },
  { day: "SAB", h: "65%", fill: "35%" },
  { day: "DOM", h: "33%", fill: "15%" },
];

const APPROVALS = [
  {
    name: "Roberto Mendoza",
    id: "#88219",
    amount: "L 1,200.00",
    dept: "Corte de Cana",
    status: "APROBADO",
    statusClass: "bg-green-100 text-green-800",
    dot: "bg-green-600",
  },
  {
    name: "Elena Castillo",
    id: "#88220",
    amount: "L 450.00",
    dept: "Logistica",
    status: "PENDIENTE",
    statusClass: "bg-orange-100 text-orange-800",
    dot: "bg-orange-600",
  },
  {
    name: "Mario Gomez",
    id: "#88221",
    amount: "L 2,800.00",
    dept: "Mantenimiento",
    status: "APROBADO",
    statusClass: "bg-green-100 text-green-800",
    dot: "bg-green-600",
  },
];

export default function Dashboard() {
  return (
    <div className="bg-gray-50 text-gray-900 space-y-8">
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-8 -mt-6 md:-mt-10 pt-4 pb-4">
        <div className="relative w-full max-w-md mt-2 md:mt-0">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-700 outline-none"
            placeholder="Buscar por nombre o SKU..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-4 ml-6 shrink-0">
          <button className="relative text-slate-600 hover:text-green-900 transition-all">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full border-2 border-white" />
          </button>
          <button className="text-slate-600 hover:text-green-900 transition-all">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900">Comisariato Pro</p>
            <p className="text-[10px] text-slate-500">Region Central</p>
          </div>
        </div>
      </header>

      <section className="pt-2 md:pt-3 mb-10">
        <h2
          className="text-4xl font-extrabold text-green-900 tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Panel General
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          Resumen operativo del comisariato
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIS.map((kpi) => (
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
                <p className="text-sm text-slate-500">Flujo de creditos vs cobranza</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-bold bg-white rounded-lg shadow-sm border border-slate-100">
                  7D
                </button>
                <button className="px-3 py-1 text-xs font-bold text-slate-400 hover:bg-white rounded-lg transition-all">
                  30D
                </button>
              </div>
            </div>
            <div className="flex items-end justify-between h-48 gap-4 pt-4">
              {BARS.map((bar) => (
                <div
                  key={bar.day}
                  className="flex-1 bg-green-900/10 rounded-t-lg relative group"
                  style={{ height: bar.h }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-green-800/40 rounded-t-lg transition-all group-hover:bg-green-800/60"
                    style={{ height: bar.fill }}
                  />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">
                    {bar.day}
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
              <Link to="/creditos" className="text-green-800 text-xs font-bold hover:underline">
                Ver Todo
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    {["Empleado", "Monto", "Departamento", "Estado"].map((head, i) => (
                      <th
                        key={head}
                        className={`px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i === 3 ? "text-right" : ""}`}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {APPROVALS.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-gray-900">{row.name}</p>
                        <p className="text-[10px] text-slate-400">ID: {row.id}</p>
                      </td>
                      <td className="px-8 py-4 text-sm font-bold">{row.amount}</td>
                      <td className="px-8 py-4 text-sm text-slate-500">{row.dept}</td>
                      <td className="px-8 py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${row.statusClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
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
          <article className="bg-slate-100 p-6 rounded-2xl">
            <h4
              className="text-lg font-bold text-gray-900 mb-6"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Alerta de Stock
            </h4>
            <div className="space-y-4">
              {[
                {
                  icon: "inventory_2",
                  iconColor: "text-green-800",
                  name: "Arroz Premium 25kg",
                  qty: "Quedan 5 unidades",
                },
                {
                  icon: "local_drink",
                  iconColor: "text-amber-700",
                  name: "Aceite Vegetal 1L",
                  qty: "Quedan 2 unidades",
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100"
                >
                  <div
                    className={`w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center ${item.iconColor}`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                    <p className="text-xs text-red-600 font-bold mt-0.5">{item.qty}</p>
                  </div>
                  <button className="text-slate-400 hover:text-green-800 transition-all">
                    <span className="material-symbols-outlined">add_shopping_cart</span>
                  </button>
                </div>
              ))}
            </div>
            <Link
              to="/productos"
              className="inline-flex items-center justify-center w-full mt-6 py-3 bg-green-800 hover:bg-green-900 text-white text-xs font-bold rounded-xl transition-all"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Gestionar Inventario
            </Link>
          </article>

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
              <p className="text-green-200 text-xs mt-1">Indicadores del comisariato actualizados</p>
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

          <article
            className="text-white p-8 rounded-2xl"
            style={{ background: "linear-gradient(135deg, #6c493d 0%, #523327 100%)" }}
          >
            <span className="material-symbols-outlined text-amber-200">warning</span>
            <h4
              className="text-lg font-bold mt-4"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Saldos de Empleados
            </h4>
            <p className="text-amber-100/80 text-xs mt-2 leading-relaxed">
              Existen 12 empleados con saldos acumulados por encima del limite de
              credito permitido.
            </p>
            <hr className="my-6 border-white/10" />
            <div className="flex justify-between items-center">
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                L 12,450.20
              </span>
              <span className="text-[10px] font-bold px-2 py-1 bg-white/10 rounded-lg">
                REVISAR
              </span>
            </div>
          </article>
        </div>
      </section>

      <button
        className="fixed bottom-8 right-8 w-14 h-14 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 transition-all z-50"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" }}
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  );
}
