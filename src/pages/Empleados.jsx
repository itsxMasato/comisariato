import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { collection, onSnapshot, doc, setDoc, updateDoc, Timestamp, deleteDoc, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

export default function Empleados() {
    const [employeesData, setEmployeesData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [departamentos, setDepartamentos] = useState([]);
    const [parametros, setParametros] = useState({ porcentajeSueldo: 15 });
    const [historialData, setHistorialData] = useState([]);

    useEffect(() => {
        const unsubDepto = onSnapshot(collection(db, "departamentos"), (snapshot) => {
            const deptos = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.data().nombre
            }));
            setDepartamentos(deptos);
        });
        const unsubParam = onSnapshot(doc(db, "parametros", "general"), (docSnap) => {
            if (docSnap.exists()) {
                setParametros(docSnap.data());
            }
        });
        return () => {
            unsubDepto();
            unsubParam();
        };
    }, []);


    useEffect(() => {
        const unsubHistorial = onSnapshot(collection(db, "historial_empleados"), (snapshot) => {
            setHistorialData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubHistorial();
    }, []);


    useEffect(() => {
        const unsub = onSnapshot(collection(db, "empleados"), (snapshot) => {
            setEmployeesData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const employees = employeesData.map(e => ({
        ...e,
        empleadoId: e.id,
        nombres: e.nombres || "",
        apellidos: e.apellidos || "",
        codigoEmpleado: e.codigoEmpleado || "N/A",
        correo: e.correo || "",
        departamento: e.departamento || "N/A",
        dni: e.dni || "",
        estado: e.estado || "active",
        limiteCredito: e.limiteCredito || 0,
        salario: e.salario || 0,
        telefono: e.telefono || "",
        fechaRegistro: e.fechaRegistro && typeof e.fechaRegistro.toDate === 'function' ? e.fechaRegistro.toDate().toLocaleDateString() : e.fechaRegistro || "",
        balance: 0,
        img: `https://ui-avatars.com/api/?name=${e.nombres ? e.nombres[0] : 'U'}`
    }));

    const totalActivos = employees.filter(e => e.estado === 'active' || e.estado === 'Activo').length;
    const totalInactivos = employees.filter(e => e.estado === 'inactive' || e.estado === 'Inactivo').length;
    const sumaSalarios = employees.reduce((acc, curr) => acc + curr.salario, 0);

    const inactivosEnNomina = employees.filter(e => e.estado === 'inactive' || e.estado === 'Inactivo').length;
    const eliminadosHistorico = historialData.filter(h => h.tipoModificacion === 'Eliminado').length;
    const totalInactivosGeneral = inactivosEnNomina + eliminadosHistorico;

    const [formData, setFormData] = useState({
        nombres: "", apellidos: "", codigoEmpleado: "", correo: "",
        departamento: "", dni: "", limiteCredito: 0,
        salario: 0, telefono: "", estado: "Activo"
    });

    const validarEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    };

    const fmtL = (n) =>
        new Intl.NumberFormat("es-HN", {
            style: "currency",
            currency: "HNL",
            minimumFractionDigits: 2
        }).format(n).replace("HNL", "L");

    const handleOpenModal = (emp = null) => {
        if (emp) {
            setEditingEmployee(emp);
            setFormData(emp);
        } else {
            setEditingEmployee(null);
            setFormData({
                nombres: "", apellidos: "", codigoEmpleado: "", correo: "",
                departamento: "", dni: "", limiteCredito: 0,
                salario: 0, telefono: "", estado: "Activo"
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = {
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            codigoEmpleado: formData.codigoEmpleado,
            correo: formData.correo,
            departamento: formData.departamento,
            dni: formData.dni,
            limiteCredito: formData.limiteCredito,
            salario: formData.salario,
            telefono: formData.telefono,
            estado: formData.estado === "active" ? "Activo" : formData.estado,
            tipoModificacion: editingEmployee ? "Actualización" : "Creación",
            usuarioModifico: auth.currentUser?.email || "Admin",
            fechaModificacion: Timestamp.now()
        };

        try {
            if (editingEmployee) {
                await updateDoc(doc(db, "empleados", editingEmployee.empleadoId), payload);
            } else {
                payload.fechaRegistro = Timestamp.now();
                payload.empleadoId = "";
                const docRef = doc(collection(db, "empleados"));
                payload.empleadoId = docRef.id;
                await setDoc(docRef, payload);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteEmployee = async (emp) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${emp.nombres} ${emp.apellidos}?`)) return;

        try {
            await addDoc(collection(db, "historial_empleados"), {
                apellidos: emp.apellidos || "",
                codigoEmpleado: emp.codigoEmpleado || "",
                correo: emp.correo || "",
                departamento: emp.departamento || "",
                dni: emp.dni || "",
                empleadoId: emp.empleadoId || "",
                estado: emp.estado || "",
                fechaModificacion: Timestamp.now(),
                fechaRegistro: Timestamp.now(),
                limiteCreditos: emp.limiteCredito || 0,
                nombres: emp.nombres || "",
                salario: emp.salario || 0,
                telefono: emp.telefono || "",
                tipoModificacion: "Eliminado",
                usuarioModifico: auth.currentUser?.email || "Admin"
            });
            await deleteDoc(doc(db, "empleados", emp.empleadoId));
        } catch (error) {
            console.error("Error al archivar y eliminar empleado:", error);
            alert("Hubo un error al eliminar el empleado");
        }
    };

    const filtered = employees.filter(e =>
        e.nombres.toLowerCase().includes(search.toLowerCase()) ||
        e.codigoEmpleado.toLowerCase().includes(search.toLowerCase())
    );

    const handleExportReport = (deptReport = "Todos los Departamentos") => {
        const listToExport = deptReport === "Todos los Departamentos"
            ? filtered
            : employees.filter(e => e.departamento === deptReport);

        const reportLabel = deptReport === "Todos los Departamentos"
            ? "MÚLTIPLES DEPARTAMENTOS"
            : `DEPTO. ${deptReport.toUpperCase()}`;

        const dateStr = new Date().toLocaleDateString("es-HN");
        const totalItems = listToExport.length;
        const totalSalary = listToExport.reduce((acc, curr) => acc + (curr.salario || 0), 0);
        const totalCredit = listToExport.reduce((acc, curr) => acc + (curr.limiteCredito || 0), 0);

        const reportHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="utf-8"/>
                <title>Reporte de Empleados - Comisariato Pro</title>
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
                            <span class="font-headline uppercase tracking-widest text-[11px] font-bold text-slate-500 mt-1">PLANILLA - ${reportLabel} - ${dateStr}</span>
                        </div>
                        <div class="text-right text-slate-800 font-headline font-bold text-[10px] tracking-widest uppercase">Recursos Humanos</div>
                    </header>

                    <section class="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        <div class="bg-[#f2f4f2] p-4 border-l-4 border-slate-800">
                            <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Total Colaboradores</p>
                            <p class="text-xl font-bold text-slate-800 font-headline">${totalItems}</p>
                        </div>
                        <div class="bg-[#f2f4f2] p-4 border-l-4 border-green-800">
                            <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Planilla Total Mensual</p>
                            <p class="text-xl font-bold text-green-800 font-headline">${fmtL(totalSalary)}</p>
                        </div>
                        <div class="bg-[#f2f4f2] p-4 border-l-4 border-amber-600">
                            <p class="font-headline text-[9px] uppercase tracking-wider text-gray-500 mb-1">Crédito Proyectado</p>
                            <p class="text-xl font-bold text-amber-800 font-headline">${fmtL(totalCredit)}</p>
                        </div>
                    </section>

                    <section class="flex-grow">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-[#e1e3e1]">
                                <tr>
                                    <th class="px-3 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Colaborador</th>
                                    <th class="px-3 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Identidad / Cód.</th>
                                    <th class="px-3 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800">Departamento</th>
                                    <th class="px-3 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800 text-right">Salario Base</th>
                                    <th class="px-3 py-3 font-headline font-bold text-[10px] uppercase tracking-wider text-slate-800 text-right">Límite</th>
                                </tr>
                            </thead>
                            <tbody class="text-[11px]">
                                ${listToExport
                                    .map(
                                        (e) => `
                                    <tr class="border-b border-gray-100">
                                        <td class="px-3 py-3 font-bold text-gray-800">${e.nombres} ${e.apellidos}</td>
                                        <td class="px-3 py-3 font-mono text-gray-500 text-[10px]">${e.dni}<br/><span class="text-[9px] text-gray-400 font-sans">${e.codigoEmpleado}</span></td>
                                        <td class="px-3 py-3 text-slate-800 font-bold">${e.departamento}</td>
                                        <td class="px-3 py-3 font-bold text-gray-900 text-right ${e.estado === 'limit' ? 'text-red-600' : ''}">${fmtL(e.salario)}</td>
                                        <td class="px-3 py-3 font-bold text-green-700 text-right">${fmtL(e.limiteCredito)}</td>
                                    </tr>
                                `,
                                    )
                                    .join("")}
                            </tbody>
                        </table>
                    </section>

                    <footer class="mt-auto border-t border-gray-100 pt-12 pb-6">
                        <div class="grid grid-cols-2 gap-12 w-full px-4 mb-8">
                            <div class="flex flex-col items-center">
                                <div class="w-full border-b border-gray-400 mb-2"></div>
                                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-slate-800">Recursos Humanos</p>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="w-full border-b border-gray-400 mb-2"></div>
                                <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-slate-800">Gerencia General</p>
                            </div>
                        </div>
                        <div class="flex justify-between items-end pt-4 border-t border-slate-50">
                            <p class="font-headline text-[8px] uppercase tracking-wider text-gray-400 italic text-left">Planilla oficial. Uso interno exclusivo.</p>
                            <p class="font-headline text-[9px] uppercase tracking-wider font-bold text-slate-800">Emisión: ${dateStr}</p>
                        </div>
                    </footer>
                </div>
                <div class="fixed bottom-8 right-8 no-print">
                    <button onclick="window.print()" class="bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-xl">Imprimir Planilla</button>
                </div>
            </body>
            </html>
        `;

        const printWin = window.open("", "_blank");
        printWin.document.write(reportHtml);
        printWin.document.close();
    };

    return (
        <div className="bg-gray-50 text-gray-900 min-h-screen p-8 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-7xl mx-auto space-y-10"
            >

                {/* Page Header */}
                <div className="flex justify-between items-end gap-4 flex-wrap">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                            Empleados
                        </h2>
                        <p className="text-slate-500 font-medium">
                            Gestion de colaboradores, salarios y credito automatico por empleado.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative group text-sm font-bold w-full sm:w-auto z-40 flex-1 sm:flex-none">
                            <button className="w-full sm:w-auto bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-300 transition-all active:scale-95" title="Exportar Reporte">
                                <span className="material-symbols-outlined text-lg">download</span>
                                PDF
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-2">
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-4 py-2 opacity-60">Filtrar PDF por</span>
                                <button onClick={() => handleExportReport("Todos los Departamentos")} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">Reporte Global</button>
                                {departamentos.map(depto => (
                                    <button key={depto.id} onClick={() => handleExportReport(depto.nombre)} className="px-4 py-2 hover:bg-slate-50 text-left rounded-xl text-slate-700 text-xs font-bold transition-all">{depto.nombre}</button>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="text-white px-6 py-3 rounded-xl flex flex-1 sm:flex-none justify-center items-center gap-2 font-bold shadow-lg transition-all active:scale-95 bg-gradient-to-r from-green-900 to-green-700"
                        >
                            <span className="material-symbols-outlined">person_add</span>
                            Nuevo Empleado
                        </button>
                    </div>
                </div>

                {/* Bento Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Suma de Salarios Mensuales */}
                    <div className="col-span-1 md:col-span-2 bg-slate-100 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Mensual en Salarios</span>
                            <h3 className="text-4xl font-extrabold text-green-900 mt-4 tracking-tighter" style={{ fontFamily: "Manrope, sans-serif" }}>
                                {fmtL(sumaSalarios)}
                            </h3>
                            <div className="flex items-center gap-2 mt-4 text-green-700 text-sm font-bold">
                                <span className="material-symbols-outlined text-sm">payments</span>
                                <span>Planilla total del mes</span>
                            </div>
                        </div>
                    </div>

                    {/* Empleados Activos */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaboradores Activos</span>
                        <div>
                            <p className="text-3xl font-black text-green-800" style={{ fontFamily: "Manrope, sans-serif" }}>{totalActivos}</p>
                            <p className="text-[10px] text-slate-400 font-medium">En funciones actualmente</p>
                        </div>
                    </div>

                    {/* Empleados Inactivos */}
                    <div className="p-8 rounded-3xl text-white flex flex-col justify-between bg-gradient-to-br from-[#6c493d] to-[#523327]">
                        <span className="text-[10px] font-black text-amber-100/50 uppercase tracking-widest">Personal Inactivo</span>
                        <div>
                            <p className="text-3xl font-black text-white" style={{ fontFamily: "Manrope, sans-serif" }}>
                                {totalInactivosGeneral}
                            </p>
                            <p className="text-[10px] text-amber-100/40 font-medium">Bajas y registros archivados</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                        placeholder="Buscar empleado por nombre o código..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {["Empleado", "DNI / Código", "Crédito Asignado", "Salario Mensual", "Acciones"].map((h) => (
                                    <th key={h} className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {filtered.map((emp) => (
                                <tr key={emp.empleadoId} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <img src={emp.img} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                            <div>
                                                <p className="font-bold text-gray-900 leading-tight">{emp.nombres} {emp.apellidos}</p>
                                                <p className="text-[11px] text-slate-400">{emp.correo}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-medium text-slate-700">{emp.dni}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">{emp.codigoEmpleado} • {emp.departamento}</p>
                                    </td>
                                    <td className="px-8 py-5 font-bold text-green-800">{fmtL(emp.limiteCredito)}</td>
                                    <td className={`px-8 py-5 font-bold ${emp.estado === 'limit' ? 'text-red-600' : 'text-gray-900'}`}>{fmtL(emp.salario)}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setSelectedEmployee(emp); setIsPreviewOpen(true); }}
                                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Ver Detalles"
                                            >
                                                <span className="material-symbols-outlined text-sm">visibility</span>
                                            </button>
                                            <button onClick={() => handleOpenModal(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-sm">edit</span></button>
                                            <button onClick={() => handleDeleteEmployee(emp)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modal - Todos los campos solicitados */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-10 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black text-green-950 uppercase tracking-tight">
                                    {editingEmployee ? "Actualizar Empleado" : "Registro de Personal"}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form className="grid grid-cols-1 md:grid-cols-2 gap-5" onSubmit={handleSave}>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombres</label>
                                    <input required value={formData.nombres}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) return;
                                            setFormData({ ...formData, nombres: val });
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Apellidos</label>
                                    <input required value={formData.apellidos}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/.test(val)) return;
                                            setFormData({ ...formData, apellidos: val });
                                        }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">DNI</label>
                                    <input required value={formData.dni}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (!/^\d*$/.test(val)) return;
                                            setFormData({ ...formData, dni: val });
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                                    <select
                                        required
                                        value={formData.departamento}
                                        onChange={e => setFormData({ ...formData, departamento: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 appearance-none"
                                    >
                                        <option value="" disabled>Seleccione un área</option>
                                        {departamentos.map((depto) => (
                                            <option key={depto.id} value={depto.nombre}>
                                                {depto.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código Empleado</label>
                                    <input required value={formData.codigoEmpleado} onChange={e => setFormData({ ...formData, codigoEmpleado: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo</label>
                                    <input type="email" required value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teléfono</label>
                                    <input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Límite Crédito (L)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={fmtL(formData.limiteCredito)}
                                        className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl px-5 py-2.5 text-sm outline-none text-green-800 font-bold cursor-not-allowed"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Salario (L)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.salario === 0 ? "" : formData.salario.toLocaleString("en-US")}
                                        onChange={e => {
                                            const valorLimpio = e.target.value.replace(/,/g, "");
                                            if (!/^\d*\.?\d*$/.test(valorLimpio)) return;
                                            const nuevoSalario = parseFloat(valorLimpio) || 0;
                                            const nuevoLimite = nuevoSalario * (parametros.porcentajeSueldo / 100);
                                            setFormData({
                                                ...formData,
                                                salario: nuevoSalario,
                                                limiteCredito: nuevoLimite
                                            });
                                        }}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 font-bold text-slate-700"
                                        placeholder="Ej. 4,500"
                                    />
                                    <p className="text-[9px] text-slate-400 ml-2 italic">Formato automático con separador de miles</p>
                                </div>

                                <button type="submit" className="md:col-span-2 w-full bg-green-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-800 transition-all mt-4 active:scale-[0.98]">
                                    {editingEmployee ? "Actualizar Empleado" : "Finalizar Registro"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal de Vista Previa (Lectura) ── */}
            {isPreviewOpen && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative p-10 space-y-8 animate-in fade-in zoom-in duration-200">

                        {/* Header del Modal */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                            <div className="flex items-center gap-4">
                                <img src={selectedEmployee.img} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                                <div>
                                    <h3 className="text-2xl font-black text-green-950 uppercase tracking-tight">
                                        {selectedEmployee.nombres} {selectedEmployee.apellidos}
                                    </h3>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{selectedEmployee.codigoEmpleado}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Grid de Información Técnica */}
                        <div className="grid grid-cols-2 gap-y-6 gap-x-10 text-sm">
                            {[
                                { label: "DNI", value: selectedEmployee.dni },
                                { label: "Correo", value: selectedEmployee.correo },
                                { label: "Teléfono", value: selectedEmployee.telefono },
                                { label: "Departamento", value: selectedEmployee.departamento },
                                { label: "Salario Base", value: fmtL(selectedEmployee.salario) },
                                { label: "Límite de Crédito", value: fmtL(selectedEmployee.limiteCredito) },
                                { label: "Saldo Actual", value: fmtL(selectedEmployee.balance || 0) },
                                { label: "Estado", value: selectedEmployee.estado === 'active' ? 'ACTIVO' : 'INACTIVO' }
                            ].map((item) => (
                                <div key={item.label} className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{item.label}</p>
                                    <p className="text-slate-700 font-bold">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Botón de Cierre */}
                        <div className="pt-4">
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>

    );
}