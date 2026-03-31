import React, { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("1. Iniciando proceso de autenticación...");
    try {
      console.log("2. Llamando a Firebase...");
      await login(email, password);
      console.log("3. ¡Login exitoso! Redirigiendo...");
      navigate("/");
    } catch (err) {
      console.error("Error capturado:", err.code);
      if (err.code === "auth/invalid-credential") {
        sileo.error({
          title: "Error al iniciar sesión",
          description: "Correo o contraseña incorrectos.",
        });
      } else {
        sileo.error({
          title: "Error al iniciar sesión",
          description: "Ocurrió un error al intentar iniciar sesión.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 flex items-center justify-center min-h-screen relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-green-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-900/5 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 shadow-2xl rounded-2xl overflow-hidden z-10 mx-4">
        {/* ── Left: Visual Panel ── */}
        <div
          className="hidden md:flex flex-col justify-between p-12 text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
          }}
        >
          {/* Dot overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* Top: Brand */}
          <div className="relative z-20">
            <div className="flex items-center gap-3 mb-16">
              <span className="material-symbols-outlined text-4xl">
                agriculture
              </span>
              <h1
                className="font-extrabold text-2xl tracking-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Comisariato Pro
              </h1>
            </div>
            <div className="space-y-5">
              <h2
                className="text-5xl font-bold leading-tight"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Gestión con
                <br />
                Precisión.
              </h2>
              <p className="text-green-200 text-lg max-w-sm font-light leading-relaxed">
                Comisariato inteligente para empresas que crecen.
              </p>
            </div>
          </div>

          {/* Bottom: Badge */}
          <div className="relative z-20">
            <div
              className="flex items-center gap-4 p-4 rounded-xl text-green-900 max-w-fit"
              style={{
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-green-200 shrink-0">
                <img
                  alt="Director General"
                  className="object-cover h-full w-full"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuJsBeIl-4OYgLddU32YfM-ML3n2GZ50QRlvQLOHeASFIuvRHTMB8GFpVIlxxG0grU-zud0a7WrIMNOx08xTZgqdFh4QvXDApcoSvRSeCG_L1QVNuXCZugKqiM54lbU_2xuqhxQiQWPiRQg3L3gtlyD1ALTl0CVf9lj-IqIbtWrzgCBDoJzUVIeGULMImkNgG4dFyYNBbG5aM5Nq8NqevRD56Mbq8jAYAsXILR3nrzYrUBhl6LSR-GoHHtBoRG4LGs2ETb8-NpMMs"
                />
              </div>
              <div>
                <p
                  className="font-bold text-sm"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  Portal de Administración
                </p>
                <p className="text-xs text-green-700">
                  Acceso exclusivo para personal autorizado
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Login Panel ── */}
        <div className="bg-white p-8 md:p-16 flex flex-col justify-center">
          {/* Mobile brand */}
          <div className="mb-10 flex md:hidden items-center gap-2 text-green-800">
            <span className="material-symbols-outlined text-3xl">
              agriculture
            </span>
            <span
              className="font-extrabold text-xl tracking-tight"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Comisariato
            </span>
          </div>

          {/* Heading */}
          <div className="mb-12">
            <h3
              className="text-3xl font-extrabold text-gray-900 mb-2"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Bienvenido de nuevo
            </h3>
            <p className="text-slate-500 font-medium text-sm">
              Ingresa tus credenciales para acceder al panel administrativo.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email */}
            <div>
              <label
                className="block text-[0.7rem] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1"
                htmlFor="email"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@comisariato.pro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-100 py-4 pl-8 pr-4 text-gray-900 placeholder:text-slate-400 text-sm border-0 border-b-2 border-slate-200 focus:border-green-700 focus:outline-none focus:ring-0 focus:bg-slate-50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label
                  className="block text-[0.7rem] font-bold uppercase tracking-widest text-slate-500 ml-1"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <a
                  className="text-[0.7rem] font-bold text-green-700 hover:underline transition-all"
                  href="#"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  lock
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-100 py-4 pl-8 pr-12 text-gray-900 placeholder:text-slate-400 text-sm border-0 border-b-2 border-slate-200 focus:border-green-700 focus:outline-none focus:ring-0 focus:bg-slate-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-700 transition-colors"
                  title={showPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
                  tabIndex="-1"
                >
                  <span className="material-symbols-outlined text-lg pointer-events-none">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-3 ml-1">
              <input
                id="remember"
                type="checkbox"
                className="w-5 h-5 rounded border-slate-300 text-green-700 focus:ring-green-600/20"
              />
              <label
                className="text-sm font-medium text-slate-600 select-none"
                htmlFor="remember"
              >
                Mantener sesión iniciada
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-green-900/20 hover:scale-[1.01] active:scale-[0.99] transition-transform flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                fontFamily: "Manrope, sans-serif",
                background: loading
                  ? "#166534"
                  : "linear-gradient(135deg, #14532d 0%, #166534 100%)",
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <span className="material-symbols-outlined text-xl">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400 font-medium">
              © 2026 Comisariato Pro S.A.
            </p>
            <div className="flex gap-6">
              <a
                className="text-xs text-slate-400 hover:text-green-700 transition-colors font-medium"
                href="#"
              >
                Soporte Técnico
              </a>
              <a
                className="text-xs text-slate-400 hover:text-green-700 transition-colors font-medium"
                href="#"
              >
                Privacidad
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
