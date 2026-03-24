import React, { useState } from "react";
import { motion } from "framer-motion";

// ── Datos Iniciales (Mock con la nueva estructura) ──
const INITIAL_DATA = [
    {
        empleadoId: "1",
        nombres: "Alejandro",
        apellidos: "Ruiz",
        codigoEmpleado: "#EMP-2093",
        correo: "a.ruiz@comisariato.hn",
        departamento: "Logística y Distribución",
        dni: "0601-1995-00123",
        estado: "active",
        limiteCredito: 1200.00,
        salario: 15500.00,
        telefono: "9988-7766",
        fechaRegistro: "19 de marzo de 2026",
        balance: 345.50, // Campo para la tabla
        img: "https://i.pravatar.cc/150?u=1"
    }
];

export default function Empleados() {
    const [employees, setEmployees] = useState(INITIAL_DATA);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const PORCENTAJE_CREDITO_GLOBAL = 0.15;
    const totalActivos = employees.filter(e => e.estado === 'active').length;
    const totalInactivos = employees.filter(e => e.estado === 'inactive').length;
    const sumaSalarios = employees.reduce((acc, curr) => acc + curr.salario, 0);

    // Estado del formulario con todos tus campos
    const [formData, setFormData] = useState({
        nombres: "", apellidos: "", codigoEmpleado: "", correo: "",
        departamento: "Logística", dni: "", limiteCredito: 0,
        salario: 0, telefono: "", estado: "active"
    });

    // Formateador a Lempiras
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
                departamento: "Logística", dni: "", limiteCredito: 0,
                salario: 0, telefono: "", estado: "active"
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (editingEmployee) {
            setEmployees(employees.map(emp => emp.empleadoId === editingEmployee.empleadoId ? { ...formData, fechaModificacion: "22 de marzo de 2026", usuarioModifico: "Astrid" } : emp));
        } else {
            const newEmp = {
                ...formData,
                empleadoId: Date.now().toString(),
                fechaRegistro: "22 de marzo de 2026",
                balance: 0,
                img: `https://i.pravatar.cc/150?u=${Date.now()}`
            };
            setEmployees([...employees, newEmp]);
        }
        setIsModalOpen(false);
    };

    const filtered = employees.filter(e =>
        e.nombres.toLowerCase().includes(search.toLowerCase()) ||
        e.codigoEmpleado.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-gray-50 text-gray-900 min-h-screen p-8 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-7xl mx-auto space-y-10"
            >

                {/* Page Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                            Empleados
                        </h2>
                        <p className="text-slate-500 font-medium">
                            Gestion de colaboradores, salarios y credito automatico por empleado.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all active:scale-95 bg-gradient-to-r from-green-900 to-green-700"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Nuevo Empleado
                    </button>
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
                            <p className="text-3xl font-black text-white" style={{ fontFamily: "Manrope, sans-serif" }}>{totalInactivos}</p>
                            <p className="text-[10px] text-amber-100/40 font-medium">Bajas o suspensiones</p>
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
                                            <button onClick={() => setEmployees(employees.filter(x => x.empleadoId !== emp.empleadoId))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
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
                                    <input required value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Apellidos</label>
                                    <input required value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">DNI</label>
                                    <input required value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600" />
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
                                            const nuevoLimite = nuevoSalario * PORCENTAJE_CREDITO_GLOBAL;
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