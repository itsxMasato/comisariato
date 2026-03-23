import React, { useState } from "react";

const EMPLEADOS = [
  { id: 1, nombre: "Ricardo Mendoza", area: "Cosecha" },
  { id: 2, nombre: "Elena Soriano", area: "Empaque" },
  { id: 3, nombre: "Samuel Vargas", area: "Riego" },
];

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
    descripcion: "Compra de electrodomesticos",
    status: "Activo",
    statusClass: "bg-green-100 text-green-800",
    barClass: "bg-green-700",
    historialPagos: [
      { fecha: "2025-12-01", monto: 100, cuota: 1 },
      { fecha: "2026-01-01", monto: 100, cuota: 2 },
      { fecha: "2026-02-01", monto: 100, cuota: 3 },
      { fecha: "2026-03-01", monto: 100, cuota: 4 },
    ],
  },
  {
    id: 2,
    employee: "Elena Soriano",
    role: "Empaque",
    code: "#CR-8710",
    montoTotal: 450,
    cuotas: 6,
    pagadas: 6,
    plazo: "Mensual",
    fechaInicio: "2025-09-01",
    descripcion: "Utiles escolares",
    status: "Pagado",
    statusClass: "bg-slate-100 text-slate-600",
    barClass: "bg-slate-500",
    historialPagos: [
      { fecha: "2025-10-01", monto: 75, cuota: 1 },
      { fecha: "2025-11-01", monto: 75, cuota: 2 },
      { fecha: "2025-12-01", monto: 75, cuota: 3 },
      { fecha: "2026-01-01", monto: 75, cuota: 4 },
      { fecha: "2026-02-01", monto: 75, cuota: 5 },
      { fecha: "2026-03-01", monto: 75, cuota: 6 },
    ],
  },
  {
    id: 3,
    employee: "Samuel Vargas",
    role: "Riego",
    code: "#CR-8815",
    montoTotal: 2500,
    cuotas: 24,
    pagadas: 1,
    plazo: "Quincenal",
    fechaInicio: "2026-02-15",
    descripcion: "Reparacion de vivienda",
    status: "Mora",
    statusClass: "bg-amber-100 text-amber-800",
    barClass: "bg-amber-600",
    historialPagos: [{ fecha: "2026-03-01", monto: 104.17, cuota: 1 }],
  },
];

const calcCuota = (monto, cuotas) => (cuotas > 0 ? monto / cuotas : 0);
const calcSaldo = (monto, pagadas, cuotas) =>
  monto - pagadas * calcCuota(monto, cuotas);
const fmt = (n) =>
  `L ${Number(n).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusConfig = (pagadas, cuotas) => {
  if (pagadas >= cuotas)
    return {
      label: "Pagado",
      cls: "bg-slate-100 text-slate-600",
      bar: "bg-slate-500",
    };
  if (pagadas === 0)
    return {
      label: "Mora",
      cls: "bg-amber-100 text-amber-800",
      bar: "bg-amber-600",
    };
  return {
    label: "Activo",
    cls: "bg-green-100 text-green-800",
    bar: "bg-green-700",
  };
};

export default function Creditos() {
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPagoOpen, setIsPagoOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [form, setForm] = useState({
    empleadoId: "",
    monto: "",
    cuotas: "6",
    plazo: "Mensual",
    fechaInicio: new Date().toISOString().slice(0, 10),
    descripcion: "",
  });

  const montoNum = parseFloat(form.monto) || 0;
  const cuotasNum = parseInt(form.cuotas) || 1;
  const pagoEstim = calcCuota(montoNum, cuotasNum);

  const creditosFiltrados = credits.filter((c) => {
    const matchSearch =
      c.employee.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "Todos" || c.status === filtroEstado;
    return matchSearch && matchEstado;
  });

  const totalCartera = credits
    .filter((c) => c.status === "Activo" || c.status === "Mora")
    .reduce((s, c) => s + calcSaldo(c.montoTotal, c.pagadas, c.cuotas), 0);
  const totalRecaudado = credits.reduce(
    (s, c) => s + c.pagadas * calcCuota(c.montoTotal, c.cuotas),
    0,
  );
  const enMora = credits.filter((c) => c.status === "Mora").length;

  const handleAprobar = () => {
    if (!form.empleadoId || !form.monto || montoNum <= 0) {
      alert("Complete todos los campos obligatorios.");
      return;
    }
    const emp = EMPLEADOS.find((e) => e.id === parseInt(form.empleadoId));
    const cfg = statusConfig(0, cuotasNum);
    const nuevo = {
      id: Date.now(),
      employee: emp.nombre,
      role: emp.area,
      code: `#CR-${Math.floor(1000 + Math.random() * 9000)}`,
      montoTotal: montoNum,
      cuotas: cuotasNum,
      pagadas: 0,
      plazo: form.plazo,
      fechaInicio: form.fechaInicio,
      descripcion: form.descripcion,
      status: cfg.label,
      statusClass: cfg.cls,
      barClass: cfg.bar,
      historialPagos: [],
    };
    setCredits((prev) => [nuevo, ...prev]);
    setForm({
      empleadoId: "",
      monto: "",
      cuotas: "6",
      plazo: "Mensual",
      fechaInicio: new Date().toISOString().slice(0, 10),
      descripcion: "",
    });
  };

  const handleRegistrarPago = () => {
    if (!selected) return;
    setCredits((prev) =>
      prev.map((c) => {
        if (c.id !== selected.id) return c;
        const nuevasPagadas = c.pagadas + 1;
        const cfg = statusConfig(nuevasPagadas, c.cuotas);
        return {
          ...c,
          pagadas: nuevasPagadas,
          status: cfg.label,
          statusClass: cfg.cls,
          barClass: cfg.bar,
          historialPagos: [
            ...c.historialPagos,
            {
              fecha: fechaPago,
              monto: parseFloat(calcCuota(c.montoTotal, c.cuotas).toFixed(2)),
              cuota: nuevasPagadas,
            },
          ],
        };
      }),
    );
    setSelected((prev) => {
      const updated = credits.find((c) => c.id === prev.id);
      if (!updated) return prev;
      const nuevasPagadas = updated.pagadas + 1;
      const cfg = statusConfig(nuevasPagadas, updated.cuotas);
      return {
        ...updated,
        pagadas: nuevasPagadas,
        status: cfg.label,
        statusClass: cfg.cls,
        barClass: cfg.bar,
        historialPagos: [
          ...updated.historialPagos,
          {
            fecha: fechaPago,
            monto: parseFloat(
              calcCuota(updated.montoTotal, updated.cuotas).toFixed(2),
            ),
            cuota: nuevasPagadas,
          },
        ],
      };
    });
    setIsPagoOpen(false);
  };

  const handleViewDetail = (item) => {
    setSelected(item);
    setIsDetailOpen(true);
  };

  const handleExportReport = () => {
    const sanitize = (t) =>
      String(t)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "?");
    const esc = (t) =>
      sanitize(t)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
    const lines = [
      "Reporte de Creditos - Comisariato Pro",
      `Fecha: ${new Date().toLocaleDateString("es-HN")}`,
      "",
      "Codigo | Empleado | Monto | Saldo Pendiente | Cuotas | Estado",
      "---------------------------------------------------------------------",
      ...credits.map(
        (c) =>
          `${c.code} | ${c.employee} | ${fmt(c.montoTotal)} | ${fmt(calcSaldo(c.montoTotal, c.pagadas, c.cuotas))} | ${c.pagadas}/${c.cuotas} | ${c.status}`,
      ),
    ];
    const content = lines
      .map((l, i) => (i === 0 ? `(${esc(l)}) Tj` : `0 -18 Td\n(${esc(l)}) Tj`))
      .join("\n");
    const stream = `BT\n/F1 11 Tf\n50 800 Td\n${content}\nET`;
    const objs = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
      `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objs.forEach((o) => {
      offsets.push(pdf.length);
      pdf += o;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i++)
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const url = URL.createObjectURL(
      new Blob([pdf], { type: "application/pdf" }),
    );
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: "reporte_creditos.pdf",
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const liveCredit = selected
    ? credits.find((c) => c.id === selected.id) || selected
    : null;

  return (
    <div className="space-y-6">
      {/* ── TOPBAR ── */}
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-8 -mt-6 md:-mt-10 pt-4 pb-4">
        <div className="flex items-center gap-4 w-full justify-between">
          <div className="relative w-full max-w-md mt-2 md:mt-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o codigo..."
              className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-700 outline-none"
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
        </div>
      </header>

      {/* ── PAGE HEADER ── */}
      <section className="pt-2 md:pt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1
            className="text-3xl md:text-4xl font-black tracking-tight text-slate-900"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Control de Creditos
          </h1>
          <p className="mt-1 text-slate-500 text-lg max-w-2xl">
            Administracion integral de financiamientos para colaboradores del
            comisariato.
          </p>
        </div>
        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-green-800 hover:bg-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">
            download
          </span>
          Exportar Reporte
        </button>
      </section>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-green-800/20 border-l-4 border-l-green-800 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Cartera Activa
          </p>
          <h3 className="mt-1 text-3xl font-black text-slate-900">
            {fmt(totalCartera)}
          </h3>
          <p className="mt-1 text-xs font-bold text-green-700">
            Saldo pendiente total
          </p>
        </article>
        <article className="rounded-2xl border border-amber-800/20 border-l-4 border-l-amber-800 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Pagos Recaudados
          </p>
          <h3 className="mt-1 text-3xl font-black text-slate-900">
            {fmt(totalRecaudado)}
          </h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Acumulado historico
          </p>
        </article>
        <article className="rounded-2xl border border-red-800/20 border-l-4 border-l-red-700 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            En Mora
          </p>
          <h3 className="mt-1 text-3xl font-black text-slate-900">{enMora}</h3>
          <p className="mt-1 text-xs font-bold text-red-600">
            Creditos sin pago al dia
          </p>
        </article>
      </div>

      {/* ── MAIN GRID ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* FORM NUEVO CRÉDITO */}
        <article className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-800">
              <span className="material-symbols-outlined">add_card</span>
            </div>
            <h2
              className="text-3xl font-black text-slate-900"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Nuevo Credito
            </h2>
          </div>

          <div className="space-y-5">
            {/* Empleado */}
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Empleado
              </label>
              <div className="relative">
                <select
                  value={form.empleadoId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, empleadoId: e.target.value }))
                  }
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                >
                  <option value="">Seleccione un colaborador...</option>
                  {EMPLEADOS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} — {e.area}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  keyboard_arrow_down
                </span>
              </div>
            </div>

            {/* Monto + Cuotas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Monto (L)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.monto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monto: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Cuotas (max 24)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={form.cuotas}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cuotas: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            {/* Plazo */}
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Plazo de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["Quincenal", "Mensual"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, plazo: p }))}
                    className={`rounded-lg border py-3 text-sm font-bold transition-colors ${
                      form.plazo === p
                        ? "border-green-700 bg-green-800 text-white"
                        : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha inicio */}
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fechaInicio: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* Descripcion */}
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Motivo / Descripcion
              </label>
              <textarea
                rows={2}
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                placeholder="Ej: Compra de electrodomesticos..."
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 resize-none"
              />
            </div>

            {/* Calculo automatico */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm text-slate-600">Tasa de Interes</span>
                <span className="text-sm font-bold text-green-800">
                  0% (institucional)
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-600">Cuota estimada</span>
                <span className="text-3xl font-black text-green-800">
                  {montoNum > 0 ? fmt(pagoEstim) : "L 0.00"}
                </span>
              </div>
              {montoNum > 0 && (
                <p className="mt-2 text-xs italic text-slate-500">
                  {cuotasNum} cuotas de {fmt(pagoEstim)} — Total:{" "}
                  {fmt(montoNum)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAprobar}
              className="w-full rounded-xl bg-green-800 py-3.5 text-sm font-bold text-white hover:bg-green-900 shadow-md shadow-green-900/25 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                Aprobar y Crear Credito
              </span>
            </button>
          </div>
        </article>

        {/* TABLA CRÉDITOS */}
        <div className="xl:col-span-7 space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6 gap-3 flex-wrap">
              <h3
                className="text-2xl font-black text-slate-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Historial de Creditos
              </h3>
              <div className="flex gap-2 flex-wrap">
                {["Todos", "Activo", "Mora", "Pagado"].map((e) => (
                  <button
                    key={e}
                    onClick={() => setFiltroEstado(e)}
                    className={`rounded-full px-3 py-1 text-[10px] font-black transition-colors ${
                      filtroEstado === e
                        ? "bg-green-800 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {e.toUpperCase()} (
                    {e === "Todos"
                      ? credits.length
                      : credits.filter((c) => c.status === e).length}
                    )
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Empleado
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Monto / Cuota
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Saldo Pendiente
                    </th>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {creditosFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-400 text-sm"
                      >
                        Sin resultados
                      </td>
                    </tr>
                  )}
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
                        className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-8 w-1.5 rounded-full ${item.barClass}`}
                            />
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {item.employee}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.role} — {item.code}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-slate-900">
                            {fmt(item.montoTotal)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.pagadas}/{item.cuotas} cuotas —{" "}
                            {fmt(calcCuota(item.montoTotal, item.cuotas))} c/u
                          </p>
                          <div className="mt-1.5 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.barClass}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p
                            className={`text-sm font-black ${saldo > 0 ? "text-slate-900" : "text-green-700"}`}
                          >
                            {fmt(saldo)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${item.statusClass}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleViewDetail(item)}
                            className="text-slate-500 hover:text-green-800 transition-colors"
                            title="Ver detalle"
                          >
                            <span className="material-symbols-outlined text-[20px]">
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
        </div>
      </section>

      {/* ── MODAL DETALLE ── */}
      {isDetailOpen && liveCredit && (
        <div className="fixed inset-0 bg-green-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 bg-green-900 text-white flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-2xl font-black">Detalle de Credito</h3>
                <p className="text-green-200 text-[10px] font-bold uppercase tracking-widest">
                  {liveCredit.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto p-8 space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Empleado", liveCredit.employee],
                  ["Area", liveCredit.role],
                  ["Monto Total", fmt(liveCredit.montoTotal)],
                  [
                    "Cuota",
                    fmt(calcCuota(liveCredit.montoTotal, liveCredit.cuotas)),
                  ],
                  ["Plazo", liveCredit.plazo],
                  ["Inicio", liveCredit.fechaInicio],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                      {lbl}
                    </label>
                    <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700">
                      {val}
                    </div>
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                    Descripcion
                  </label>
                  <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700">
                    {liveCredit.descripcion || "—"}
                  </div>
                </div>
              </div>

              {/* Saldo + progreso */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-bold">
                    Saldo pendiente
                  </span>
                  <span
                    className={`text-2xl font-black ${calcSaldo(liveCredit.montoTotal, liveCredit.pagadas, liveCredit.cuotas) > 0 ? "text-slate-900" : "text-green-700"}`}
                  >
                    {fmt(
                      calcSaldo(
                        liveCredit.montoTotal,
                        liveCredit.pagadas,
                        liveCredit.cuotas,
                      ),
                    )}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{liveCredit.pagadas} pagadas</span>
                    <span>
                      {liveCredit.cuotas - liveCredit.pagadas} pendientes
                    </span>
                    <span>
                      {Math.round(
                        (liveCredit.pagadas / liveCredit.cuotas) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${liveCredit.barClass}`}
                      style={{
                        width: `${Math.round((liveCredit.pagadas / liveCredit.cuotas) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${liveCredit.statusClass}`}
                >
                  {liveCredit.status}
                </span>
              </div>

              {/* Historial de pagos */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
                  Historial de Pagos
                </h4>
                {liveCredit.historialPagos.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">
                    Sin pagos registrados aun.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Cuota #
                          </th>
                          <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Fecha
                          </th>
                          <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Monto
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveCredit.historialPagos.map((p, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-bold text-slate-700">
                              Cuota {p.cuota}/{liveCredit.cuotas}
                            </td>
                            <td className="px-4 py-2 text-slate-500">
                              {p.fecha}
                            </td>
                            <td className="px-4 py-2 text-right font-black text-green-700">
                              {fmt(p.monto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                {liveCredit.pagadas < liveCredit.cuotas && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(liveCredit);
                      setIsDetailOpen(false);
                      setIsPagoOpen(true);
                    }}
                    className="flex-1 bg-green-800 text-white py-3.5 rounded-2xl font-black shadow-lg hover:bg-green-900 transition-all active:scale-95 uppercase tracking-widest text-sm"
                  >
                    Registrar Pago
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REGISTRAR PAGO ── */}
      {isPagoOpen && selected && (
        <div className="fixed inset-0 bg-green-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 bg-green-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Registrar Pago</h3>
                <p className="text-green-200 text-[10px] font-bold uppercase tracking-widest">
                  Deduccion de planilla
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPagoOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1">
                <p className="text-xs text-slate-500 font-bold uppercase">
                  Empleado
                </p>
                <p className="font-black text-slate-900">{selected.employee}</p>
                <p className="text-xs text-slate-500">
                  {selected.code} — {selected.role}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">
                  Cuota {selected.pagadas + 1}/{selected.cuotas}
                </span>
                <span className="text-2xl font-black text-green-800">
                  {fmt(calcCuota(selected.montoTotal, selected.cuotas))}
                </span>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Fecha de Pago
                </label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
                Saldo restante tras este pago:{" "}
                <span className="font-black text-slate-800">
                  {fmt(
                    calcSaldo(
                      selected.montoTotal,
                      selected.pagadas + 1,
                      selected.cuotas,
                    ),
                  )}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRegistrarPago}
                  className="flex-1 bg-green-800 text-white py-3.5 rounded-2xl font-black shadow-lg hover:bg-green-900 transition-all active:scale-95 uppercase tracking-widest text-sm"
                >
                  Confirmar Pago
                </button>
                <button
                  type="button"
                  onClick={() => setIsPagoOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
