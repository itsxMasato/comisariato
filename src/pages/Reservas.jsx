import React from "react";

const weeklySummary = [
  {
    title: "Pendientes",
    value: "24 Pedidos",
    delta: "+12%",
    icon: "pending_actions",
    iconClass: "bg-green-100/70 text-green-800",
    deltaClass: "text-green-700",
  },
  {
    title: "Aprobados",
    value: "158 Pedidos",
    delta: "+5%",
    icon: "check_circle",
    iconClass: "bg-emerald-100 text-emerald-700",
    deltaClass: "text-emerald-600",
  },
  {
    title: "Rechazados",
    value: "12 Pedidos",
    delta: "-2%",
    icon: "cancel",
    iconClass: "bg-red-100 text-red-600",
    deltaClass: "text-red-600",
  },
];

const featuredItems = [
  {
    icon: "wb_sunny",
    name: "Kit de Proteccion Solar Premium",
    qty: "01",
    unitPrice: "L 12.50",
    subtotal: "L 12.50",
  },
  {
    icon: "restaurant",
    name: "Bono Almuerzo Ejecutivo (Semanal)",
    qty: "05",
    unitPrice: "L 8.00",
    subtotal: "L 40.00",
  },
];

const queueOrders = [
  {
    name: "Elena Patricia Ruiz",
    detail: "3 productos - ID #ORD-99209",
    amount: "L 84.20",
    time: "hace 15 min",
  },
  {
    name: "Samuel Antonio Sosa",
    detail: "1 producto - ID #ORD-99208",
    amount: "L 15.00",
    time: "hace 32 min",
  },
  {
    name: "Veronica Cedeño",
    detail: "2 productos - ID #ORD-99207",
    amount: "L 29.75",
    time: "hace 1 hora",
  },
];

export default function Reservas() {
  return (
    <div className="space-y-8 bg-gray-50 text-gray-900">
      <header className="sticky top-0 -mx-6 md:-mx-10 px-6 md:px-10 h-16 flex justify-between items-center z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-8 -mt-6 md:-mt-10 pt-4 pb-4">
        <div className="flex items-center justify-between gap-4 w-full">
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

          <div className="hidden md:flex items-center gap-6 shrink-0">
            <div className="flex gap-4">
              <button className="text-slate-600 hover:text-green-900 transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="text-slate-600 hover:text-green-900 transition-all">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <span className="text-sm font-semibold text-green-800">Comisariato Pro</span>
          </div>
        </div>
      </header>

      <section className="pt-2 md:pt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            className="text-4xl font-extrabold tracking-tight text-green-900"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Gestion de Reservas
          </h2>
          <p className="mt-2 font-medium text-slate-500">
            Control centralizado de pedidos realizados desde la app movil.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-300 transition-colors">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filtros
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-green-900 to-green-700 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20 transition-colors hover:from-green-800 hover:to-green-700">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar Reporte
          </button>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-8">
        <article className="col-span-12 lg:col-span-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-900">
                Resumen Semanal
              </span>
              <h3
                className="mt-1 text-2xl font-bold text-slate-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Estado General
              </h3>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
              Semana 42
            </span>
          </div>

          <div className="flex-1 space-y-6">
            {weeklySummary.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconClass}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {item.title}
                    </p>
                    <p className="text-xl font-black text-slate-900">{item.value}</p>
                  </div>
                </div>
                <span className={`font-bold ${item.deltaClass}`}>{item.delta}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-green-800">L 4,250.00</span>
              <span className="text-sm font-bold text-slate-500">Total Estimado</span>
            </div>
          </div>
        </article>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <article className="rounded-3xl bg-gradient-to-br from-white to-slate-100 p-1 shadow-xl shadow-green-900/5">
            <div className="rounded-[1.4rem] bg-white/80 p-8 backdrop-blur-xl">
              <div className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 shadow-md text-green-800">
                      <span className="material-symbols-outlined text-[2.2rem]">person</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 rounded-lg border-2 border-white bg-green-800 p-1.5 text-white">
                      <span className="material-symbols-outlined text-sm">verified</span>
                    </div>
                  </div>

                  <div>
                    <h4
                      className="text-2xl font-extrabold text-slate-900"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      Carlos Eduardo Mendez
                    </h4>
                    <p className="font-medium text-slate-500">
                      ID: #EMP-4829 - Planta Procesadora 1
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">
                        Turno A
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">
                        Cane Fields Dept
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left xl:text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Pedido No.
                  </span>
                  <p className="text-xl font-black text-green-800">#ORD-99210</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Hoy, 09:42 AM</p>
                </div>
              </div>

              <div className="mb-8 overflow-hidden rounded-2xl bg-slate-50">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4 text-center">Cant.</th>
                      <th className="px-6 py-4 text-right">Unitario</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {featuredItems.map((item) => (
                      <tr key={item.name} className="transition-colors hover:bg-slate-100">
                        <td className="flex items-center gap-3 px-6 py-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
                            <span className="material-symbols-outlined text-sm text-green-800">
                              {item.icon}
                            </span>
                          </div>
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-center">{item.qty}</td>
                        <td className="px-6 py-4 text-right">{item.unitPrice}</td>
                        <td className="px-6 py-4 text-right font-bold">{item.subtotal}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50/70">
                      <td className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-green-800" colSpan="3">
                        Total a Descontar de Planilla
                      </td>
                      <td className="px-6 py-4 text-right text-xl font-black text-green-800">
                        L 52.50
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <button className="group relative overflow-hidden rounded-2xl bg-slate-200 h-16 transition-all hover:bg-red-100 flex items-center justify-center gap-3">
                  <div className="absolute inset-0 translate-y-full bg-red-600/10 transition-transform duration-300 group-hover:translate-y-0" />
                  <span className="material-symbols-outlined relative z-10 text-red-600">close</span>
                  <span className="relative z-10 font-bold text-red-600">Rechazar Pedido</span>
                </button>
                <button className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-900 to-green-700 text-white shadow-xl shadow-green-900/20 transition-transform active:scale-[0.98]">
                  <span className="material-symbols-outlined">check</span>
                  <span className="text-lg font-bold">Aprobar Pedido</span>
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-3xl bg-slate-100 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h5
                className="text-lg font-bold text-slate-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Proximos en Fila
              </h5>
              <button className="text-xs font-bold text-green-800 hover:underline">
                Ver todos los pendientes
              </button>
            </div>

            <div className="space-y-4">
              {queueOrders.map((order) => (
                <div
                  key={order.name}
                  className="flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{order.name}</p>
                      <p className="text-xs text-slate-500">{order.detail}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{order.amount}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      {order.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
