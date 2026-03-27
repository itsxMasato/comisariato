import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  doc,
  updateDoc,
  Timestamp,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db, auth, storage } from "../firebase/firebase";
import { useAuth } from "../auth/AuthProvider";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Perfil() {
  const { user, role, userName, photoURL } = useAuth();

  const displayName = userName || user?.displayName || "Administrador";
  const displayEmail = user?.email || "Sin correo registrado";
  const displayRole = role || "Usuario";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const infoItems = [
    {
      icon: "mail",
      label: "Correo Electrónico",
      value: displayEmail,
      color: "bg-green-100 text-green-800",
    },
    {
      icon: "shield_person",
      label: "Rol del Sistema",
      value: displayRole,
      color: "bg-amber-100 text-amber-800",
    },

    {
      icon: "calendar_today",
      label: "Último Acceso",
      value: user?.metadata?.lastSignInTime
        ? new Date(user.metadata.lastSignInTime).toLocaleDateString("es-HN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : "—",
      color: "bg-sky-100 text-sky-800",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 p-6 md:p-10">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* ── Page title ── */}
        <motion.div variants={fadeUp}>
          <h2
            className="text-3xl font-black text-green-900 tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Mi Perfil
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Información personal y configuración de tu cuenta.
          </p>
        </motion.div>

        {/* ── Hero card ── */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Banner decorativo */}
          <div className="h-28 bg-gradient-to-br from-green-800 via-green-900 to-[#00350a] relative overflow-hidden">
            {/* Círculos decorativos */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute top-4 right-16 w-20 h-20 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 left-10 w-24 h-24 rounded-full bg-white/5" />
            <span className="material-symbols-outlined absolute right-8 bottom-3 text-7xl text-white/10 select-none">
              verified_user
            </span>
          </div>

          {/* Avatar flotante sobre el banner */}
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 mb-6">
              {/* Avatar flotante */}
              <div className="relative w-fit">
                <div className="w-28 h-28 rounded-2xl ring-4 ring-white shadow-xl overflow-hidden bg-green-700 flex items-center justify-center flex-shrink-0">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-3xl font-black text-white"
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {initials}
                    </span>
                  )}
                </div>
              </div>

              {/* Badges de estado */}
              <div className="flex flex-wrap gap-2 pb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-black uppercase tracking-widest text-green-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Activo
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  <span className="material-symbols-outlined text-xs">
                    security
                  </span>
                  {displayRole}
                </span>
              </div>
            </div>

            {/* Nombre y correo */}
            <div>
              <h3
                className="text-2xl font-black text-green-900 leading-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {displayName}
              </h3>
              <p className="text-slate-500 font-medium text-sm mt-0.5">
                {displayEmail}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Info items ── */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50"
        >
          <div className="px-8 py-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Detalles de la Cuenta
            </p>
          </div>
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 px-8 py-4 hover:bg-slate-50 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {item.icon}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {item.label}
                </p>
                <p
                  className={`text-sm font-bold text-slate-700 truncate mt-0.5 ${item.mono ? "font-mono text-xs" : ""}`}
                >
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </motion.div>



        {/* ── Cerrar sesión ── */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-rose-100 text-rose-500 font-black text-sm hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-[0.98] shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar Sesión
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
