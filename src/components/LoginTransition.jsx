import { useEffect, useRef } from "react";

export default function LoginTransition({ userName = "Usuario", onDone }) {
  const ripplesRef = useRef(null);
  const particlesRef = useRef(null);

  useEffect(() => {
    // Ripples
    const delays = [0, 300, 650, 1050];
    delays.forEach((delay, i) => {
      setTimeout(() => {
        const size = 140 + i * 120;
        const el = document.createElement("div");
        el.style.cssText = `
          position:absolute; border-radius:50%;
          background:rgba(255,255,255,0.07);
          width:${size}px; height:${size}px;
          animation: rippleExpand 1.8s ease-out forwards;
        `;
        ripplesRef.current?.appendChild(el);
        setTimeout(() => el.remove(), 1900);
      }, delay);
    });

    // Partículas
    for (let i = 0; i < 18; i++) {
      setTimeout(() => {
        const size = 3 + Math.random() * 5;
        const x = 10 + Math.random() * 80;
        const y = 30 + Math.random() * 60;
        const dur = 1.2 + Math.random() * 1;
        const p = document.createElement("div");
        p.style.cssText = `
          position:absolute; border-radius:50%; background:rgba(255,255,255,0.6);
          width:${size}px; height:${size}px;
          left:${x}%; top:${y}%;
          animation: floatUp ${dur}s linear forwards;
        `;
        particlesRef.current?.appendChild(p);
        setTimeout(() => p.remove(), dur * 1000 + 50);
      }, 900 + i * 80);
    }

    // Navegar al dashboard tras la animación
    const timer = setTimeout(() => onDone?.(), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes rippleExpand {
          from { transform: scale(0); opacity: 1; }
          to   { transform: scale(1); opacity: 0; }
        }
        @keyframes floatUp {
          from { transform: translateY(0) scale(1); opacity: 0.8; }
          to   { transform: translateY(-140px) scale(0); opacity: 0; }
        }
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fillBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 100%)" }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.08,
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ripples */}
        <div
          ref={ripplesRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        />

        {/* Partículas */}
        <div ref={particlesRef} className="absolute inset-0 pointer-events-none" />

        {/* Círculo con check */}
        <div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 80, height: 80,
            background: "rgba(255,255,255,0.12)",
            border: "2px solid rgba(255,255,255,0.25)",
            animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M5 12l5 5L19 7"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: "drawCheck 0.5s ease-out 0.85s forwards",
              }}
            />
          </svg>
        </div>

        {/* Texto */}
        <div
          className="relative z-10 text-center mt-7"
          style={{ animation: "fadeUp 0.5s ease-out 1s both" }}
        >
          <p
            className="text-white text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            ¡Bienvenido, {userName}!
          </p>
          <p className="text-green-200 text-sm mt-1 font-medium">
            Acceso verificado · Redirigiendo al panel...
          </p>
        </div>

        {/* Barra de progreso */}
        <div
          className="relative z-10 mt-7 rounded-full overflow-hidden"
          style={{
            width: 180, height: 3,
            background: "rgba(255,255,255,0.12)",
            animation: "fadeUp 0.4s ease 1.1s both",
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "rgba(255,255,255,0.7)",
              animation: "fillBar 1.4s cubic-bezier(0.4,0,0.2,1) 1.2s both",
            }}
          />
        </div>

        <p
          className="relative z-10 mt-3 text-green-300/50 font-bold tracking-widest"
          style={{ fontSize: 10, animation: "fadeUp 0.4s ease 1.3s both" }}
        >
          COMISARIATO PRO
        </p>
      </div>
    </>
  );
}
