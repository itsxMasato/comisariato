import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

const normalizarEstado = (valor) =>
  String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const esCreditoVisibleEnCuotas = (credito, filtroActual = "Activos") => {
  const estado = normalizarEstado(credito?.estado || credito?.status);
  
  if (filtroActual === "Activos") {
    return ["activo", "aprobado", "vigente", "desembolsado"].includes(estado);
  } else if (filtroActual === "Pagados") {
    return ["pagado", "liquidado"].includes(estado);
  }
  
  return true; // "Todos"
};

const deepFindQuotas = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  const possibleKeys = ["cuotastotales", "cantidadcuotas", "numerocuotas", "plazomeses", "mesesplazo", "cuotas", "plazo"];
  
  for (const [key, value] of Object.entries(obj)) {
    const lkey = key.toLowerCase();
    if (possibleKeys.includes(lkey) && value !== undefined && value !== null && typeof value !== 'object') {
      const extracted = parseInt(String(value).replace(/[^\d]/g, ""), 10);
      if (!isNaN(extracted) && extracted > 0) return extracted;
    }
  }
  
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const res = deepFindQuotas(value);
      if (res) return res;
    }
  }
  return null;
};

const getCuotasTotales = (c) => {
  return deepFindQuotas(c) || 1;
};

const calcularCuota = (monto, cuotas) => (cuotas > 0 ? monto / cuotas : 0);

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
  const [statusFilter, setStatusFilter] = useState("Activos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departamentos, setDepartamentos] = useState([]);
  const [parametros, setParametros] = useState({ porcentajeSueldo: 15 });

  const [cuotasData, setCuotasData] = useState([]);
  const [empData, setEmpData] = useState([]);
  const [credData, setCredData] = useState([]);
  const [usuariosData, setUsuariosData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [cobrandoId, setCobrandoId] = useState(null);

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
    const unsubU = onSnapshot(collection(db, "usuarios"), (s) =>
      setUsuariosData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubD = onSnapshot(collection(db, "departamentos"), (s) =>
      setDepartamentos(s.docs.map((d) => ({ id: d.id, nombre: d.data().nombre })))
    );
    const unsubP = onSnapshot(doc(db, "parametros", "general"), (docSnap) => {
      if (docSnap.exists()) {
        setParametros((prev) => ({ ...prev, ...docSnap.data() }));
      }
    });

    return () => {
      unsubQ();
      unsubE();
      unsubC();
      unsubU();
      unsubD();
      unsubP();
    };
  }, []);

  const stats = useMemo(() => {
    let totalRecuperado = 0;
    cuotasData.forEach((c) => (totalRecuperado += Number(c.monto) || 0));
    let totalNomina = 0;
    credData
      .filter((c) => esCreditoVisibleEnCuotas(c))
      .forEach((cred) => {
        const emp = empData.find(
          (e) => e.empleadoId === cred.empleadoId || e.id === cred.empleadoId,
        ) || {};
        const usr = usuariosData.find(
          (u) => u.uid === cred.empleadoId || u.id === cred.empleadoId || u.empleadoId === cred.empleadoId,
        ) || {};
        
        const sal = Number(emp.salario || usr.salario || 0);
        if (sal) totalNomina += sal * (parametros.porcentajeSueldo / 100);
      });
    return { totalRecuperado, totalNomina };
  }, [cuotasData, empData, credData, usuariosData, parametros]);

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
      label: `Deducción de Nómina (${parametros.porcentajeSueldo}%)`,
      value: `L ${stats.totalNomina.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: "account_balance_wallet",
      valueColor: "text-green-800",
      hoverBg: "hover:bg-green-800 hover:text-white",
    },
  ];

  const rows = credData
    .filter((c) => esCreditoVisibleEnCuotas(c, statusFilter))
    .map((cred) => {
      const targetId = String(cred.empleadoId || cred.usuarioId || "").trim();

      const emp =
        empData.find(
          (e) =>
            String(e.empleadoId) === targetId ||
            String(e.id) === targetId ||
            String(e.uid) === targetId ||
            String(e.usuarioId) === targetId ||
            String(e.dni) === targetId,
        ) || {};
      const usr =
        usuariosData.find(
          (u) =>
            String(u.uid) === targetId ||
            String(u.id) === targetId ||
            String(u.empleadoId) === targetId ||
            String(u.dni) === targetId,
        ) || {};
        
      const pagos = cuotasData.filter(
        (q) => 
          (q.creditoId && String(q.creditoId) === String(cred.id)) || 
          (cred.creditoId && q.creditoId && String(q.creditoId) === String(cred.creditoId))
      );
      
      const totalCredito = Number(cred.totalCredito || cred.montoTotal || cred.total || 0);
      const cuotasTotales = getCuotasTotales(cred);
      const montoCuota = totalCredito / cuotasTotales;
      
      const fullName = [emp.nombres, emp.apellidos].filter(Boolean).join(" ").trim();
      const usrName = [usr.nombres, usr.apellidos].filter(Boolean).join(" ").trim();
      const nombreEmpleado = fullName || usrName || emp.nombre || usr.nombre || cred.empleado || cred.empleadoNombre || "Empleado";

      return {
        id: cred.id,
        name: nombreEmpleado,
        dept: emp.departamento || emp.area || usr.departamento || "N/A",
        salary: `L ${Number(emp.salario || emp.salarioBase || emp.sueldoBase || emp.sueldo || usr.salario || usr.salarioBase || usr.sueldo || 0).toLocaleString("es-HN", { minimumFractionDigits: 2 })}`,
        credit: `L ${totalCredito.toLocaleString()}`,
        quota: `${pagos.length} / ${cuotasTotales}`,
        amount: `L ${montoCuota.toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        date: cred.fecha && typeof cred.fecha.toDate === "function"
          ? cred.fecha.toDate().toLocaleDateString()
          : (typeof cred.fecha === "string" ? cred.fecha : (cred.createdAt ? new Date(cred.createdAt).toLocaleDateString() : "N/A")),
        status: pagos.length >= cuotasTotales ? "applied" : "pending",
        img: "https://ui-avatars.com/api/?name=" + (nombreEmpleado !== "Empleado" ? nombreEmpleado : "U"),
        orderId: cred.orderId || `RES-${cred.id.slice(0, 5).toUpperCase()}`,
        rawCred: cred,
        empleadoId: targetId,
        cuotasTotales,
        cuotasPagadas: pagos.length,
        totalCredito,
        rawPagos: pagos.map((p, i) => ({
          fecha: p.fechaRegistro?.toDate ? p.fechaRegistro.toDate().toLocaleDateString() : (p.fecha || "N/A"),
          monto: Number(p.monto || 0),
          cuota: i + 1,
        })),
        montoCuota: montoCuota
      };
    });

  const handleCobrarCuota = async (row) => {
    const creditoId = row?.id;
    if (!creditoId) return;

    const saldoPendiente = row.totalCredito - row.cuotasPagadas * row.montoCuota;
    if (saldoPendiente <= 0) return;

    setCobrandoId(creditoId);
    try {
      const montoACobrar = Math.min(row.montoCuota, saldoPendiente);

      await addDoc(collection(db, "cuotas"), {
        creditoId,
        empleadoId: row.empleadoId || "",
        monto: montoACobrar,
        fechaRegistro: serverTimestamp(),
        usuarioRegistro: auth.currentUser?.email || "Usuario",
      });

      if (saldoPendiente - montoACobrar <= 0.05) {
        await updateDoc(doc(db, "creditos", creditoId), {
          estado: "pagado",
          status: "Pagado",
          fechaCierre: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error al cobrar cuota:", error);
    } finally {
      setCobrandoId(null);
    }
  };

  const filtered = rows.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchDept =
      deptFilter === "Todos los Departamentos" || r.dept === deptFilter;

    let matchDate = true;
    if (startDate || endDate) {
      const cred = r.rawCred;
      let cDate = null;
      if (cred.fecha && typeof cred.fecha.toDate === "function") {
        cDate = cred.fecha.toDate();
      } else if (cred.fecha && typeof cred.fecha === "string") {
        const parts = cred.fecha.split("/");
        if (parts.length === 3) {
          cDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        } else {
          cDate = new Date(cred.fecha);
        }
      } else if (cred.createdAt) {
        cDate = new Date(cred.createdAt);
      }

      if (cDate && !isNaN(cDate.getTime())) {
        cDate.setHours(0, 0, 0, 0);
        const cTime = cDate.getTime();
        
        if (startDate) {
          const sd = new Date(`${startDate}T00:00:00`);
          if (cTime < sd.getTime()) matchDate = false;
        }
        if (endDate) {
          const ed = new Date(`${endDate}T23:59:59`);
          if (cTime > ed.getTime()) matchDate = false;
        }
      } else {
        matchDate = false;
      }
    }

    return matchSearch && matchDept && matchDate;
  }).sort((a, b) => a.name.localeCompare(b.name));

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
         return sal * (parametros.porcentajeSueldo / 100);
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
              Gestión automática de cuotas basada en el {parametros.porcentajeSueldo}% del salario mensual.
            </p>
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
                  className="bg-white border-none rounded-xl text-sm font-medium py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-green-700 cursor-pointer shadow-sm"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option>Todos los Departamentos</option>
                  {departamentos.map((dep, idx) => (
                      <option key={idx} value={dep.nombre}>{dep.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-1">
                  Estado
                </label>
                <select
                  className="bg-white border-none rounded-xl text-sm font-medium py-2 pl-4 pr-10 outline-none focus:ring-2 focus:ring-green-700 cursor-pointer shadow-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="Activos">Solo Activos</option>
                  <option value="Pagados">Solo Pagados</option>
                </select>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-3 py-1.5 focus-within:ring-2 focus-within:ring-green-700">
                <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none text-center cursor-pointer"
                  title="Fecha de Inicio"
                />
                <span className="text-slate-300 font-bold">-</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none text-center cursor-pointer"
                  title="Fecha de Fin"
                />
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
                  {departamentos.map((dep, idx) => (
                      <button key={idx} onClick={() => handleExportReport(dep.nombre)} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Depto. {dep.nombre}</button>
                  ))}
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
                      { label: "Crédito Total", align: "text-right" },
                      { label: "Avance Cuotas", align: "text-center" },
                      { label: "Monto Deducción", align: "text-right" },
                      { label: "Fecha Aplicación", align: "" },
                      { label: "Estado", align: "" },
                      { label: "", align: "" },
                    ].map(({ label, align }, idx) => (
                      <th
                        key={idx}
                        className={`px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 ${align}`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length > 0 ? (
                    filtered.map((row) => (
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
                              <p className="text-xs text-slate-400">{row.dept} • Ref: {row.orderId}</p>
                            </div>
                          </div>
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
                        <td className="px-4 py-5 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              onClick={() => handleCobrarCuota(row)}
                              disabled={row.status === "applied" || cobrandoId === row.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-700 text-white text-xs font-bold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Cobrar cuota"
                            >
                              <span className="material-symbols-outlined text-sm">payments</span>
                              {cobrandoId === row.id ? "Cobrando..." : "Cobrar"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRow(row);
                                setIsModalOpen(true);
                              }}
                              className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                              title="Ver detalle"
                            >
                              <span className="material-symbols-outlined text-slate-400 group-hover:text-green-800">
                                visibility
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-8 py-14 text-center">
                        <span className="material-symbols-outlined text-slate-300 text-4xl block mb-2">
                          inbox
                        </span>
                        <p className="text-slate-500 font-semibold">
                          No hay deducciones para mostrar con los filtros actuales.
                        </p>
                      </td>
                    </tr>
                  )}
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
                Basado en la política de deducción del {parametros.porcentajeSueldo}% para el próximo
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
                Deducciones automáticas configuradas al {parametros.porcentajeSueldo}% del salario mensual exigiendo una antigüedad mínima de {parametros.minimoAccesoCredito || 3} meses.
              </p>
            </div>
            <button className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-sm font-bold border border-white/20 w-fit">
              Configurar Parámetros
            </button>
          </div>
        </div>
      </motion.div>

      {/* MODAL DETALLE DE CUOTAS */}
      {isModalOpen && selectedRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="material-symbols-outlined">receipt_long</span>
                Detalle de Deducción
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="material-symbols-outlined hover:rotate-90 transition-all cursor-pointer"
              >
                close
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-slate-100 shrink-0">
                  <img src={selectedRow.img} alt="" className="w-full h-full object-cover"/>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 leading-none">{selectedRow.name}</h4>
                  <p className="text-sm font-bold text-slate-400 mt-1">{selectedRow.dept} • {selectedRow.orderId}</p>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Avance de Pago
                  </p>
                  <p className="text-xl font-black text-slate-900 flex items-baseline gap-1">
                     {selectedRow.quota.split('/')[0].trim()}
                     <span className="text-sm text-slate-400 font-bold">/ {selectedRow.quota.split('/')[1].trim()} cuotas</span>
                  </p>
                </div>
                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                  <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-1">
                    Valor Deducción Mensual
                  </p>
                  <p className="text-xl font-black text-green-800">
                    {selectedRow.amount}
                  </p>
                </div>
              </div>

               <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest border-b border-slate-100 pb-2">
                  Historial de Transacciones Registradas
                </h4>
                <div className="space-y-2">
                  {selectedRow.rawPagos.map((p, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                         <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-green-700 text-[14px]">check</span>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-700">Cuota #{p.cuota}</span>
                           <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 mt-1 w-fit">{p.fecha}</span>
                         </div>
                      </div>
                      <span className="text-sm font-black text-green-800">
                        L {Number(p.monto).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                  {selectedRow.rawPagos.length === 0 && (
                     <div className="py-6 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <span className="material-symbols-outlined opacity-50 mb-2">inbox</span>
                        <p className="text-xs font-bold uppercase tracking-widest">Aún no hay deducciones</p>
                     </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 mt-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
