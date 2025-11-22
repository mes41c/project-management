// src/pages/SetUsername.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Terminal, ChevronRight } from 'lucide-react';

export default function SetUsername() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { completeRegistration, currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleSave(e) {
    e.preventDefault();
    if(!username.trim()) return;
    
    setLoading(true);
    try {
      await completeRegistration(username);
      navigate('/dashboard');
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert("Bir hata oluştu. Lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-mono text-white">
      <div className="w-full max-w-md p-8 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl">
        
        <div className="text-center mb-8">
          <Terminal className="w-12 h-12 text-[--neon-blue] mx-auto mb-4" />
          <h2 className="text-2xl font-bold tracking-wider">KİMLİK TANIMLAMA</h2>
          <p className="text-slate-400 text-sm mt-2">Sistemde görünecek kod adınızı belirleyin.</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-6">
            <label className="block text-xs text-[--neon-blue] mb-2 uppercase font-bold">
              Kod Adı (Handle)
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-600 p-3 text-white focus:border-[--neon-blue] focus:outline-none rounded transition-colors"
              placeholder="örn: ShadowHunter"
              autoFocus
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-[--neon-blue] hover:bg-blue-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(14,165,233,0.4)]"
          >
            {loading ? 'KİMLİK OLUŞTURULUYOR...' : (
              <>ONAYLA VE GİRİŞ YAP <ChevronRight size={20} /></>
            )}
          </button>
        </form>

        <div className="mt-6 text-xs text-center text-slate-500">
          E-posta adresiniz: <span className="text-slate-300">{currentUser?.email}</span>
        </div>

      </div>
    </div>
  );
}