import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const normalizarTexto = (valor) => {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor).trim();
    return texto;
};

const obtenerUsuarioEvento = (data) => {
    const candidatos = [
        data.usuarioModifico,
        data.usuario,
        data.usuarioRegistro,
        data.updatedBy,
        data.createdBy,
        data.email,
        data.correo,
        data.userEmail,
        data.userName,
        data.displayName,
        data.nombreUsuario,
        data.nombre,
    ];

    const encontrado = candidatos
        .map(normalizarTexto)
        .find((v) => v && v.toLowerCase() !== "sistema");

    if (encontrado) return encontrado;
    return "Usuario no identificado";
};

const obtenerAccionEvento = (data) => {
    const accionExplicita = normalizarTexto(data.tipoModificacion || data.accion || data.action || data.evento);
    if (accionExplicita) return accionExplicita;

    const tieneFechaCreacion = !!(data.fechaRegistro || data.createdAt);
    const tieneFechaActualizacion = !!(data.fechaModificacion || data.fechaActualizacion || data.updatedDate || data.updatedAt);

    if (tieneFechaActualizacion) return "Actualización de Registro";
    if (tieneFechaCreacion) return "Creación de Registro";
    return "Acción no especificada";
};

const obtenerFechaEvento = (data) => {
    const fechaRaw =
        data.fechaModificacion ||
        data.fechaActualizacion ||
        data.updatedDate ||
        data.updatedAt ||
        data.fechaRegistro ||
        data.createdAt;

    if (!fechaRaw) return null;
    if (typeof fechaRaw?.toDate === "function") return fechaRaw.toDate();

    const fecha = new Date(fechaRaw);
    if (Number.isNaN(fecha.getTime())) return null;
    return fecha;
};

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
                const fecha = obtenerFechaEvento(data);

                if (fecha) {
                    listaBitacora.push({
                        id: doc.id,
                        coleccion: moduloNombre,
                        usuario: obtenerUsuarioEvento(data),
                        accion: obtenerAccionEvento(data),
                        fecha,
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
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

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

        let matchTiempo = true;
        if (fechaInicio) {
            // Asegurarse que se calcule desde las 00:00 del día inicio
            const fInicio = new Date(fechaInicio + "T00:00:00");
            if (item.fecha < fInicio) matchTiempo = false;
        }
        if (fechaFin) {
            // Asegurarse que se incluya hasta las 23:59 del día fin
            const fFin = new Date(fechaFin + "T23:59:59");
            if (item.fecha > fFin) matchTiempo = false;
        }

        return matchSearch && matchModulo && matchAccion && matchTiempo;
    });

    if (cargando) return (
        <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-800 border-t-transparent"></div>
        </div>
    );

    const handleExportReport = (moduloReport = "Todos los módulos") => {
        const listToExport = moduloReport === "Todos los módulos"
            ? datosFiltrados // Use filtered or total datos? The user probably wants search included, let's use datosFiltrados but allow the override
            : datosFiltrados.filter((d) => d.coleccion === moduloReport);

        const reportLabel = moduloReport === "Todos los módulos"
            ? "MÚLTIPLES ÁREAS"
            : `${moduloReport.toUpperCase()}`;

        const dateStr = new Date().toLocaleDateString("es-HN");
        const totalItems = listToExport.length;

        const reportHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="utf-8"/>
                <title>Reporte de Auditoría - Comisariato Pro</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet"/>
                <style>
                    @media print { @page { size: A4; margin: 0; } body { background-color: white !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
                    .a4-canvas { width: 210mm; min-height: 297mm; background-color: white; margin: 0 auto; padding: 3rem; }
                    body { font-family: 'Inter', sans-serif; }
                    .font-headline { font-family: 'Manrope', sans-serif; }
                </style>
            </head>
            <body class="bg-gray-100">
                <div class="a4-canvas shadow-2xl flex flex-col mx-auto my-8">
                    <header class="w-full pb-4 border-b-2 border-slate-800 flex justify-between items-end mb-10">
                        <div class="flex flex-col">
                            <span class="text-2xl font-extrabold tracking-tighter text-slate-800 font-headline uppercase">COMISARIATO PRO</span>
                            <span class="font-headline uppercase tracking-widest text-[11px] font-bold text-slate-500 mt-1">BITÁCORA - ${reportLabel} - ${dateStr}</span>
                        </div>
                        <div class="text-right text-slate-800 font-headline font-bold text-[10px] tracking-widest uppercase">Auditoría CISA</div>
                    </header>

                    <section class="grid grid-cols-2 gap-6 mb-10">
                        <div class="bg-[#f2f4f2] p-5 border-l-4 border-slate-800">
                            <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Registros Auditados</p>
                            <p class="text-xl font-bold text-slate-800 font-headline">${totalItems}</p>
                        </div>
                    </section>

                    <section class="flex-grow">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-[#e1e3e1]">
                                <tr>
                                    <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Fecha y Hora</th>
                                    <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Usuario</th>
                                    <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Módulo</th>
                                    <th class="px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="text-[11px]">
                                ${listToExport
                                    .map(
                                        (p) => `
                                    <tr class="border-b border-gray-100">
                                        <td class="px-4 py-3 font-bold text-gray-800">${p.fecha.toLocaleString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                                        <td class="px-4 py-3 font-mono text-gray-500">${p.usuario}</td>
                                        <td class="px-4 py-3 text-slate-800 font-bold">${p.coleccion}</td>
                                        <td class="px-4 py-3 font-bold text-[9px] uppercase ${p.accion.includes("Creado") ? "text-green-600" : p.accion.includes("Editado") ? "text-amber-600" : "text-gray-500"}">${p.accion}</td>
                                    </tr>
                                `,
                                    )
                                    .join("")}
                            </tbody>
                        </table>
                    </section>

                    <footer class="mt-auto border-t border-gray-100 pt-12 pb-6">
                        <div class="flex justify-between items-end pt-4 border-t border-slate-50">
                            <p class="font-headline text-[8px] uppercase tracking-wider text-gray-400 italic text-left">Documento confidencial interno generado por sistema.</p>
                            <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-slate-800">Emisión: ${dateStr}</p>
                        </div>
                    </footer>
                </div>
                <div class="fixed bottom-8 right-8 no-print">
                    <button onclick="window.print()" class="bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-xl">Imprimir Reporte</button>
                </div>
            </body>
            </html>
        `;

        const printWin = window.open("", "_blank");
        printWin.document.write(reportHtml);
        printWin.document.close();
    };

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
            <section className="flex flex-col md:flex-row flex-wrap md:items-end gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                {/* Buscador */}
                <div className="relative flex-1 min-w-[200px]">
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
                <div className="flex-1 min-w-[200px]">
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

                {/* Filtro por Rango de Fechas */}
                <div className="flex-[2] min-w-[300px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Desde / Hasta</label>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                        <input
                            type="date"
                            value={fechaInicio}
                            max={fechaFin || undefined}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="flex-1 bg-slate-100 border-none rounded-xl px-3 sm:px-4 py-2.5 text-[11px] sm:text-sm focus:ring-2 focus:ring-green-700 outline-none uppercase font-bold text-slate-600"
                        />
                        <span className="text-slate-300 font-bold hidden sm:block">-</span>
                        <input
                            type="date"
                            value={fechaFin}
                            min={fechaInicio || undefined}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="flex-1 bg-slate-100 border-none rounded-xl px-3 sm:px-4 py-2.5 text-[11px] sm:text-sm focus:ring-2 focus:ring-green-700 outline-none uppercase font-bold text-slate-600"
                        />
                        {(fechaInicio || fechaFin) && (
                            <button
                                onClick={() => { setFechaInicio(""); setFechaFin(""); }}
                                className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors shrink-0"
                                title="Limpiar fechas"
                            >
                                <span className="material-symbols-outlined text-base block">close</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Botón PDF (Dropdown) */}
                <div className="relative group text-sm font-bold min-w-[200px] z-40">
                  <button className="w-full flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-black transition-colors rounded-xl shadow-lg shadow-black/10">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    PDF
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-2">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-4 py-2 opacity-60">Filtrar PDF por</span>
                    <button onClick={() => handleExportReport("Todos los módulos")} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Reporte Global</button>
                    {Array.from(new Set(datos.map(d => d.coleccion))).map(c => (
                      <button key={c} onClick={() => handleExportReport(c)} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">{c}</button>
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