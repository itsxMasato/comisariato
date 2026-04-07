import React from 'react';
import { Link } from 'react-router-dom';

export default function Error403() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <span className="material-symbols-outlined text-[30rem]">lock</span>
      </div>
      
      <div className="z-10 text-center space-y-6">
        <h1 className="text-9xl font-extrabold text-green-800 tracking-tighter">403</h1>
        <h2 className="text-2xl md:text-4xl font-bold font-headline text-gray-900">Acceso Denegado</h2>
        <p className="text-gray-500 max-w-md mx-auto text-lg">
          No tienes los permisos necesarios para acceder a esta sección del portal de administración.
        </p>
        <div className="mt-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}