import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

// --- Constantes de Respaldo ---
const INITIAL_CREDITS = [
  {
    id: 1,
    employee: "Ricardo Mendoza",
    role: "Cosecha",
    code: "#CR-8821",
    montoTotal: 1200,
    cuotas: 12,
    pagadas: 4,
    plazo: "Mensual",
    fechaInicio: "2025-11-01",
    status: "Activo",
    statusClass: "bg-green-100 text-green-800",
    barClass: "bg-green-700",
    historialPagos: [],
  },
];

// --- Helpers de Cálculo ---
const calcCuota = (monto, cuotas) => (cuotas > 0 ? monto / cuotas : 0);
const calcSaldo = (monto, pagadas, cuotas) =>
  monto - pagadas * calcCuota(monto, cuotas);
const fmt = (n) =>
  `L ${Number(n).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Creditos() {
  const { userName } = useAuth();
  const [creditsData, setCreditsData] = useState([]);
  const [empData, setEmpData] = useState([]);
  const [cuotasData, setCuotasData] = useState([]);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, "creditos"), (s) =>
      setCreditsData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubE = onSnapshot(collection(db, "empleados"), (s) =>
      setEmpData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const unsubQ = onSnapshot(collection(db, "cuotas"), (s) =>
      setCuotasData(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      unsubC();
      unsubE();
      unsubQ();
    };
  }, []);

  const credits = useMemo(() => {
    if (creditsData.length === 0) return INITIAL_CREDITS;
    return creditsData.map((c) => {
      const emp =
        empData.find(
          (e) => e.empleadoId === c.empleadoId || e.id === c.empleadoId,
        ) || {};
      const pagos = cuotasData.filter(
        (q) => q.creditoId === c.creditoId || q.empleadoId === c.empleadoId,
      );

      return {
        ...c,
        id: c.id,
        employee: emp.nombres
          ? `${emp.nombres} ${emp.apellidos}`
          : "No vinculado",
        role: emp.departamento || "N/A",
        code: c.creditoId || `#CR-${c.id.substring(0, 4)}`,
        montoTotal: c.totalCredito || 0,
        cuotas: c.plazoMeses || 1,
        pagadas: pagos.length,
        plazo: "Mensual",
        fechaInicio: c.fechaInicio?.toDate
          ? c.fechaInicio.toDate().toLocaleDateString()
          : c.fechaInicio || "",
        status: c.estado || "Activo",
        statusClass:
          c.estado === "Activo"
            ? "bg-green-100 text-green-800"
            : "bg-slate-100 text-slate-600",
        barClass: c.estado === "Activo" ? "bg-green-700" : "bg-slate-500",
        historialPagos: pagos.map((p, i) => ({
          fecha: p.fechaRegistro?.toDate
            ? p.fechaRegistro.toDate().toLocaleDateString()
            : p.fechaRegistro || "",
          monto: p.monto || 0,
          cuota: i + 1,
        })),
      };
    });
  }, [creditsData, empData, cuotasData]);

  const creditosFiltrados = useMemo(() => {
    return credits.filter((c) => {
      const matchSearch =
        c.employee.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());
      const matchEstado = filtroEstado === "Todos" || c.status === filtroEstado;
      return matchSearch && matchEstado;
    });
  }, [search, filtroEstado, credits]);

  // Cálculos de Cartera
  const totalCartera = useMemo(
    () =>
      credits
        .filter((c) => c.status === "Activo")
        .reduce((s, c) => s + calcSaldo(c.montoTotal, c.pagadas, c.cuotas), 0),
    [credits],
  );
  const totalRecaudado = useMemo(
    () =>
      credits.reduce(
        (s, c) => s + c.pagadas * calcCuota(c.montoTotal, c.cuotas),
        0,
      ),
    [credits],
  );

  // --- FUNCIÓN DE REPORTE PROFESIONAL ---
  const handleExportReport = () => {
    const dateStr = new Date().toLocaleDateString("es-HN");

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Reporte de Créditos - Comisariato Pro</title>
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
          <header class="w-full pb-4 border-b-2 border-[#00450d] flex justify-between items-end mb-10">
            <div class="flex flex-col">
              <span class="text-2xl font-extrabold tracking-tighter text-[#00450d] font-headline uppercase">COMISARIATO PRO</span>
              <span class="font-headline uppercase tracking-widest text-[11px] font-bold text-[#00450d] mt-1">REPORTE GENERAL DE CRÉDITOS - ${dateStr}</span>
            </div>
            <div class="text-right text-[#00450d] font-headline font-bold text-[10px] tracking-widest uppercase">Finanzas e Inventario</div>
          </header>

          <section class="grid grid-cols-2 gap-6 mb-10">
            <div class="bg-[#f2f4f2] p-5 border-l-4 border-[#00450d]">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Cartera Activa Pendiente</p>
              <p class="text-xl font-bold text-[#00450d] font-headline">${fmt(totalCartera)}</p>
            </div>
            <div class="bg-[#f2f4f2] p-5 border-l-4 border-[#523327]">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Total Recaudado Histórico</p>
              <p class="text-xl font-bold text-[#523327] font-headline">${fmt(totalRecaudado)}</p>
            </div>
          </section>

          <section class="flex-grow">
            <table class="w-full text-left border-collapse">
              <thead class="bg-[#e1e3e1]">
                <tr>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d]">Código</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d]">Empleado</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d] text-right">Monto</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d] text-right">Saldo</th>
                  <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-[#00450d] text-center">Estado</th>
                </tr>
              </thead>
              <tbody class="text-[11px]">
                ${creditosFiltrados
                  .map(
                    (c) => `
                  <tr class="border-b border-gray-100">
                    <td class="px-4 py-3 font-mono text-gray-400">${c.code}</td>
                    <td class="px-4 py-3 font-bold text-gray-800">${c.employee}</td>
                    <td class="px-4 py-3 text-right">${fmt(c.montoTotal)}</td>
                    <td class="px-4 py-3 font-bold text-right text-[#00450d]">${fmt(calcSaldo(c.montoTotal, c.pagadas, c.cuotas))}</td>
                    <td class="px-4 py-3 text-center uppercase font-black text-[9px]">${c.status}</td>
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
                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#00450d]">Revisión Contable</p>
              </div>
              <div class="flex flex-col items-center">
                <div class="w-full border-b border-gray-400 mb-2"></div>
                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-[#00450d]">Firma Autorizada</p>
              </div>
            </div>
          </footer>
        </div>
        <div class="fixed bottom-8 right-8 no-print">
          <button onclick="window.print()" class="bg-[#00450d] text-white px-8 py-3 rounded-full font-bold shadow-xl active:scale-95 transition-all">Imprimir Reporte</button>
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
        className="space-y-6"
      >
        {/* HEADER */}
        <section className="pt-2 md:pt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight font-headline">
              Créditos
            </h2>
            <p className="text-slate-500 font-medium text-sm">
              Seguimiento de saldos y recaudación por planilla.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleExportReport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-black transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>{" "}
              Exportar
            </button>
          </div>
        </section>

        {/* CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-green-800/10 border-l-4 border-l-green-800 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cartera Activa
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              {fmt(totalCartera)}
            </h3>
          </article>
          <article className="rounded-2xl border border-slate-200 border-l-4 border-l-slate-800 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total Recaudado
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              {fmt(totalRecaudado)}
            </h3>
          </article>
          <article className="rounded-2xl border border-sky-800/10 border-l-4 border-l-sky-800 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Tasa Aplicada
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              15%{" "}
              <span className="text-xs text-slate-400 font-bold tracking-normal italic">
                Mensual
              </span>
            </h3>
          </article>
        </div>

        {/* TABLA */}
        <article className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">
              Historial de Créditos
            </h3>
            <div className="flex gap-1">
              {["Todos", "Activo", "Pagado"].map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`rounded-full px-4 py-1.5 text-[10px] font-black transition-all ${filtroEstado === e ? "bg-green-800 text-white shadow-lg shadow-green-900/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                >
                  {e.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Empleado
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Monto / Plan
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Saldo
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {creditosFiltrados.map((item) => {
                  const saldo = calcSaldo(
                    item.montoTotal,
                    item.pagadas,
                    item.cuotas,
                  );
                  const pct = Math.round((item.pagadas / item.cuotas) * 100);
                  return (
                    <tr
                      key={item.id}
                      className="group hover:bg-slate-50/50 transition-all"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">
                          {item.employee}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {item.code} — {item.role}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">
                          {fmt(item.montoTotal)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                          {item.pagadas}/{item.cuotas} Cuotas
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p
                          className={`text-sm font-black ${saldo > 0 ? "text-slate-900" : "text-green-700"}`}
                        >
                          {fmt(saldo)}
                        </p>
                        <div className="mt-1.5 h-1 w-20 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${item.barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${item.statusClass}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelected(item);
                            setIsDetailOpen(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-slate-400 group-hover:text-green-800">
                            visibility
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </motion.div>

      {/* MODAL DETALLE (Mantenido igual pero con padding mejorado) */}
      {isDetailOpen && selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black uppercase tracking-widest text-sm">
                Detalle de Crédito
              </h3>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="material-symbols-outlined hover:rotate-90 transition-all"
              >
                close
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    Saldo Actual
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {fmt(
                      calcSaldo(
                        selected.montoTotal,
                        selected.pagadas,
                        selected.cuotas,
                      ),
                    )}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">
                    Cuota Mensual
                  </p>
                  <p className="text-xl font-black text-green-800">
                    {fmt(calcCuota(selected.montoTotal, selected.cuotas))}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                  Historial de Pagos Recibidos
                </h4>
                <div className="space-y-2">
                  {selected.historialPagos.map((p, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <span className="text-xs font-bold text-slate-600">
                        Cuota #{p.cuota}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {p.fecha}
                      </span>
                      <span className="text-xs font-black text-green-700">
                        {fmt(p.monto)}
                      </span>
                    </div>
                  ))}
                  {selected.historialPagos.length === 0 && (
                    <p className="text-center py-4 text-xs italic text-slate-400">
                      No se registran pagos aún.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
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
