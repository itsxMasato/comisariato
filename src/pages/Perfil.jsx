import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthProvider';

export default function Perfil() {
    const { user, role } = useAuth();

    return (
        <div className="bg-gray-50 text-gray-900 min-h-screen p-8 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-4xl mx-auto space-y-10"
            >
                {/* Header */}
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                        Mi Perfil
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Información personal y detalles de tu cuenta en el sistema.
                    </p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-10">
                    <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-green-800 to-green-950 flex items-center justify-center shadow-xl shrink-0">
                        <span className="material-symbols-outlined text-green-200 text-6xl">
                            person
                        </span>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 border border-green-100 mb-2">
                            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                            <span className="text-xs font-bold text-green-800 uppercase tracking-widest">{role || "Usuario"}</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
                            {user?.displayName || "Administrador"}
                        </h3>
                        <p className="text-slate-500 font-medium text-lg">
                            {user?.email || "No email registrado"}
                        </p>
                    </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <span className="material-symbols-outlined text-slate-400 mb-4 text-3xl">badge</span>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <span className="material-symbols-outlined text-slate-400 mb-4 text-3xl">shield_person</span>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Nivel de Acceso</h4>
                        <p className="text-slate-700 font-bold">{role || "Permisos Estándar"}</p>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}