import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";
import {
  collection,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

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
  return `RES-${String(fallbackId || "").slice(0, 6).toUpperCase()}`;
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
  const items = Array.isArray(data.items) && data.items.length
    ? data.items.map((item) => ({
        ...item,
        qty: Number(item.qty || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
    : [
        {
          icon: "inventory_2",
          name: data.productoNombre || data.productoId || "Producto",
          qty: cantidad > 0 ? cantidad : 1,
          unitPrice,
        },
      ];

  return {
    firebaseId: id,
    empleado: empleadoNombre,
    empleadoId: data.empleadoId || empleadoDoc?.codigoEmpleado || "N/A",
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
  const { userName, role: authRole } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [empleadosById, setEmpleadosById] = useState({});
  const [usuariosById, setUsuariosById] = useState({});
  const [search, setSearch] = useState("");
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar reservas desde Firebase en tiempo real
  useEffect(() => {
    const empleadosRef = collection(db, "empleados");
    const unsubscribe = onSnapshot(
      empleadosRef,
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          const keys = [snapshotDoc.id, data.empleadoId, data.uid, data.usuarioId];
          keys.forEach((key) => {
            if (key) map[String(key)] = data;
          });
        });
        setEmpleadosById(map);
      },
      (err) => {
        console.error("Error cargando empleados:", err);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const usuariosRef = collection(db, "usuarios");
    const unsubscribe = onSnapshot(
      usuariosRef,
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach((snapshotDoc) => {
          const data = snapshotDoc.data();
          const keys = [snapshotDoc.id, data.uid, data.usuarioId, data.empleadoId];
          keys.forEach((key) => {
            if (key) map[String(key)] = data;
          });
        });
        setUsuariosById(map);
      },
      (err) => {
        console.error("Error cargando usuarios:", err);
      },
    );

    return () => unsubscribe();
  }, []);

  // Cargar reservas desde Firebase en tiempo real
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const reservasRef = collection(db, "creditos");
      const unsubscribe = onSnapshot(
        reservasRef,
        (snapshot) => {
          const reservasData = snapshot.docs
            .map((snapshotDoc) => ({ id: snapshotDoc.id, data: snapshotDoc.data() }))
            .filter(
              (item) =>
                isReservaState(item.data.estado, item.data.status) &&
                isReservaDoc(item.data) &&
                Boolean(empleadosById[item.data.empleadoId] || usuariosById[item.data.empleadoId]),
            )
            .map((item) => mapCreditoToReserva(item.id, item.data, empleadosById, usuariosById));
          setReservas(reservasData);
          setLoading(false);
        },
        (err) => {
          console.error("Error cargando reservas:", err);
          setError("Error al cargar las reservas");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error al configurar la escucha de reservas:", err);
      setError("Error al conectar con la base de datos");
      setLoading(false);
    }
  }, [empleadosById, usuariosById]);

  const filteredReservas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reservas;
    return reservas.filter(
      (reserva) =>
        String(reserva.empleado || "").toLowerCase().includes(term) ||
        String(reserva.orderId || "").toLowerCase().includes(term) ||
        String(reserva.empleadoId || "").toLowerCase().includes(term),
    );
  }, [reservas, search]);

  const summary = useMemo(() => {
    const pendientes = reservas.filter((r) => r.status === "Pendiente").length;
    const aprobados = reservas.filter((r) => r.status === "Aprobado").length;
    const rechazados = reservas.filter((r) => r.status === "Rechazado").length;
    const totalEstimado = reservas
      .filter((r) => r.status !== "Rechazado")
      .reduce((sum, r) => sum + getTotal(r.items), 0);

    return {
      pendientes,
      aprobados,
      rechazados,
      totalEstimado,
    };
  }, [reservas]);

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

  const handleApprove = async () => {
    if (!selectedReserva) return;

    try {
      const reservaRef = doc(db, "creditos", selectedReserva.firebaseId);
      await updateDoc(reservaRef, {
        estado: "aprobado",
        status: "Aprobado",
        observacion: "",
        observation: "",
        updatedAt: serverTimestamp(),
      });
      closeModal();
    } catch (err) {
      console.error("Error al aprobar reserva:", err);
      setError("Error al aprobar la reserva");
    }
  };

  const handleReject = async () => {
    if (!selectedReserva || !observacion.trim()) return;

    try {
      const reservaRef = doc(db, "creditos", selectedReserva.firebaseId);
      await updateDoc(reservaRef, {
        estado: "rechazado",
        status: "Rechazado",
        observacion: observacion.trim(),
        observation: observacion.trim(),
        updatedAt: serverTimestamp(),
      });
      closeModal();
    } catch (err) {
      console.error("Error al rechazar reserva:", err);
      setError("Error al rechazar la reserva");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-8 bg-gray-50 text-gray-900"
      >
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="inline-block mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
              </div>
              <p className="text-slate-600 font-medium">Cargando reservas...</p>
            </div>
          </div>
        ) : (
          <>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            <div className="text-right">
              <p className="text-sm font-semibold text-green-800 uppercase leading-tight">
                {userName || "Comisariato Pro"}
              </p>
              <p className="text-[10px] font-medium text-slate-500 capitalize leading-tight">
                {authRole || "Admin"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="pt-2 md:pt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2
            className="text-3xl font-black text-slate-900 tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Reservas
          </h2>
          <p className="text-slate-500 font-medium">
            Gestion de reservas y validacion de pedidos desde la app movil.
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
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100/70 text-green-800">
                  <span className="material-symbols-outlined">pending_actions</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Pendientes</p>
                  <p className="text-xl font-black text-slate-900">{summary.pendientes} pedidos</p>
                </div>
              </div>
              <span className="font-bold text-green-700">Por revisar</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Aprobados</p>
                  <p className="text-xl font-black text-slate-900">{summary.aprobados} pedidos</p>
                </div>
              </div>
              <span className="font-bold text-emerald-600">Procesados</span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <span className="material-symbols-outlined">cancel</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Rechazados</p>
                  <p className="text-xl font-black text-slate-900">{summary.rechazados} pedidos</p>
                </div>
              </div>
              <span className="font-bold text-red-600">Con observacion</span>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-green-800">{formatCurrency(summary.totalEstimado)}</span>
              <span className="text-sm font-bold text-slate-500">Total Estimado</span>
            </div>
          </div>
        </article>

        <div className="col-span-12 lg:col-span-8 space-y-8">
          <article className="rounded-3xl bg-slate-100 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h5
                className="text-lg font-bold text-slate-900"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Lista de Reservas
              </h5>
              <button className="text-xs font-bold text-green-800 hover:underline">
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
                      <span className="material-symbols-outlined">person</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{reserva.empleado}</p>
                      <p className="text-xs text-slate-500">
                        ID #{reserva.orderId} - {reserva.items.length} productos
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
                      <span className="material-symbols-outlined text-base">visibility</span>
                      Revisar
                    </button>
                  </div>
                </div>
              ))}

              {filteredReservas.length === 0 && (
                <div className="rounded-2xl bg-white p-8 text-center text-sm font-medium text-slate-500">
                  No se encontraron reservas con el criterio de busqueda.
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
          </>
        )}
      </motion.div>

      {showModal && selectedReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
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
                <p className="text-sm text-slate-500">
                  ID #{selectedReserva.empleadoId}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Pedido
                </p>
                <p className="text-sm font-black text-green-800">#{selectedReserva.orderId}</p>
              </div>
            </div>

            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-center">Cant.</th>
                    <th className="px-4 py-3 text-right">Unitario</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {selectedReserva.items.map((item) => (
                    <tr key={item.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.qty * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-green-50/70">
                    <td
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-green-800"
                      colSpan="3"
                    >
                      Total a Descontar de Planilla
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-black text-green-800">
                      {formatCurrency(getTotal(selectedReserva.items))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {selectedReserva.status === "Rechazado" && selectedReserva.observation && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-red-700">
                  Observacion de Rechazo
                </p>
                <p className="mt-2 text-sm font-medium text-red-800">{selectedReserva.observation}</p>
              </div>
            )}

            {isRejecting && selectedReserva.status === "Pendiente" && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-amber-800">
                  Observaciones del rechazo
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  className="h-24 w-full resize-none rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Describe claramente el motivo del rechazo..."
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
                    <button
                      onClick={() => setIsRejecting(true)}
                      className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-200"
                    >
                      Rechazar Pedido
                    </button>
                  ) : (
                    <button
                      onClick={handleReject}
                      disabled={!observacion.trim()}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirmar Rechazo
                    </button>
                  )}

                  <button
                    onClick={handleApprove}
                    className="rounded-2xl bg-gradient-to-r from-green-900 to-green-700 px-4 py-3 text-sm font-bold text-white"
                  >
                    Aprobar Pedido
                  </button>
                </>
              ) : (
                <div className="md:col-span-2 flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                  Reserva ya procesada: {selectedReserva.status}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
