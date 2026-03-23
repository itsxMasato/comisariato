import React, { useState } from "react";
import { useLocation } from "react-router-dom";

// ── Datos Iniciales (Mock con tu estructura técnica) ──
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
        balance: 345.50, // Campo visual para la tabla
        img: "https://i.pravatar.cc/150?u=1"
    }
];

export default function Empleados() {
    const location = useLocation();
    const [employees, setEmployees] = useState(INITIAL_DATA);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [editingEmployee, setEditingEmployee] = useState(null);

    // Estado para los campos del formulario que solicitaste
    const [formData, setFormData] = useState({
        nombres: "", apellidos: "", codigoEmpleado: "", correo: "",
        departamento: "Logística", dni: "", limiteCredito: 0,
        salario: 0, telefono: "", estado: "active", empleadoId: ""
    });

    // Formateador a Lempiras (L)
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
                salario: 0, telefono: "", estado: "active", empleadoId: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const now = new Date().toLocaleString();

        if (editingEmployee) {
            // Editar existente
            setEmployees(employees.map(emp =>
                emp.empleadoId === editingEmployee.empleadoId
                    ? { ...formData, fechaModificacion: now, usuarioModifico: "Astrid", tipoModificacion: "UPDATE" }
                    : emp
            ));
        } else {
            // Nuevo registro
            const newEmp = {
                ...formData,
                empleadoId: Date.now().toString(),
                fechaRegistro: now,
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
        <div className="bg-gray-50 text-gray-900 min-h-screen font-sans">
            <div className="p-10 max-w-7xl mx-auto space-y-10">

                {/* ── Page Header ── */}
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-extrabold text-green-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                            Gestión de Empleados
                        </h2>
                        <p className="text-slate-500 mt-2 text-sm">
                            Administre los límites de crédito y estados de cuenta de su personal.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all active:scale-95"
                        style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)", fontFamily: "Manrope, sans-serif" }}
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Nuevo Empleado
                    </button>
                </div>

                {/* ── Bento Stats (Fiel al original) ── */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                    <div className="col-span-1 md:col-span-2 bg-slate-100 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cartera Activa</span>
                            <h3 className="text-4xl font-extrabold text-green-900 mt-4 tracking-tighter" style={{ fontFamily: "Manrope, sans-serif" }}>
                                {fmtL(428500)}
                            </h3>
                            <div className="flex items-center gap-2 mt-4 text-green-700 font-bold">
                                <span className="material-symbols-outlined text-sm">trending_up</span>
                                <span>+12.5% vs mes anterior</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Empleados Activos</span>
                        <p className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: "Manrope, sans-serif" }}>1,240</p>
                    </div>
                    <div className="p-8 rounded-3xl text-white flex flex-col justify-between" style={{ background: "linear-gradient(135deg, #6c493d 0%, #523327 100%)" }}>
                        <span className="text-xs font-medium text-amber-100/80">Crédito Asignado Total</span>
                        <p className="text-2xl font-extrabold" style={{ fontFamily: "Manrope, sans-serif" }}>{fmtL(1200000)}</p>
                    </div>
                </div>

                {/* ── Search & Table ── */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input
                                className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-700 outline-none"
                                placeholder="Buscar empleado..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-5 text-left">Empleado</th>
                                    <th className="px-8 py-5">DNI / Código</th>
                                    <th className="px-8 py-5 text-right">Crédito Asignado</th>
                                    <th className="px-8 py-5 text-right">Saldo Actual</th>
                                    <th className="px-8 py-5 text-center">Acciones</th>
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
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{emp.codigoEmpleado} • {emp.departamento}</p>
                                        </td>
                                        <td className="px-8 py-5 font-bold text-green-800 text-right">{fmtL(emp.limiteCredito)}</td>
                                        <td className={`px-8 py-5 font-bold text-right ${emp.balance > emp.limiteCredito ? 'text-red-600' : 'text-gray-900'}`}>{fmtL(emp.balance || 0)}</td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenModal(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-sm">edit</span></button>
                                                <button onClick={() => setEmployees(employees.filter(x => x.empleadoId !== emp.empleadoId))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Modal de Registro (Con tus campos técnicos) ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/40 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200">
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
                                {/* Nombres / Apellidos */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombres</label>
                                    <input required value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Apellidos</label>
                                    <input required value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>

                                {/* DNI / Código */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">DNI</label>
                                    <input required value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Código Empleado</label>
                                    <input required value={formData.codigoEmpleado} onChange={e => setFormData({ ...formData, codigoEmpleado: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>

                                {/* Correo / Teléfono */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Correo Electrónico</label>
                                    <input type="email" required value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teléfono</label>
                                    <input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>

                                {/* Departamento / Salario */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                                    <select value={formData.departamento} onChange={e => setFormData({ ...formData, departamento: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all">
                                        <option value="Logística">Logística</option>
                                        <option value="Finanzas">Finanzas</option>
                                        <option value="Administración">Administración</option>
                                        <option value="Mantenimiento">Mantenimiento</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Salario Base (L)</label>
                                    <input type="number" required value={formData.salario} onChange={e => setFormData({ ...formData, salario: parseFloat(e.target.value) })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>

                                {/* Límite Crédito / Estado */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Límite Crédito (L)</label>
                                    <input type="number" required value={formData.limiteCredito} onChange={e => setFormData({ ...formData, limiteCredito: parseFloat(e.target.value) })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Estado</label>
                                    <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm outline-none focus:border-green-600 transition-all">
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>

                                <button type="submit" className="md:col-span-2 w-full bg-green-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-800 transition-all mt-4 active:scale-[0.98]">
                                    {editingEmployee ? "Guardar Cambios" : "Finalizar Registro"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}