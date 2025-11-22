// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';

export default function Login() {
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleGoogleLogin() {
    try {
      setError('');
      const result = await loginWithGoogle();
    
      if (result.isNewUser) {
        navigate('/set-username'); // Yeni ise isim seçmeye git
      } else {
        navigate('/dashboard'); // Eskiyse dashboard'a git
      }
    } catch (err) {
      setError('Giriş sistemi yanıt vermiyor.');
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg-dark] p-4 relative overflow-hidden">
      
      {/* Arka plan için dekoratif siber daireler */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[--neon-blue] opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 opacity-10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-[#1e293b]/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-10 text-center relative z-10">
        
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-6 border border-[--neon-blue] shadow-[0_0_15px_rgba(14,165,233,0.3)]">
          <Shield className="text-[--neon-blue]" size={40} />
        </div>

        <h2 className="text-3xl font-bold text-white mb-2 tracking-wider">SECURE.ACCESS</h2>
        <p className="text-slate-400 mb-8">Proje Yönetim Sistemine Güvenli Giriş</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-6 flex items-center justify-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full py-4 px-6 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02]"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-6 h-6"
          />
          Google ile Devam Et
        </button>

        <div className="mt-8 text-xs text-slate-500">
          <p>Sadece yetkili personel içindir.</p>
          <p className="mt-1 font-mono">v1.0.2 Secure Build</p>
        </div>
      </div>
    </div>
  );
}