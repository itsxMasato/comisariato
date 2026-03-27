import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

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
  const { userName, role: authRole } = useAuth();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Todos los Departamentos");

  const [cuotasData, setCuotasData] = useState([]);
  const [empData, setEmpData] = useState([]);
  const [credData, setCredData] = useState([]);

  useEffect(() => {
    const unsubQ = onSnapshot(collection(db, "cuotas"), (s) =>
      setCuotasData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubE = onSnapshot(collection(db, "empleados"), (s) =>
      setEmpData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubC = onSnapshot(collection(db, "creditos"), (s) =>
      setCredData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubQ();
      unsubE();
      unsubC();
    };
  }, []);

  const stats = useMemo(() => {
    let totalRecuperado = 0;
    cuotasData.forEach((c) => (totalRecuperado += Number(c.monto) || 0));
    let totalNomina = 0;
    credData
      .filter((c) => c.estado === "Activo")
      .forEach((c) => {
        const emp = empData.find(
          (e) => e.empleadoId === c.empleadoId || e.id === c.empleadoId,
        );
        if (emp && emp.salario) totalNomina += Number(emp.salario) * 0.15;
      });
    return { totalRecuperado, totalNomina };
  }, [cuotasData, empData, credData]);

  const liveKpis = [
    {
      label: "Total Recuperado",
      value: `L ${stats.totalRecuperado.toLocaleString()}`,
      icon: "savings",
      valueColor: "text-green-800",
      hoverBg: "hover:bg-green-800 hover:text-white",
    },
    {
      label: "Pendiente de Cobro",
      value: "L 0.00",
      icon: "pending_actions",
      valueColor: "text-slate-600",
      hoverBg: "hover:bg-slate-600 hover:text-white",
    },
    {
      label: "Deducción de Nómina (15%)",
      value: `L ${stats.totalNomina.toLocaleString()}`,
      icon: "account_balance_wallet",
      valueColor: "text-green-800",
      hoverBg: "hover:bg-green-800 hover:text-white",
    },
  ];

  const rows = cuotasData.map((c) => {
    const emp =
      empData.find(
        (e) => e.empleadoId === c.empleadoId || e.id === c.empleadoId,
      ) || {};
    const cred =
      credData.find(
        (cr) => cr.empleadoId === c.empleadoId && cr.estado === "Activo",
      ) || {};
    return {
      id: c.cuotaId || c.id,
      name: emp.nombres ? `${emp.nombres} ${emp.apellidos}` : "Desconocido",
      dept: emp.departamento || "N/A",
      salary: `L ${Number(emp.salario || 0).toLocaleString()}`,
      credit: cred.totalCredito
        ? `L ${Number(cred.totalCredito).toLocaleString()}`
        : "—",
      quota: cred.plazoMeses ? `- / ${cred.plazoMeses}` : "—",
      amount: `L ${Number(c.monto || 0).toLocaleString()}`,
      date:
        c.fecha && typeof c.fecha.toDate === "function"
          ? c.fecha.toDate().toLocaleDateString()
          : c.fecha || "",
      status: Number(c.saldoPendiente || 0) > 0 ? "pending" : "applied",
      img: "https://ui-avatars.com/api/?name=" + (emp.nombres || "U"),
    };
  });

  const filtered = rows.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchDept =
      deptFilter === "Todos los Departamentos" || r.dept === deptFilter;
    return matchSearch && matchDept;
  });

  // --- ÚNICA PARTE MODIFICADA: DISEÑO DEL REPORTE ---
  const handleExportReport = (deptReport = "Todos los Departamentos") => {
    const dateStr = new Date().toLocaleDateString("es-HN");
    
    // Si exportan por dropdown, filtramos todos los rows según eso, ignorando la búsqueda actual.
    // Si usan el mismo que ya está en UI o export default, usamos filtered.
    const listToExport = deptReport === "Todos los Departamentos"
      ? rows
      : rows.filter(r => r.dept === deptReport);

    const reportLabel = deptReport === "Todos los Departamentos" 
      ? "GLOBAL DE DEDUCCIONES" 
      : `DEDUCCIONES - ${deptReport.toUpperCase()}`;

    // Calcular stats de exportación según lista específica
    const mapCuotasMonto = listToExport.map(r => Number(r.amount.replace(/[^0-9.-]+/g,"")) || 0);
    const exportTotalRecuperado = mapCuotasMonto.reduce((a,b) => a+b, 0);

    const mapCuotasNomina = listToExport.map(r => {
      const match = r.credit !== "—"; // si tiene credito activo
      if (match) {
         const sal = Number(r.salary.replace(/[^0-9.-]+/g,"")) || 0;
         return sal * 0.15;
      }
      return 0;
    });
    const exportTotalNomina = mapCuotasNomina.reduce((a,b) => a+b, 0);

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Reporte de Deducciones - Comisariato Pro</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
        <style>
          @media print { @page { size: A4; margin: 0; } body { background-color: white !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
          .a4-canvas { width: 210mm; min-height: 297mm; background-color: white; margin: 0 auto; padding: 3rem; font-family: 'Inter', sans-serif; }
          .font-headline { font-family: 'Manrope', sans-serif; }
        </style>
      </head>
      <body class="bg-gray-100">
        <div class="a4-canvas shadow-2xl flex flex-col mx-auto my-8">
          <header class="w-full pb-4 border-b-2 border-[#14532d] flex justify-between items-end mb-10">
            <div class="flex flex-col">
              <span class="text-2xl font-extrabold tracking-tighter text-[#14532d] font-headline uppercase">COMISARIATO PRO</span>
              <span class="font-headline uppercase tracking-widest text-[11px] font-bold text-[#14532d] mt-1">REPORTE ${reportLabel} - ${dateStr}</span>
            </div>
            <div class="text-right text-[#14532d] font-headline font-bold text-[10px] tracking-widest uppercase">Finanzas e Inventario</div>
          </header>

          <section class="grid grid-cols-2 gap-6 mb-10">
            <div class="bg-[#f2f4f2] p-5 border-l-4 border-[#14532d]">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Total Recuperado</p>
              <p class="text-xl font-bold text-[#14532d] font-headline">L ${exportTotalRecuperado.toLocaleString()}</p>
            </div>
            <div class="bg-[#f2f4f2] p-5 border-l-4 border-slate-400">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Deducción Global Proyectada</p>
              <p class="text-xl font-bold text-slate-800 font-headline">L ${exportTotalNomina.toLocaleString()}</p>
            </div>
          </section>

          <section class="flex-grow">
            <table class="w-full text-left border-collapse">
              <thead class="bg-[#e1e3e1]">
                <tr>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#14532d]">Empleado</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#14532d]">Departamento</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#14532d] text-right">Monto</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#14532d] text-center">Estado</th>
                </tr>
              </thead>
              <tbody class="text-[11px]">
                ${listToExport
                  .map(
                    (c) => `
                  <tr class="border-b border-gray-100">
                    <td class="px-4 py-3 font-bold text-gray-800">${c.name}</td>
                    <td class="px-4 py-3 text-gray-500">${c.dept}</td>
                    <td class="px-4 py-3 text-right font-bold text-[#14532d]">${c.amount}</td>
                    <td class="px-4 py-3 text-center uppercase font-black text-[9px]">${c.status === "applied" ? "Aplicado" : "Pendiente"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </section>

          <footer class="mt-auto border-t border-gray-100 pt-12">
            <div class="grid grid-cols-2 gap-12 w-full px-4 mb-8">
              <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-400 mb-2"></div>
                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#14532d]">Revisión Contable</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-400 mb-2"></div>
                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#14532d]">Firma Autorizada</p>
              </div>
            </div>
          </footer>
        </div>
        <div class="fixed bottom-8 right-8 no-print">
          <button onclick="window.print()" class="bg-[#14532d] text-white px-8 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all">Imprimir Reporte</button>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    printWin.document.write(reportHtml);
    printWin.document.close();
  };

  return (
    <>
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
          {liveKpis.map((kpi) => (
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

        <div className="flex flex-col gap-6">
          {/* Filter bar */}
          <div className="bg-slate-100 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 border border-slate-200">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:max-w-xs shrink-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  className="w-full bg-white border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-700 outline-none shadow-sm"
                  placeholder="Buscar deducciones..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
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
              <div className="relative group text-sm font-bold w-full z-40">
                <button className="w-full inline-flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-black transition-colors" title="Exportar Reporte">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Exportar
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-2">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-4 py-2 opacity-60">Selecciona el reporte</span>
                  <button onClick={() => handleExportReport("Todos los Departamentos")} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Reporte Global</button>
                  <button onClick={() => handleExportReport("Corte y Cosecha")} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Depto. Corte y Cosecha</button>
                  <button onClick={() => handleExportReport("Mantenimiento")} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Depto. Mantenimiento</button>
                  <button onClick={() => handleExportReport("Logística")} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Depto. Logística</button>
                </div>
              </div>
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
                      <td className="px-6 py-5 text-center text-sm font-medium text-slate-500">
                        {row.salary}
                      </td>
                      <td
                        className="px-6 py-5 text-right font-bold text-gray-900"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {row.credit}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-semibold bg-slate-100 px-3 py-1 rounded-full">
                          {row.quota}
                        </span>
                      </td>
                      <td
                        className="px-6 py-5 text-right font-bold text-green-800"
                        style={{ fontFamily: "Manrope, sans-serif" }}
                      >
                        {row.amount}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-400">
                        {row.date}
                      </td>
                      <td className="px-8 py-5">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          <div className="lg:col-span-2 bg-slate-100 rounded-3xl p-8 flex items-center gap-8 relative overflow-hidden flex-col sm:flex-row">
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
              </div>
            </div>
          </div>

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
                Deducciones automáticas configuradas al 15% del salario mensual.
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
