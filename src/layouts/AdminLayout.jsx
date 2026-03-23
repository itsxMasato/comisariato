import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from '../components/SideBar';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <SideBar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Empujamos el contenido a la derecha solo cuando el sidebar está abierto */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : "ml-0"
        }`}
      >
        <main className="flex-1 overflow-x-hidden bg-gray-50 p-6 md:p-10 lg:pl-12">
          {/* Outlet is where the nested pages (Dashboard, Productos, etc.) render */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}