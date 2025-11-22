import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusSquare, Users, LogOut, Shield, User } from 'lucide-react';

export default function Sidebar() {
  const { logout, currentUser } = useAuth(); // currentUser'ı buradan alıyoruz
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Operasyon Merkezi', path: '/dashboard' },
    { icon: <PlusSquare size={20} />, label: 'Yeni Proje', path: '/new-project' },
    { icon: <Users size={20} />, label: 'Ekip & Arkadaşlar', path: '/social' },
  ];

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Çıkış hatası", error);
    }
  }

  return (
    <div className="w-64 bg-[#1e293b] border-r border-slate-700 flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Logo Alanı */}
      <div className="p-6 border-b border-slate-700 flex items-center gap-3 text-[--neon-blue]">
        <Shield size={28} />
        <span className="font-bold tracking-wider text-lg">SECURE.PLAN</span>
      </div>

      {/* Menü Linkleri */}
      <div className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 
              ${location.pathname === item.path 
                ? 'bg-[--neon-blue]/10 text-[--neon-blue] border-r-2 border-[--neon-blue]' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Alt Kısım: Profil ve Çıkış */}
      <div className="p-4 border-t border-slate-700 space-y-2">
        
        {/* Profil Butonu (YENİ EKLENDİ) */}
        <button
          onClick={() => navigate(`/profile/${currentUser?.uid}`)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
            ${location.pathname.includes('/profile') 
                ? 'bg-[--neon-blue]/10 text-[--neon-blue]' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
        >
          <User size={18} />
          <span className="font-medium text-sm">Profilim</span>
        </button>

        {/* Çıkış Butonu */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-900/10 hover:text-red-300 rounded transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Sistemi Kapat</span>
        </button>
      </div>
    </div>
  );
}