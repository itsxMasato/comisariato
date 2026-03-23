import React, { useState } from "react";

const RECENT_HISTORY = [
  {
    employee: "Ricardo Mendoza",
    role: "Cosecha",
    code: "#CR-8821",
    amount: "L 1,200.00",
    installments: "12 cuotas / L 100.00",
    status: "Activo",
    statusClass: "bg-green-100 text-green-800",
    barClass: "bg-green-700",
  },
  {
    employee: "Elena Soriano",
    role: "Empaque",
    code: "#CR-8710",
    amount: "L 450.00",
    installments: "6 cuotas / L 75.00",
    status: "Pagado",
    statusClass: "bg-slate-100 text-slate-600",
    barClass: "bg-slate-500",
  },
  {
    employee: "Samuel Vargas",
    role: "Riego",
    code: "#CR-8815",
    amount: "L 2,500.00",
    installments: "24 cuotas / L 104.16",
    status: "Activo",
    statusClass: "bg-green-100 text-green-800",
    barClass: "bg-green-700",
  },
];

export default function Creditos() {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);

  const handleViewDetail = (item) => {
    setSelectedCredit(item);
    setIsDetailOpen(true);
  };

  const handleExportReport = () => {
    const sanitize = (text) =>
      String(text)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "?");

    const escapePdf = (text) => sanitize(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

    const lines = [
      "Reporte de Creditos - Comisariato Pro",
      `Fecha: ${new Date().toLocaleDateString("es-HN")}`,
      "",
      "Codigo | Empleado | Area | Monto | Cuotas | Estado",
      "----------------------------------------------------------------",
      ...RECENT_HISTORY.map(
        (item) =>
          `${item.code} | ${item.employee} | ${item.role} | ${item.amount} | ${item.installments} | ${item.status}`,
      ),
    ];

    const contentLines = [];
    lines.forEach((line, index) => {
      if (index === 0) {
        contentLines.push(`(${escapePdf(line)}) Tj`);
      } else {
        contentLines.push("0 -18 Td");
        contentLines.push(`(${escapePdf(line)}) Tj`);
      }
    });

    const stream = `BT\n/F1 12 Tf\n50 800 Td\n${contentLines.join("\n")}\nET`;

    const objects = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
      `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ];

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += obj;
    });

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte_creditos.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-8 -mt-6 md:-mt-10 pt-4 pb-4">
        <div className="flex items-center gap-4 w-full justify-between">
          <div className="relative w-full max-w-md mt-2 md:mt-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
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
          <span className="material-symbols-outlined text-[18px]">download</span>
          Exportar Reporte
        </button>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
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

          <form className="space-y-5">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Empleado
              </label>
              <div className="relative">
                <select className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100">
                  <option>Seleccione un colaborador...</option>
                  <option>Ricardo Mendoza</option>
                  <option>Elena Soriano</option>
                  <option>Samuel Vargas</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  keyboard_arrow_down
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Monto Solicitado
                </label>
                <input
                  type="text"
                  defaultValue="L 0.00"
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Cuotas
                </label>
                <input
                  type="text"
                  defaultValue="Max. 24"
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-wider text-slate-500">
                Plazo de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Quincenal
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Mensual
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-sm text-slate-600">Tasa de Interes</span>
                <span className="text-sm font-bold text-green-800">0% (institucional)</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-600">Pago Estimado</span>
                <span className="text-3xl font-black text-green-800">L 125.00</span>
              </div>
              <p className="mt-2 text-xs italic text-slate-500">
                Calculo automatico basado en cuotas
              </p>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-green-800 py-3.5 text-sm font-bold text-white hover:bg-green-900 shadow-md shadow-green-900/25 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Aprobar y Crear Credito
              </span>
            </button>
          </form>
        </article>

        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-green-800/20 border-l-4 border-l-green-800 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Cartera Activa
              </p>
              <h3 className="mt-1 text-4xl font-black text-slate-900">L 45,200.00</h3>
              <p className="mt-1 text-xs font-bold text-green-700">+ 12% este mes</p>
            </article>

            <article className="rounded-2xl border border-amber-800/20 border-l-4 border-l-amber-800 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Pagos Recaudados
              </p>
              <h3 className="mt-1 text-4xl font-black text-slate-900">L 8,150.00</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">Ult. 30 dias</p>
            </article>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
              <h3
                className="text-3xl font-black text-slate-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Historial Reciente
              </h3>
              <div className="flex gap-2">
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black text-green-800">
                  ACTIVOS (12)
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                  PAGADOS (84)
                </span>
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
                      Monto/Cuotas
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
                  {RECENT_HISTORY.map((item) => (
                    <tr key={item.code} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-1.5 rounded-full ${item.barClass}`} />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.employee}</p>
                            <p className="text-xs text-slate-500">
                              {item.role} - {item.code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-900">{item.amount}</p>
                        <p className="text-xs text-slate-500">{item.installments}</p>
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
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 text-center">
              <button className="inline-flex items-center gap-1 text-sm font-bold text-green-800 hover:text-green-700 transition-colors">
                Ver todos los registros
                <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      {isDetailOpen && selectedCredit && (
        <div className="fixed inset-0 bg-green-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-8 bg-green-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">Detalle de Credito</h3>
                <p className="text-green-200 text-[10px] font-bold uppercase tracking-widest">
                  Informacion del financiamiento
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

            <div className="p-10 space-y-5">
              <div className="grid grid-cols-12 gap-5">
                <div className="col-span-12">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Empleado
                  </label>
                  <input
                    readOnly
                    value={selectedCredit.employee}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none text-sm font-bold text-slate-700"
                  />
                </div>

                <div className="col-span-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Codigo
                  </label>
                  <input
                    readOnly
                    value={selectedCredit.code}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none text-sm font-bold text-slate-700"
                  />
                </div>

                <div className="col-span-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Area
                  </label>
                  <input
                    readOnly
                    value={selectedCredit.role}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none text-sm font-bold text-slate-700"
                  />
                </div>

                <div className="col-span-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Monto
                  </label>
                  <input
                    readOnly
                    value={selectedCredit.amount}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none text-sm font-bold text-slate-700"
                  />
                </div>

                <div className="col-span-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Estado
                  </label>
                  <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${selectedCredit.statusClass}`}
                    >
                      {selectedCredit.status}
                    </span>
                  </div>
                </div>

                <div className="col-span-12">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">
                    Cuotas
                  </label>
                  <input
                    readOnly
                    value={selectedCredit.installments}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none text-sm font-bold text-slate-700"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="w-full bg-green-800 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-green-900 transition-all active:scale-95 uppercase tracking-widest mt-4"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
