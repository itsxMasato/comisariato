import React, { useState } from "react";
import { motion } from "framer-motion";

// ── KPIs ───────────────────────────────────────────────────
const KPIS = [
  {
    label: "Total Recuperado",
    value: "$39,429.85",
    icon: "savings",
    valueColor: "text-green-800",
    hoverBg: "hover:bg-green-800 hover:text-white",
  },
  {
    label: "Pendiente de Cobro",
    value: "$0.00",
    icon: "pending_actions",
    valueColor: "text-slate-600",
    hoverBg: "hover:bg-slate-600 hover:text-white",
  },
  {
    label: "Deducción de Nómina (15%)",
    value: "$12,940.00",
    icon: "account_balance_wallet",
    valueColor: "text-green-800",
    hoverBg: "hover:bg-green-800 hover:text-white",
  },
];

// ── Deductions data ────────────────────────────────────────
const INITIAL_ROWS = [
  {
    id: 1,
    name: "Mateo Rivera",
    dept: "Logística e Inventario",
    salary: "$667.00",
    credit: "$1,200.00",
    quota: "4 / 12",
    amount: "$100.00",
    date: "Oct 28, 2023",
    status: "applied",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCw5P-vS3_bYdYjySlgCJu0WDo39jpKC7YzBX129QH53Dw7TB4FVKV6QmhAgyWqzDodj8TAmo4PDDE4mnbfNe5EBCKsbIJ3-KuyaMGoOQbQbBkG1J8pzSAETLuNwBYYvpctuMxwJFxhvvA3hboHcXdA7Pwed3K-oZhF884gYBQ5IKNFnAYrajm5Ruk-vrTHXlVBaywLFqngMSM5XoKsU-zFBfzaC2R4DUg97rv81tNyU855QbPDpb7wvW2paEIN_Ax4EGAnxymqRIU",
  },
  {
    id: 2,
    name: "Elena Castillo",
    dept: "Control de Calidad",
    salary: "$555.53",
    credit: "$500.00",
    quota: "2 / 6",
    amount: "$83.33",
    date: "Oct 24, 2023",
    status: "applied",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBeIbQsa5cwryLu7Qxjq2LUP1NX2-vd4f4QN6vlKIvoNfJ8FVC8qflxGuboEuidBBLCkZTESVDaIzYE6zbA2fmXOlRgZ4ejeEjYEK_T3Rrc_SQnNQ5KEI5-T3ng6I3O05j3H3HIuG50MGaRkj64Gr2Q7DR4eV6W3zxCRsxiwvtHUz-NLSeWIOSQcUw-0UhPk_QDN9c6DTp2_D0L5Dihx0qKJ9DZeha4LeNADInvOey3YspxJMTXl4-be0puytgaPZZ0GFieaSg7PY",
  },
  {
    id: 3,
    name: "Javier Ortiz",
    dept: "Operador Maquinaria",
    salary: "$680.50",
    credit: "$2,450.00",
    quota: "10 / 24",
    amount: "$102.08",
    date: "Nov 02, 2023",
    status: "applied",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuANALgXXylFxw0l6rmKEnLykbxjnQKP4wiNIywn5UL2QCf-2jiOmEy0pdHkr9VUvGFAn_EyCfZiF9JTbhj3INRz4VZqAYIelZ0bf24SPxvKtSqDbQdwa39AKOjpzaKVeqTggzRP1Wd9zh_iBJvGZKJCBbg8LY5aVx1ZqB7xX0vlXjtRs0jmO2bwJkYH1CwOZBuE23Rf45zvGCLpRcvWmEdNFgjm7J0jV7wmaLQcW0l5v7pasr5fyIwoPG3ac6X85LrbxCGsgIVv2qk",
  },
];

function StatusBadge({ status }) {
  if (status === "applied")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-700">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        Aplicado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-500">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Pendiente
    </span>
  );
}

export default function Cuotas() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Todos los Departamentos");

  const filtered = INITIAL_ROWS.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.dept.toLowerCase().includes(search.toLowerCase());
    const matchDept =
      deptFilter === "Todos los Departamentos" || r.dept === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 mb-8 -mt-6 md:-mt-10 pt-4 pb-4">
        <div className="flex items-center gap-6 flex-1">
          <h1
            className="text-green-900 font-semibold text-base shrink-0 hidden sm:block"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Portal de Comisariato
          </h1>
          <div className="relative w-full max-w-xs mt-2 md:mt-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              className="w-full bg-slate-100 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-700 outline-none"
              placeholder="Buscar deducciones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button className="hover:bg-slate-100 rounded-full p-2 transition-all text-slate-500 hidden sm:block">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="hover:bg-slate-100 rounded-full p-2 transition-all text-slate-500 hidden sm:block">
            <span className="material-symbols-outlined">history</span>
          </button>
          <button
            className="text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span className="hidden sm:inline">Exportar Reporte</span>
          </button>
        </div>
      </header>

      {/* Canvas */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-10 max-w-[1600px] mx-auto pb-4"
      >
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <nav className="flex text-xs text-slate-400 gap-2 mb-2">
              <span>Comisariato</span>
              <span>/</span>
              <span className="text-green-800 font-medium">
                Reportes de Deducción
              </span>
            </nav>
            <h2
              className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tighter"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Control de Deducciones Salariales
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Gestión automática de cuotas basada en el 15% del salario mensual.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 bg-slate-100 px-4 py-2 rounded-2xl shrink-0">
            <span className="material-symbols-outlined text-green-800">
              calendar_month
            </span>
            <span className="text-sm font-semibold text-gray-900">
              Octubre 2023 - Noviembre 2023
            </span>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group transition-all duration-300 cursor-default ${kpi.hoverBg}`}
            >
              <p className="text-sm font-medium text-slate-500 group-hover:text-white/80 transition-colors">
                {kpi.label}
              </p>
              <div className="flex items-end justify-between mt-2">
                <h3
                  className={`text-3xl font-black transition-colors group-hover:text-white ${kpi.valueColor}`}
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {kpi.value}
                </h3>
                <span className="material-symbols-outlined text-4xl opacity-10 group-hover:opacity-20 transition-opacity">
                  {kpi.icon}
                </span>
              </div>
            </div>
          ))}

          {/* Efficiency card */}
          <div
            className="p-6 rounded-3xl shadow-lg relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
            }}
          >
            <div className="relative z-10 w-full">
              <p className="text-sm font-medium text-green-200">
                Eficiencia de Recuperación
              </p>
              <div className="flex items-end justify-between mt-2">
                <h3
                  className="text-4xl font-black text-white"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  96.8%
                </h3>
                <div className="w-12 h-12 rounded-full border-4 border-green-300/20 border-t-green-300/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters + table */}
        <div className="flex flex-col gap-6">
          {/* Filter bar */}
          <div className="bg-slate-100 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">
                  Departamento
                </label>
                <select
                  className="bg-white border-none rounded-xl text-sm font-medium py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-green-700 cursor-pointer"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option>Todos los Departamentos</option>
                  <option>Corte y Cosecha</option>
                  <option>Mantenimiento</option>
                  <option>Logística</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-white text-gray-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-sm">
                  filter_list
                </span>
                Más Filtros
              </button>
              <button
                className="text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #14532d 0%, #166534 100%)",
                }}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {[
                      { label: "Empleado", align: "" },
                      { label: "Salario Base", align: "text-center" },
                      { label: "Crédito Total", align: "text-right" },
                      { label: "Cuota (15%)", align: "text-center" },
                      { label: "Monto Deducción", align: "text-right" },
                      { label: "Fecha Aplicación", align: "" },
                      { label: "Estado", align: "" },
                    ].map(({ label, align }) => (
                      <th
                        key={label}
                        className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 ${align}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      {/* Employee */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-slate-100 shrink-0">
                            <img
                              className="w-full h-full object-cover"
                              src={row.img}
                              alt=""
                            />
                          </div>
                          <div>
                            <p
                              className="font-bold text-gray-900 leading-tight"
                              style={{ fontFamily: "Manrope, sans-serif" }}
                            >
                              {row.name}
                            </p>
                            <p className="text-xs text-slate-400">{row.dept}</p>
                          </div>
                        </div>
                      </td>

                      {/* Salary */}
                      <td className="px-6 py-5 text-center text-sm font-medium text-slate-500">
                        {row.salary}
                      </td>

                      {/* Credit */}
                      <td
                        className="px-6 py-5 text-right font-bold text-gray-900"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {row.credit}
                      </td>

                      {/* Quota */}
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-semibold bg-slate-100 px-3 py-1 rounded-full">
                          {row.quota}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className="px-6 py-5 text-right font-bold text-green-800"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {row.amount}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-5 text-sm text-slate-400">
                        {row.date}
                      </td>

                      {/* Status */}
                      <td className="px-8 py-5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-8 py-16 text-center text-slate-400 font-bold italic text-sm"
                      >
                        No se encontraron registros...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Mostrando{" "}
                <span className="font-bold text-gray-900">
                  {filtered.length}
                </span>{" "}
                de 128 registros
              </p>
              <div className="flex gap-2">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-green-50 transition-colors text-slate-400">
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>
                </button>
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                      n === 1
                        ? "bg-green-800 text-white"
                        : "bg-white border border-slate-200 hover:bg-green-50 text-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-green-50 transition-colors text-slate-400">
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          {/* Projection card */}
          <div className="lg:col-span-2 bg-slate-100 rounded-3xl p-8 flex items-center gap-8 relative overflow-hidden flex-col sm:flex-row">
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-green-900/10 to-transparent pointer-events-none" />
            <div className="relative z-10 w-full sm:w-auto">
              <h4
                className="text-xl font-bold text-gray-900 mb-2"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Proyección de Deducciones
              </h4>
              <p className="text-sm text-slate-500 mb-6 max-w-md">
                Basado en la política de deducción del 15% para el próximo
                cierre de nómina.
              </p>
              <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                    Recuperación Estimada
                  </span>
                  <span
                    className="text-lg font-black text-green-800"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    $18.2k
                  </span>
                </div>
                <div className="w-px h-10 bg-slate-300" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                    Balance Pendiente
                  </span>
                  <span
                    className="text-lg font-black text-slate-600"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    $6.8k
                  </span>
                </div>
              </div>
            </div>

            {/* Mini bar chart */}
            <div className="ml-auto hidden sm:flex items-end gap-1 h-32 relative z-10 w-full justify-end">
              {[48, 80, 112, 96, 64].map((h, i) => (
                <div
                  key={i}
                  className="w-4 rounded-t-sm"
                  style={{
                    height: h,
                    background: `rgba(20,83,45,${0.2 + i * 0.15})`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Policy card */}
          <div
            className="text-white rounded-3xl p-8 flex flex-col justify-between"
            style={{
              background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
            }}
          >
            <div>
              <span className="material-symbols-outlined text-4xl mb-4 block opacity-50">
                verified_user
              </span>
              <h4
                className="text-xl font-bold"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Política de Nómina
              </h4>
              <p className="text-sm text-green-200/80 mt-2 leading-relaxed">
                Deducciones automáticas configuradas al 15% del salario mensual
                para todos los créditos activos.
              </p>
            </div>
            <button className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm font-bold border border-white/20 w-fit">
              Configurar Parámetros
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
