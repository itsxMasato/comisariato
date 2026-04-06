import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";
import {
  collection,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";


const formatCurrency = (value) =>
  `L ${Number(value).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getTotal = (items) =>
  items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

const normalizeStatus = (estado, status) => {
  const raw = String(estado || status || "pendiente").toLowerCase();
  if (raw === "aprobado") return "Aprobado";
  if (raw === "rechazado") return "Rechazado";
  if (raw === "activo" || raw === "pagado") return "Aprobado";
  return "Pendiente";
};

const isReservaState = (estado, status) => {
  const raw = String(estado || status || "").toLowerCase();
  return raw === "pendiente" || raw === "aprobado" || raw === "rechazado";
};

const isReservaDoc = (data) => {
  const hasEmpleado = Boolean(data.empleadoId);
  const hasProducto = Boolean(data.productoId || data.nombreProducto);
  const hasCantidad = Number.isFinite(Number(data.cantidad));
  const hasTotal = Number.isFinite(Number(data.total));
  const hasTipoPago = Boolean(data.tipoPago);
  return hasEmpleado && hasProducto && hasCantidad && hasTotal && hasTipoPago;
};

const fullEmployeeName = (empleadoDoc) => {
  if (!empleadoDoc) return "";
  const nombreCompleto = [empleadoDoc.nombres, empleadoDoc.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (nombreCompleto) return nombreCompleto;
  return empleadoDoc.nombre || empleadoDoc.displayName || "";
};

const formatCreatedAt = (createdAt, fecha, fallbackId) => {
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleString("es-HN");
  }
  if (createdAt instanceof Date) {
    return createdAt.toLocaleString("es-HN");
  }
  if (typeof createdAt === "string" && createdAt.trim()) {
    return createdAt;
  }
  if (typeof fecha === "string" && fecha.trim()) {
    return fecha;
  }
  return `RES-${String(fallbackId || "")
    .slice(0, 6)
    .toUpperCase()}`;
};

const mapCreditoToReserva = (id, data, empleadosById, usuariosById) => {
  const empleadoDoc = empleadosById[data.empleadoId] || null;
  const usuarioDoc = usuariosById[data.empleadoId] || null;
  const empleadoNombre =
    data.empleado ||
    data.empleadoNombre ||
    fullEmployeeName(empleadoDoc) ||
    usuarioDoc?.nombre ||
    usuarioDoc?.nombres ||
    data.empleadoId ||
    "Empleado";
  const cantidad = Number(data.cantidad || 0);
  const total = Number(data.total || 0);
  const unitPrice = cantidad > 0 ? total / cantidad : total;
  const items =
    Array.isArray(data.items) && data.items.length
      ? data.items.map((item) => ({
        ...item,
        productoId: item.productoId || item.id || data.productoId || null,
        qty: Number(item.qty || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
      : [
        {
          icon: "inventory_2",
          name: data.productoNombre || data.productoId || "Producto",
          productoId: data.productoId || null,
          qty: cantidad > 0 ? cantidad : 1,
          unitPrice,
        },
      ];

  return {
    firebaseId: id,
    empleadoId: data.empleadoId,
    empleado: empleadoNombre,
    orderId: data.orderId || `RES-${String(id).slice(0, 6).toUpperCase()}`,
    createdAt: formatCreatedAt(data.createdAt, data.fecha, id),
    status: normalizeStatus(data.estado, data.status),
    observation: data.observation || data.observacion || "",
    items,
  };
};

const statusClass = {
  Pendiente: "bg-amber-100 text-amber-800",
  Aprobado: "bg-emerald-100 text-emerald-700",
  Rechazado: "bg-red-100 text-red-700",
};

export default function Reservas() {
  const [viewHistory, setViewHistory] = useState(null);
  const [userHistory, setUserHistory] = useState([]);

  useEffect(() => {
    if (!viewHistory) {
      setUserHistory([]);
      return;
    }

    // Buscamos todos los créditos/reservas de este empleadoId
    const unsubHistory = onSnapshot(collection(db, "creditos"), (snapshot) => {
      const records = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Filtramos por el ID del empleado que viene en la reserva
        .filter(doc => doc.empleadoId === viewHistory.empleadoId);

      // Ordenar por fecha descendente
      const sorted = records.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUserHistory(sorted);
    });

    return () => unsubHistory();
  }, [viewHistory]);

  const { userName, role: authRole } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [empleadosById, setEmpleadosById] = useState({});
  const [usuariosById, setUsuariosById] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pendiente");
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos en tiempo real
  useEffect(() => {
    const empleadosRef = collection(db, "empleados");
    const unsubscribe = onSnapshot(empleadosRef, (snapshot) => {
      const map = {};
      snapshot.docs.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        const keys = [
          snapshotDoc.id,
          data.empleadoId,
          data.uid,
          data.usuarioId,
        ];
        keys.forEach((key) => {
          if (key) map[String(key)] = data;
        });
      });
      setEmpleadosById(map);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usuariosRef = collection(db, "usuarios");
    const unsubscribe = onSnapshot(usuariosRef, (snapshot) => {
      const map = {};
      snapshot.docs.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        const keys = [
          snapshotDoc.id,
          data.uid,
          data.usuarioId,
          data.empleadoId,
        ];
        keys.forEach((key) => {
          if (key) map[String(key)] = data;
        });
      });
      setUsuariosById(map);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(true);
    const reservasRef = collection(db, "creditos");
    const unsubscribe = onSnapshot(reservasRef, (snapshot) => {
      const reservasData = snapshot.docs
        .map((snapshotDoc) => ({
          id: snapshotDoc.id,
          data: snapshotDoc.data(),
        }))
        .filter(
          (item) =>
            isReservaState(item.data.estado, item.data.status) &&
            isReservaDoc(item.data) &&
            Boolean(
              empleadosById[item.data.empleadoId] ||
              usuariosById[item.data.empleadoId],
            ),
        )
        .map((item) =>
          mapCreditoToReserva(item.id, item.data, empleadosById, usuariosById),
        );
      setReservas(reservasData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [empleadosById, usuariosById]);

  const filteredReservas = useMemo(() => {
    let list = reservas;
    if (statusFilter !== "Todas") {
      list = reservas.filter((r) => r.status === statusFilter);
    }
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (reserva) =>
        String(reserva.empleado || "")
          .toLowerCase()
          .includes(term) ||
        String(reserva.orderId || "")
          .toLowerCase()
          .includes(term),
    );
  }, [reservas, search, statusFilter]);

  const summary = useMemo(() => {
    const pendientes = reservas.filter((r) => r.status === "Pendiente").length;
    const aprobados = reservas.filter((r) => r.status === "Aprobado").length;
    const rechazados = reservas.filter((r) => r.status === "Rechazado").length;
    const totalEstimado = reservas
      .filter((r) => r.status !== "Rechazado")
      .reduce((sum, r) => sum + getTotal(r.items), 0);
    return { pendientes, aprobados, rechazados, totalEstimado };
  }, [reservas]);

  // LOGICA PDF (DISEÑO A4)
  const handleExportReport = () => {
    const dateStr = new Date().toLocaleDateString("es-HN");
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Reporte de Reservas - Comisariato Pro</title>
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
              <span class="font-headline uppercase tracking-widest text-[11px] font-bold text-[#14532d] mt-1">REPORTE DE RESERVAS - ${dateStr}</span>
            </div>
          </header>

          <section class="grid grid-cols-3 gap-4 mb-10">
            <div class="bg-[#f2f4f2] p-4 border-l-4 border-[#14532d]">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500">Total Estimado</p>
              <p class="text-lg font-bold text-[#14532d]">${formatCurrency(summary.totalEstimado)}</p>
            </div>
            <div class="bg-[#f2f4f2] p-4 border-l-4 border-amber-500">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500">Pendientes</p>
              <p class="text-lg font-bold text-amber-700">${summary.pendientes}</p>
            </div>
            <div class="bg-[#f2f4f2] p-4 border-l-4 border-emerald-500">
              <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500">Aprobados</p>
              <p class="text-lg font-bold text-emerald-700">${summary.aprobados}</p>
            </div>
          </section>

          <section class="flex-grow">
            <table class="w-full text-left border-collapse">
              <thead class="bg-[#e1e3e1]">
                <tr>
                  <th class="px-3 py-3 font-headline font-bold text-[9px] uppercase tracking-wider text-[#14532d]">ID Pedido</th>
                  <th class="px-3 py-3 font-headline font-bold text-[9px] uppercase tracking-wider text-[#14532d]">Empleado</th>
                  <th class="px-3 py-3 font-headline font-bold text-[9px] uppercase tracking-wider text-[#14532d]">Fecha</th>
                  <th class="px-3 py-3 font-headline font-bold text-[9px] uppercase tracking-wider text-[#14532d] text-right">Total</th>
                  <th class="px-3 py-3 font-headline font-bold text-[9px] uppercase tracking-wider text-[#14532d] text-center">Estado</th>
                </tr>
              </thead>
              <tbody class="text-[10px]">
                ${filteredReservas
        .map(
          (r) => `
                  <tr class="border-b border-gray-100">
                    <td class="px-3 py-3 font-mono text-gray-400">${r.orderId}</td>
                    <td class="px-3 py-3 font-bold text-gray-800">${r.empleado}</td>
                    <td class="px-3 py-3 text-gray-500">${r.createdAt}</td>
                    <td class="px-3 py-3 text-right font-bold text-[#14532d]">${formatCurrency(getTotal(r.items))}</td>
                    <td class="px-3 py-3 text-center uppercase font-black text-[8px] tracking-tighter">
                      <span class="${r.status === "Aprobado" ? "text-emerald-600" : r.status === "Rechazado" ? "text-red-600" : "text-amber-600"}">${r.status}</span>
                    </td>
                  </tr>
                `,
        )
        .join("")}
              </tbody>
            </table>
          </section>

          <footer class="mt-auto border-t border-gray-100 pt-10 text-center">
             <p class="text-[8px] text-gray-400 uppercase tracking-widest font-bold">Documento de control interno - Comisariato Pro</p>
          </footer>
        </div>
        <div class="fixed bottom-8 right-8 no-print">
          <button onclick="window.print()" class="bg-[#14532d] text-white px-8 py-3 rounded-full font-bold shadow-xl">Imprimir Reporte</button>
        </div>
      </body>
      </html>
    `;
    const printWin = window.open("", "_blank");
    printWin.document.write(reportHtml);
    printWin.document.close();
  };

  const openModal = (reserva) => {
    setSelectedReserva(reserva);
    setShowModal(true);
    setIsRejecting(false);
    setObservacion("");
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedReserva(null);
    setIsRejecting(false);
    setObservacion("");
  };

  const handleApprove = () => {
    if (!selectedReserva) return;
    setConfirmAction({ type: "approve" });
  };

  const handleReject = () => {
    if (!selectedReserva || !observacion.trim()) return;
    setConfirmAction({ type: "reject" });
  };

  const executeApprove = async () => {
    try {
      await updateDoc(doc(db, "creditos", selectedReserva.firebaseId), {
        estado: "aprobado",
        status: "Aprobado",
        tipoModificacion: "Aprobación de Crédito",
        usuarioModifico: auth.currentUser?.email || "Admin",
        updatedDate: serverTimestamp(),
      });

      closeModal();
    } catch (err) {
      console.error(err);
      setError("Error al aprobar");
    }
  };

  const executeReject = async () => {
    try {
      await updateDoc(doc(db, "creditos", selectedReserva.firebaseId), {
        estado: "rechazado",
        status: "Rechazado",
        observation: observacion.trim(),
        tipoModificacion: "Cambio de Estado de Solicitud a Rechazada",
        usuarioModifico: auth.currentUser?.email || "Admin",
        updatedDate: serverTimestamp(),
      });

      if (selectedReserva.items && selectedReserva.items.length > 0) {
        for (const item of selectedReserva.items) {
          const targetId = item.productoId || item.id;
          const qtyToReturn = Number(item.qty);
          if (targetId && qtyToReturn > 0) {
            const propRef = doc(db, "productos", targetId);
            await updateDoc(propRef, {
              stock: increment(qtyToReturn)
            }).catch(e => console.error("Error stock devolver", e));
          }
        }
      }

      closeModal();
    } catch (err) {
      setError("Error al rechazar");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 bg-gray-50 text-gray-900"
      >
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
          </div>
        ) : (
          <>
            <section className="pt-2 md:pt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col md:flex-row md:items-end gap-6 w-full lg:w-auto">
                <div>
                  <h2
                    className="text-3xl font-black text-slate-900 tracking-tight"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    Reservas
                  </h2>
                  <p className="text-slate-500 font-medium">
                    Gestion de reservas y validacion de pedidos desde la app
                    movil.
                  </p>
                </div>
                <div className="relative w-full md:max-w-xs mt-2 md:mt-0">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    search
                  </span>
                  <input
                    className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-700"
                    placeholder="Buscar reservas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportReport}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-green-900 to-green-700 px-8 py-3 text-sm font-bold text-white shadow-lg"
                >
                  <span className="material-symbols-outlined text-lg">
                    download
                  </span>
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
                </div>

                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100/70 text-green-800">
                        <span className="material-symbols-outlined">
                          pending_actions
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Pendientes
                        </p>
                        <p className="text-xl font-black text-slate-900">
                          {summary.pendientes} pedidos
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-green-700">
                      Por revisar
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <span className="material-symbols-outlined">
                          check_circle
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Aprobados
                        </p>
                        <p className="text-xl font-black text-slate-900">
                          {summary.aprobados} pedidos
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600">
                      Procesados
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                        <span className="material-symbols-outlined">
                          cancel
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Rechazados
                        </p>
                        <p className="text-xl font-black text-slate-900">
                          {summary.rechazados} pedidos
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-red-600">
                      Con observacion
                    </span>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-green-800">
                      {formatCurrency(summary.totalEstimado)}
                    </span>
                    <span className="text-sm font-bold text-slate-500">
                      Total Estimado
                    </span>
                  </div>
                </div>
              </article>

              <div className="col-span-12 lg:col-span-8 space-y-8">
                <article className="rounded-3xl bg-slate-100 p-8">
                  <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h5 className="text-lg font-bold text-slate-900 font-headline hidden sm:block">
                        Lista de Reservas
                      </h5>
                      <div className="flex bg-slate-200/50 p-1 rounded-xl">
                        {["Pendiente", "Aprobado", "Rechazado", "Todas"].map(s => (
                          <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="text-xs font-bold text-green-800 hover:underline hidden md:block">
                      {filteredReservas.length} registros
                    </button>
                  </div>
                  <div className="space-y-4">
                    {filteredReservas.map((reserva) => (
                      <div
                        key={reserva.firebaseId}
                        className="flex flex-col gap-4 rounded-2xl bg-white p-4 transition-shadow hover:shadow-md md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                            <span className="material-symbols-outlined">
                              person
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {reserva.empleado}
                            </p>
                            <p className="text-xs text-slate-500">
                              ID #{reserva.orderId} - {reserva.items.length}{" "}
                              productos
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 md:justify-end">
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900">
                              {formatCurrency(getTotal(reserva.items))}
                            </p>
                            <p className="text-[10px] font-bold uppercase text-slate-500">
                              {reserva.createdAt}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusClass[reserva.status]}`}
                          >
                            {reserva.status}
                          </span>

                          <button
                            onClick={() => openModal(reserva)}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-800 px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
                          >
                            <span className="material-symbols-outlined text-base">
                              visibility
                            </span>{" "}
                            Revisar
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredReservas.length === 0 && (
                      <div className="rounded-2xl bg-white p-8 text-center text-sm font-medium text-slate-500">
                        No se encontraron reservas.
                      </div>
                    )}
                  </div>
                </article>
              </div>
            </section>
          </>
        )}
      </motion.div>

      <SidePanel
        open={!!viewHistory}
        onClose={() => setViewHistory(null)}
        title="Historial de Créditos"
      >
        {viewHistory && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 font-black">
                {viewHistory.empleado.charAt(0)}
              </div>
              <div>
                <p className="font-black text-slate-900 text-base leading-tight">{viewHistory.empleado}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditoría de Cuenta</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {userHistory.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase">Sin registros previos</p>
              ) : (
                userHistory.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${normalizeStatus(item.estado, item.status) === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                        normalizeStatus(item.estado, item.status) === 'Rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {normalizeStatus(item.estado, item.status)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Reciente'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{item.productoNombre || "Compra Comisariato"}</p>
                    <p className="text-lg font-black text-green-800 mt-1">{formatCurrency(item.total || 0)}</p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setViewHistory(null)}
              className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
            >
              Cerrar Historial
            </button>
          </div>
        )}
      </SidePanel>




      {/* MODAL MANTENIDO INTACTO */}
      {showModal && selectedReserva && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 transition-all duration-300 ${viewHistory ? 'lg:pr-[420px]' : ''}`}>
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl md:p-8 transition-all duration-300">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Revision de Reserva
                </p>
                <h4
                  className="text-2xl font-extrabold text-slate-900"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {selectedReserva.empleado}
                </h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewHistory(selectedReserva)}
                  className="rounded-xl bg-emerald-50 text-emerald-700 p-2 hover:bg-emerald-100 flex items-center gap-2 px-4 shadow-sm font-bold text-[10px] uppercase tracking-widest transition-colors"
                >
                  <span className="material-symbols-outlined text-base">history</span> Ver Historial
                </button>
                <button
                  onClick={closeModal}
                  className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 text-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-center">Cant.</th>
                    <th className="px-4 py-3 text-right">Unitario</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReserva.items.map((item) => (
                    <tr key={item.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-700">
                        {item.qty}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.qty * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-green-50/70 font-bold">
                    <td
                      className="px-4 py-3 text-right text-xs uppercase tracking-widest text-green-800"
                      colSpan="3"
                    >
                      Total a Descontar
                    </td>
                    <td className="px-4 py-3 text-right text-lg text-green-800">
                      {formatCurrency(getTotal(selectedReserva.items))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {isRejecting && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-amber-800">
                  Observaciones del rechazo
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="h-24 w-full resize-none rounded-xl border border-amber-200 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Motivo del rechazo..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                onClick={closeModal}
                className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-300"
              >
                Cerrar
              </button>
              {selectedReserva.status === "Pendiente" ? (
                <>
                  {!isRejecting ? (
                    <>
                      <button
                        onClick={() => setIsRejecting(true)}
                        className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-200"
                      >
                        Rechazar Pedido
                      </button>
                      <button
                        onClick={handleApprove}
                        className="rounded-2xl bg-gradient-to-r from-green-900 to-green-700 px-4 py-3 text-sm font-bold text-white"
                      >
                        Aprobar Pedido
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleReject}
                      disabled={!observacion.trim()}
                      className="md:col-span-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Confirmar Rechazo
                    </button>
                  )}
                </>
              ) : (
                <div className="md:col-span-2 flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                  Procesada: {selectedReserva.status}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANTENIDO INTACTO (FIN) */}

      {/* CONFIRMATION OVERLAY */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[2px]">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-slate-100"
          >
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${confirmAction.type === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <span className="material-symbols-outlined text-3xl">
                {confirmAction.type === 'approve' ? 'check_circle' : 'warning'}
              </span>
            </div>
            <h4 className="mb-2 text-xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
              {confirmAction.type === 'approve' ? '¿Aprobar Reserva?' : '¿Rechazar Reserva?'}
            </h4>
            <p className="mb-8 text-sm text-slate-500 leading-relaxed font-medium">
              {confirmAction.type === 'approve'
                ? 'El empleado recibirá los productos de esta lista y se aplicarán los descuentos automáticos correspondientes. Esta acción es definitiva.'
                : 'Esta acción de rechazo cancelará la reserva, devolverá el crédito del empleado a su estado original y se le notificará.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'approve') executeApprove();
                  else executeReject();
                  setConfirmAction(null);
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 ${confirmAction.type === 'approve' ? 'bg-green-700 hover:bg-green-800 shadow-green-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'}`}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// Componente utilitario SidePanel añadido
function SidePanel({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-2xl z-[60] p-8 flex flex-col gap-6 border-l border-slate-200"
        >
          <div className="flex items-center justify-between">
            <h3
              className="text-xl font-bold text-green-900"
              style={{ fontFamily: "Manrope,sans-serif" }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
