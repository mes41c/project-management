import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[--bg-dark] text-white flex">
      <Sidebar />
      {/* İçerik Alanı (Sidebar'ın genişliği kadar sağdan başlar) */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        {children}
      </div>
    </div>
  );
}