import React from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from '../components/SideBar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <SideBar />
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6 md:p-10">
          {/* Outlet is where the nested pages (Dashboard, Productos, etc.) render */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}