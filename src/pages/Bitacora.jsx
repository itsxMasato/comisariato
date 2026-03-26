import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Función de obtención de datos optimizada
const obtenerBitacoraCompleta = async () => {
    const nombresColecciones = [
        "categorias", "comisariatos", "creditos", "cuotas", "departamentos",
        "empleados", "estadoProducto", "estadoSolicitud", "estadoUsuario",
        "historial_creditos", "historial_empleados", "historial_productos",
        "productos", "roles", "usuarios"
    ];

    try {
        const promesas = nombresColecciones.map(nombre => getDocs(collection(db, nombre)));
        const resultados = await Promise.all(promesas);
        const listaBitacora = [];

        resultados.forEach((snap, index) => {
            const origen = nombresColecciones[index];

            const moduloNombre = {
                empleados: "Empleados",
                productos: "Productos",
                usuarios: "Usuarios",
                creditos: "Créditos",
                cuotas: "Cuotas",
                categorias: "Categorías",
                departamentos: "Departamentos",
                roles: "Roles",
                comisariatos: "Comisariatos",
                estadoProducto: "Estado Producto",
                estadoSolicitud: "Estado Solicitud"
            }[origen] || origen.charAt(0).toUpperCase() + origen.slice(1);

            snap.forEach((doc) => {
                const data = doc.data();
                // Algunos módulos usan fechaModificacion, otros fechaActualizacion o fechaRegistro
                const fecha = data.fechaModificacion || data.fechaActualizacion || data.fechaRegistro;

                if (fecha) {
                    const esEdicion = !!(data.fechaModificacion || data.fechaActualizacion);
                    let accionGenerada = data.tipoModificacion || "N/A";

                    listaBitacora.push({
                        id: doc.id,
                        coleccion: moduloNombre,
                        usuario: data.usuarioModifico || data.email || data.usuario || "Sistema",
                        accion: accionGenerada,
                        fecha: fecha?.toDate
                            ? fecha.toDate()
                            : new Date(fecha)
                    });
                }
            });
        });
        return listaBitacora.sort((a, b) => b.fecha - a.fecha);
    } catch (error) {
        console.error("Error al generar tabla de bitácora:", error);
        return [];
    }
};

const TablaBitacora = () => {
    const [datos, setDatos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Estados de Filtros
    const [search, setSearch] = useState("");
    const [filtroModulo, setFiltroModulo] = useState("Todos");
    const [filtroAccion, setFiltroAccion] = useState("Todos");
    const [filtroTiempo, setFiltroTiempo] = useState("Todos");

    useEffect(() => {
        const cargarDatos = async () => {
            const res = await obtenerBitacoraCompleta();
            setDatos(res);
            setCargando(false);
        };
        cargarDatos();
    }, []);

    // Lógica de filtrado
    const datosFiltrados = datos.filter((item) => {
        const matchSearch = item.usuario.toLowerCase().includes(search.toLowerCase()) ||
            item.accion.toLowerCase().includes(search.toLowerCase());
        const matchModulo = filtroModulo === "Todos" || item.coleccion === filtroModulo;
        const matchAccion = filtroAccion === "Todos" || item.accion === filtroAccion;

        // Filtro de tiempo sencillo
        if (filtroTiempo === "Hoy") {
            const hoy = new Date().setHours(0, 0, 0, 0);
            if (item.fecha.setHours(0, 0, 0, 0) !== hoy) return false;
        }

        return matchSearch && matchModulo && matchAccion;
    });

    if (cargando) return (
        <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-800 border-t-transparent"></div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 p-2"
            style={{ fontFamily: "Manrope, sans-serif" }}
        >
            {/* ── TÍTULO Y DESCRIPCIÓN ── */}
            <section className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Bitácora de Auditoría
                </h2>
                <p className="text-slate-500 font-medium">
                    Seguimiento detallado de cambios, ediciones y registros en el sistema.
                </p>
            </section>

            {/* ── PANEL DE FILTROS AVANZADOS ── */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                {/* Buscador */}
                <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Buscar Registro</label>
                    <span className="material-symbols-outlined absolute left-3 top-[38px] text-slate-400 text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Usuario o acción..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                    />
                </div>

                {/* Filtro Módulo */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Módulo / Tabla</label>
                    <select
                        value={filtroModulo}
                        onChange={(e) => setFiltroModulo(e.target.value)}
                        className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-700 outline-none appearance-none"
                    >
                        <option value="Todos">Todos los módulos</option>
                        {Array.from(new Set(datos.map(d => d.coleccion))).map(c => (
                            <option key={c} value={c}>{c.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                {/* Filtro Fecha Rapida */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Rango de Tiempo</label>
                    <div className="flex gap-2">
                        {["Todos", "Hoy"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setFiltroTiempo(t)}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${filtroTiempo === t ? "bg-green-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TABLA ESTILO CRÉDITOS ── */}
            <article className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha y Hora</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Usuario Responsable</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Módulo / Colección</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Acción Realizada</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {datosFiltrados.length > 0 ? (
                                    datosFiltrados.map((item) => (
                                        <motion.tr
                                            layout
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {/* La barrita verde característica de tu diseño */}
                                                    <div className="h-8 w-1.5 rounded-full bg-green-700" />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {/* Mostramos fecha y hora de un solo en formato local */}
                                                            {item.fecha.toLocaleString('es-HN', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            })}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                                            Registro de Actividad
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                                                    <p className="text-sm font-bold text-slate-700">{item.usuario}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 uppercase tracking-tight">
                                                    {item.coleccion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${item.accion.includes("Creado") ? "bg-green-100 text-green-800" :
                                                    item.accion.includes("Editado") ? "bg-amber-100 text-amber-800" :
                                                        "bg-slate-100 text-slate-600"
                                                    }`}>
                                                    {item.accion}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <span className="material-symbols-outlined text-slate-300 text-5xl block mb-2">inventory_2</span>
                                            <p className="text-slate-400 font-medium">No hay registros que coincidan con los filtros.</p>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </article>
        </motion.div>
    );
};

export default TablaBitacora;