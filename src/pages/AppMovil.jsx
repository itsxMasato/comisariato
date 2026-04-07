import React from 'react';

export default function AppMovil() {
  return (
    <div className="bg-surface font-body text-on-surface flex flex-col min-h-screen">
      <main className="flex-grow pt-8 pb-12">

        {/* ── Hero ── */}
        <section className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-primary font-bold tracking-widest label-md uppercase">Comisariato Pro</span>
              <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-on-surface tracking-tight leading-tight">
                Lleva el Comisariato Pro en tu bolsillo
              </h1>
              <p className="text-on-surface-variant text-lg max-w-xl">
                Gestiona tus beneficios de forma eficiente. Realiza pedidos rápidos, consulta tu saldo en Lempiras en tiempo real y reserva productos exclusivos desde cualquier lugar.
              </p>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-col sm:flex-row items-center gap-8 bg-surface-container-low p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm">
              <div className="flex-grow w-full sm:w-auto">
                <a
                  href="#"
                  download
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 primary-gradient text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>android</span>
                  Descargar APK ahora
                </a>
              </div>
              <div className="flex items-center gap-4 border-l border-outline-variant/20 pl-0 sm:pl-8">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <img
                    alt="QR Code Comisariato Pro"
                    className="w-20 h-20"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3urTREWeSxgFfuVNzWleZxbd9X6tFLSfgQkLel38CdS51Q2NPORK4Dp4YlFIdFF0eS2DjXX35ZTGcVptxRMfb5wt7igU1l5C8DLVPhAhf4aa64Z0Q_bWHMwfRhTbnyQCvQrWshlKpA7hd3TBdWdylNRkuQKKqjtwRT3tgaT0A0mrlSW6LlsaEuR8QiVCe--pEAZ7mUMR3n6l481qOW76p-VBPkjusZSwW5CCj95x_lDuJdxWmAzkbdTdb5H5FbO4-MczyEbzEPr4"
                  />
                </div>
                <p className="text-sm font-semibold text-on-surface-variant leading-tight">
                  Escanea para<br />instalar directamente
                </p>
              </div>
            </div>
          </div>

          {/* Mockups */}
          <div className="relative flex justify-center items-center h-[500px]">
            <div className="absolute -z-10 w-80 h-80 bg-primary-fixed-dim/30 rounded-full blur-3xl" />
            <div className="relative z-10 flex gap-4 -rotate-6">

              {/* Pantalla 1 — Dashboard */}
              <div className="w-64 h-[480px] bg-white rounded-[2.5rem] p-3 shadow-2xl border-8 border-on-surface ring-1 ring-outline-variant transform -translate-y-4">
                <div className="bg-surface-container-lowest h-full w-full rounded-[1.8rem] overflow-hidden flex flex-col">
                  <div className="h-6 w-full flex justify-center items-end pb-1">
                    <div className="w-20 h-4 bg-on-surface rounded-full" />
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant leading-none">Bienvenido</p>
                          <p className="text-xs font-black text-on-surface">Comisariato Pro</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-primary text-xl">notifications</span>
                    </div>
                    <div className="bg-primary-container p-4 rounded-2xl">
                      <p className="text-xs opacity-80 text-white">Saldo disponible</p>
                      <p className="text-2xl font-black text-white">L 1,240.50</p>
                      <p className="text-[10px] text-white/60 mt-1">Período: Junio 2026</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Categorías</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-14 bg-surface-container rounded-xl flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-primary text-base">inventory_2</span>
                          <p className="text-[9px] font-bold text-on-surface-variant">Productos</p>
                        </div>
                        <div className="h-14 bg-surface-container rounded-xl flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-primary text-base">credit_card</span>
                          <p className="text-[9px] font-bold text-on-surface-variant">Créditos</p>
                        </div>
                        <div className="h-14 bg-surface-container rounded-xl flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-primary text-base">event_available</span>
                          <p className="text-[9px] font-bold text-on-surface-variant">Reservas</p>
                        </div>
                        <div className="h-14 bg-surface-container rounded-xl flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-primary text-base">receipt_long</span>
                          <p className="text-[9px] font-bold text-on-surface-variant">Historial</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pantalla 2 — Productos */}
              <div className="w-64 h-[480px] bg-white rounded-[2.5rem] p-3 shadow-2xl border-8 border-on-surface ring-1 ring-outline-variant transform translate-y-8 translate-x-[-20px]">
                <div className="bg-surface-container-lowest h-full w-full rounded-[1.8rem] overflow-hidden flex flex-col">
                  <div className="h-6 w-full flex justify-center items-end pb-1">
                    <div className="w-20 h-4 bg-on-surface rounded-full" />
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">arrow_back</span>
                      <p className="font-black text-on-surface">Productos</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-7 bg-surface-container rounded-lg" />
                      <div className="w-7 h-7 bg-primary-container rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-sm">tune</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'Azúcar Refinada 1kg', price: 'L 30.50' },
                        { name: 'Aceite Vegetal 1L',   price: 'L 87.00' },
                        { name: 'Arroz Premium 5lb',   price: 'L 58.75' },
                        { name: 'Frijoles Rojos 1lb',  price: 'L 22.00' },
                      ].map((item) => (
                        <div key={item.name} className="flex gap-3 items-center p-2 bg-surface-container-low rounded-xl">
                          <div className="w-11 h-11 bg-white rounded-lg flex-shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-surface-container-highest text-xl">grocery</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate">{item.name}</p>
                            <p className="text-xs text-primary font-black">{item.price}</p>
                          </div>
                          <span className="material-symbols-outlined text-primary text-base flex-shrink-0">add_circle</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Guía de instalación ── */}
        <section className="bg-surface-container-low py-24">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-headline text-4xl font-extrabold text-on-surface">Guía de Instalación Visual</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                Sigue estos sencillos pasos para tener <strong>Comisariato Pro</strong> configurado en tu dispositivo Android en menos de 2 minutos.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n: 1, icon: 'download_for_offline', title: 'Descarga el archivo',  desc: "Haz clic en 'Descargar APK' para obtener el instalador oficial de Comisariato Pro." },
                { n: 2, icon: 'security',             title: 'Habilita orígenes',    desc: 'En ajustes de seguridad, permite la instalación de aplicaciones de orígenes desconocidos.' },
                { n: 3, icon: 'login',                title: 'Inicia sesión',        desc: 'Abre Comisariato Pro e ingresa con tu código de empleado y contraseña del portal corporativo.' },
              ].map(({ n, icon, title, desc }) => (
                <div key={n} className="group relative bg-surface-container-lowest p-8 rounded-[2rem] border border-transparent hover:border-primary/20 transition-all duration-300">
                  <div className="absolute -top-4 -left-4 w-12 h-12 primary-gradient text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg">{n}</div>
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-primary-fixed-dim rounded-2xl flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-4xl">{icon}</span>
                    </div>
                    <h3 className="font-headline text-xl font-bold">{title}</h3>
                    <p className="text-on-surface-variant text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Asistencia técnica ── */}
        <section className="max-w-7xl mx-auto px-8 py-24">
          <div className="glass-card p-12 rounded-[2.5rem] border border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-tertiary-fixed-dim/20 rounded-full blur-3xl" />
            <div className="space-y-4 relative z-10">
              <h2 className="font-headline text-3xl font-extrabold text-on-surface">¿Necesitas asistencia técnica?</h2>
              <p className="text-on-surface-variant text-lg max-w-lg">
                Si experimentas dificultades con la descarga o instalación de <strong>Comisariato Pro</strong>, nuestro equipo está listo para ayudarte personalmente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 relative z-10 w-full md:w-auto">
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-outline-variant/10">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined">support_agent</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Oficina de TI</p>
                  <p className="font-semibold">Planta Baja — Ala Norte</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-outline-variant/10">
                <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-tertiary-fixed">
                  <span className="material-symbols-outlined">badge</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Recursos Humanos</p>
                  <p className="font-semibold">Módulo de Atención</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}