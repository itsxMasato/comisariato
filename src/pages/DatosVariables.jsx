import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

export default function DatosVariables() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    fechaPago: "30",
    porcentajeSueldo: 15,
    porcentajeInteres: 0,
    minimoAccesoCredito: 3,
    minimoReservaCredito: 300,
  });

  const [departamentos, setDepartamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isDeptoModalOpen, setIsDeptoModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const paramDoc = await getDoc(doc(db, "parametros", "general"));
        if (paramDoc.exists()) {
          const data = paramDoc.data();
          setFormData({
            fechaPago: data.fechaPago || "30",
            porcentajeSueldo: data.porcentajeSueldo || 15,
            porcentajeInteres: data.porcentajeInteres || 0,
            minimoAccesoCredito: data.minimoAccesoCredito || 3,
            minimoReservaCredito: data.minimoReservaCredito !== undefined ? data.minimoReservaCredito : 300,
          });
        }
      } catch (error) {
        console.error("Error al cargar parámetros:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchParams();

    const unsubDepto = onSnapshot(collection(db, "departamentos"), (snap) => {
      setDepartamentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubCat = onSnapshot(collection(db, "categorias"), (snap) => {
      setCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubDepto();
      unsubCat();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name.includes("porcentaje") || name.includes("minimo")
          ? Number(value) || 0
          : value,
    }));
  };

  const handleAddDepto = async (e) => {
    e.preventDefault();
    const formDataDepto = new FormData(e.target);
    const nombre = formDataDepto.get("nombre");
    if (!nombre || !nombre.trim()) return;
    try {
      await addDoc(collection(db, "departamentos"), {
        areaFisica: formDataDepto.get("areaFisica") || "",
        descripcion: formDataDepto.get("descripcion") || "",
        estado: "Activo",
        fechaModificacion: Timestamp.now(),
        fechaRegistro: Timestamp.now(),
        nombre: nombre.trim(),
        responsable: formDataDepto.get("responsable") || "",
        tipoModificacion: "Creacion de Departamento",
        totalEmpleados: "0",
        turno: formDataDepto.get("turno") || "Matutino",
        usuarioModifico: auth.currentUser?.email || "Admin"
      });
      setIsDeptoModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error al agregar departamento");
    }
  };

  const handleRemoveDepto = async (id) => {
    try {
      if (window.confirm("¿Seguro que deseas eliminar este departamento?")) {
        await deleteDoc(doc(db, "departamentos", id));
      }
    } catch (e) {
      console.error(e);
      alert("Error eliminando");
    }
  };

  const handleAddCat = async (e) => {
    e.preventDefault();
    const formDataCat = new FormData(e.target);
    const nombre = formDataCat.get("nombre");
    if (!nombre || !nombre.trim()) return;
    try {
      await addDoc(collection(db, "categorias"), {
        descripcion: formDataCat.get("descripcion") || "",
        fechaModifico: Timestamp.now(),
        fechaRegistro: Timestamp.now(),
        nombre: nombre.trim(),
        tipoModifico: "Creacion",
        usuarioModifico: auth.currentUser?.email || "Admin"
      });
      setIsCatModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error al agregar categoría");
    }
  };

  const handleRemoveCat = async (id) => {
    try {
      if (window.confirm("¿Seguro que deseas eliminar esta categoría?")) {
        await deleteDoc(doc(db, "categorias", id));
      }
    } catch (e) {
      console.error(e);
      alert("Error eliminando");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg("");
    try {
      await setDoc(doc(db, "parametros", "general"), formData, { merge: true });
      setSuccessMsg("¡Reglas financieras actualizadas correctamente!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Ocurrió un error al guardar los parámetros.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-7xl mx-auto space-y-8 pb-10"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight font-headline">
            Configuración Global
          </h2>
          <p className="text-on-surface-variant font-medium text-base mt-1 max-w-xl leading-relaxed">
            Gestión de parámetros variables y catálogos de la empresa para la
            optimización de flujos de trabajo.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-br from-[#00450d] to-[#065f18] text-white px-8 py-4 text-sm font-bold shadow-xl shadow-green-900/20 hover:shadow-green-900/30 active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? (
            <span className="animate-spin material-symbols-outlined text-lg">
              sync
            </span>
          ) : (
            <span className="material-symbols-outlined text-lg">save</span>
          )}
          {saving ? "Guardando..." : "Guardar Políticas"}
        </button>
      </div>

      {/* ── Success Banner ──────────────────────────────────────── */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4 rounded-2xl flex items-center gap-4 font-bold"
        >
          <span className="material-symbols-outlined text-emerald-600">
            check_circle
          </span>
          {successMsg}
        </motion.div>
      )}

      <div className="grid grid-cols-12 gap-10">
        {/* ── LEFT: Políticas Crediticias ─────────────────────── */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-8">
          {/* Políticas Card */}
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 relative overflow-hidden">
            {/* Accent left bar */}
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00450d]" />

            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-[#00450d]/5 rounded-2xl">
                <span className="material-symbols-outlined text-[#00450d] text-3xl">
                  account_balance_wallet
                </span>
              </div>
              <h3 className="font-headline font-extrabold text-2xl text-slate-900">
                Políticas Crediticias
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Fecha de Pago */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Fecha de Pago
                </label>
                <div className="flex items-center bg-slate-50 rounded-2xl px-5 py-4 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00450d]/20 transition-all">
                  <span className="material-symbols-outlined text-[#00450d]/60 group-focus-within:text-[#00450d] mr-4">
                    calendar_today
                  </span>
                  <input
                    type="text"
                    name="fechaPago"
                    value={formData.fechaPago}
                    onChange={handleChange}
                    placeholder="Ej. Los 30 de cada mes"
                    className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 w-full outline-none text-sm"
                  />
                </div>
              </div>



              {/* Límite de Deducción */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Límite de Deducción
                </label>
                <div className="flex items-center bg-slate-50 rounded-2xl px-5 py-4 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00450d]/20 transition-all">
                  <span className="material-symbols-outlined text-[#00450d]/60 group-focus-within:text-[#00450d] mr-4">
                    pie_chart
                  </span>
                  <input
                    type="number"
                    name="porcentajeSueldo"
                    value={formData.porcentajeSueldo}
                    onChange={handleChange}
                    placeholder="Ej. 15"
                    className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 w-full outline-none text-sm"
                  />
                  <span className="text-slate-400 font-bold text-xs ml-1 whitespace-nowrap">
                    % sueldo
                  </span>
                </div>
              </div>

              {/* Interés Aplicable */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Interés Aplicable
                </label>
                <div className="flex items-center bg-slate-50 rounded-2xl px-5 py-4 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00450d]/20 transition-all">
                  <span className="material-symbols-outlined text-[#00450d]/60 group-focus-within:text-[#00450d] mr-4">
                    trending_up
                  </span>
                  <input
                    type="number"
                    name="porcentajeInteres"
                    value={formData.porcentajeInteres}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="Ej. 0"
                    className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 w-full outline-none text-sm"
                  />
                  <span className="text-slate-400 font-bold text-xs ml-1 whitespace-nowrap">
                    % fijo
                  </span>
                </div>
              </div>

              {/* Monto Mínimo Reserva a Crédito */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                  Monto Mínimo (Reservas Crédito)
                </label>
                <div className="flex items-center bg-slate-50 rounded-2xl px-5 py-4 group focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00450d]/20 transition-all">
                  <span className="material-symbols-outlined text-[#00450d]/60 group-focus-within:text-[#00450d] mr-4">
                    payments
                  </span>
                  <span className="text-slate-400 font-bold text-sm mr-2 select-none">L.</span>
                  <input
                    type="number"
                    name="minimoReservaCredito"
                    value={formData.minimoReservaCredito}
                    onChange={handleChange}
                    placeholder="Ej. 300"
                    className="bg-transparent border-none p-0 text-slate-800 font-semibold focus:ring-0 w-full outline-none text-sm"
                  />
                </div>
              </div>
            </div>


          </div>
        </section>

        {/* ── RIGHT: Catálogos ────────────────────────────────── */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-8">
          {/* Departamentos Card */}
          <div className="bg-slate-50 rounded-3xl p-8 flex flex-col gap-6 border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-slate-900">
                Departamentos de la Empresa
              </h3>
              <span className="bg-[#00450d]/10 text-[#00450d] px-3 py-1 rounded-full text-xs font-bold">
                {departamentos.length} ACTIVOS
              </span>
            </div>

            {/* Botón de Apertura de Modal */}
            <button
              onClick={() => setIsDeptoModalOpen(true)}
              className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl py-4 text-sm font-bold text-[#00450d] hover:border-[#00450d]/30 hover:bg-[#00450d]/5 transition-all flex items-center justify-center gap-2 mb-2"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Registrar Nuevo Departamento
            </button>

            {/* Tags */}
            <div className="flex flex-wrap gap-3 max-h-36 overflow-y-auto pr-1">
              {departamentos.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-black/5"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {dep.nombre || dep.descripcion || dep.departamento || "N/A"}
                  </span>
                  <button
                    onClick={() => handleRemoveDepto(dep.id)}
                    className="hover:text-red-500 transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
              ))}
              {departamentos.length === 0 && (
                <p className="text-xs text-slate-400 italic font-medium">
                  Sin departamentos aún. Agrega el primero arriba.
                </p>
              )}
            </div>
          </div>

          {/* Categorías Card */}
          <div className="bg-slate-50 rounded-3xl p-8 flex flex-col gap-6 border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-xl text-slate-900">
                Categorías de Productos
              </h3>
              <span className="bg-[#523327]/10 text-[#523327] px-3 py-1 rounded-full text-xs font-bold">
                {categorias.length} CATEGORÍAS
              </span>
            </div>

            {/* Botón de Apertura de Modal */}
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl py-4 text-sm font-bold text-[#523327] hover:border-[#523327]/30 hover:bg-[#523327]/5 transition-all flex items-center justify-center gap-2 mb-2"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Registrar Nueva Categoría
            </button>

            {/* Tags */}
            <div className="flex flex-wrap gap-3 max-h-36 overflow-y-auto pr-1">
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-black/5"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {cat.nombre || cat.categoria || cat.descripcion || "N/A"}
                  </span>
                  <button
                    onClick={() => handleRemoveCat(cat.id)}
                    className="hover:text-red-500 transition-colors flex items-center"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
              ))}
              {categorias.length === 0 && (
                <p className="text-xs text-slate-400 italic font-medium">
                  Sin categorías aún. Agrega la primera arriba.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── MODALS FOR DEPENDENCIES ─────────────────────────── */}
      {isDeptoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.form
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleAddDepto}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6 bg-[#00450d] text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black font-headline tracking-tight">Nuevo Departamento</h3>
                <p className="text-[#00450d] text-[10px] uppercase font-bold text-green-200">Información del Área</p>
              </div>
              <button type="button" onClick={() => setIsDeptoModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre del Departamento</label>
                <input name="nombre" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#00450d] transition-colors" placeholder="Ej. Producción Ensamblaje" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descripción</label>
                <input name="descripcion" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#00450d] transition-colors" placeholder="Ej. Área encargada de calidad..." />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Área Física / Ubicación</label>
                <input name="areaFisica" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#00450d] transition-colors" placeholder="Ej. Edificio A - Planta Alta" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Responsable</label>
                  <input name="responsable" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#00450d] transition-colors" placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Turno</label>
                  <div className="relative">
                    <select name="turno" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#00450d] appearance-none transition-colors">
                      <option value="Matutino">Matutino</option>
                      <option value="Vespertino">Vespertino</option>
                      <option value="Nocturno">Nocturno</option>
                      <option value="Mixto">Mixto</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 mt-6 bg-[#00450d] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#065f18] transition-all shadow-xl shadow-green-900/20">
                Registrar Departamento
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.form
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleAddCat}
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="p-6 bg-[#523327] text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black font-headline tracking-tight">Nueva Categoría</h3>
                <p className="text-[10px] uppercase font-bold text-orange-200">Clasificación</p>
              </div>
              <button type="button" onClick={() => setIsCatModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre de la Categoría</label>
                <input name="nombre" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#523327] transition-colors" placeholder="Ej. Utensilios" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descripción</label>
                <textarea name="descripcion" required className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-[#523327] transition-colors resize-none" placeholder="Breve descripción..." rows="3"></textarea>
              </div>
              <button type="submit" className="w-full py-4 mt-6 bg-[#523327] text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#6c493d] transition-all shadow-xl shadow-orange-900/20">
                Registrar Categoría
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </motion.div>
  );
}
