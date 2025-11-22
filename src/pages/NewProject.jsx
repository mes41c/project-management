import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { parseRoadmap } from '../utils/roadmapParser';
import { useNavigate } from 'react-router-dom';
import { Terminal, Users, Save, Play, CheckCircle, FileText } from 'lucide-react';

// HAZIR ŞABLONLAR
const TEMPLATES = {
  pentest_web: `
- Hedef domain keşfi ve alt alan adı (Subdomain) taraması (high)
- WAF (Web Application Firewall) tespiti ve bypass denemeleri
- Login formlarında SQL Injection testleri (acil)
- XSS (Cross-Site Scripting) zafiyet taraması
- Dizin taraması (Gobuster/Dirbuster)
- Raporlama ve dokümantasyon
`,
  pentest_network: `
- Nmap ile port taraması ve servis tespiti (high)
- Zafiyet taraması (Nessus/OpenVAS)
- SMB ve FTP servislerinde anonim giriş kontrolü
- Brute-force saldırı simülasyonu (Hydra)
- Ağ topolojisi haritalama
`,
  dev_react: `
- Proje kurulumu (Vite + React + Tailwind) (high)
- Firebase bağlantısı ve Auth yapısı
- Veritabanı şeması oluşturma
- Ana sayfa ve Dashboard tasarımı
- Deployment (GitHub Pages)
`
};

export default function NewProject() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState('');
  const [roadmap, setRoadmap] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [parsedTasks, setParsedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      try {
        const mySnap = await getDoc(doc(db, "users", currentUser.uid));
        if (mySnap.exists()) {
          setMyProfile(mySnap.data());
          const friendIds = mySnap.data().friend_ids || [];
          const loadedFriends = [];
          for (const id of friendIds) {
            const fSnap = await getDoc(doc(db, "users", id));
            if (fSnap.exists()) loadedFriends.push(fSnap.data());
          }
          setFriendsList(loadedFriends);
        }
      } catch (error) { console.error(error); }
    }
    loadData();
  }, [currentUser]);

  const toggleFriend = (friend) => {
    if (selectedFriends.find(f => f.uid === friend.uid)) {
      setSelectedFriends(selectedFriends.filter(f => f.uid !== friend.uid));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  // ŞABLON SEÇİMİ
  const applyTemplate = (key) => {
    setRoadmap(TEMPLATES[key].trim());
  };

  const handleParse = () => {
    // 1. Boşluk Kontrolü
    if (!projectName.trim() || !roadmap.trim()) {
      return alert("HATA: Proje adı ve görev listesi boş olamaz.");
    }

    // 2. Uzunluk Kontrolü (UI Koruması)
    if (projectName.length > 50) {
      return alert(`HATA: Proje adı çok uzun! (Şu an: ${projectName.length}, Max: 50 karakter).`);
    }

    // 3. İçerik Kontrolü
    if (roadmap.length < 10) {
      return alert("HATA: Yol haritası çok kısa. Lütfen detaylı bir plan girin.");
    }

    const myUsername = myProfile?.username || currentUser.displayName || "Yönetici";
    const fullTeam = [...selectedFriends, { uid: currentUser.uid, username: myUsername }];
    
    const tasks = parseRoadmap(roadmap, fullTeam);
    
    // 4. Parser Çıktı Kontrolü
    if (tasks.length === 0) {
      return alert("HATA: Format anlaşılamadı. Hiçbir görev çıkarılamadı. Lütfen örnek formata uyun.");
    }
    
    // 5. Görev Sayısı Sınırı (Spam Koruması)
    if (tasks.length > 100) {
      return alert("HATA: Bir projede en fazla 100 görev olabilir. Lütfen planı bölün.");
    }

    setParsedTasks(tasks);
    setStep(2);
  };

  const handleSaveProject = async () => {
    setLoading(true);
    try {
      const myUsername = myProfile?.username || "Yönetici";
      const fullTeam = [...selectedFriends, { uid: currentUser.uid, username: myUsername }];
      const teamUIDs = fullTeam.map(u => u.uid);

      const projectRef = await addDoc(collection(db, "projects"), {
        name: projectName,
        owner_uid: currentUser.uid,
        member_uids: teamUIDs,
        created_at: new Date().toISOString(),
        status: 'active'
      });

      for (const task of parsedTasks) {
        await addDoc(collection(db, `projects/${projectRef.id}/tasks`), task);
      }
      navigate('/dashboard');
    } catch (error) { console.error(error); alert("Hata: " + error.message); } finally { setLoading(false); }
  };

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Terminal className="text-[--neon-blue]" /> Manuel Operasyon Başlatıcı
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
            <label className="block text-slate-400 text-sm mb-2 font-bold">OPERASYON KOD ADI</label>
            <input className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-[--neon-blue] outline-none font-mono" placeholder="örn: Project_Chimera" value={projectName} onChange={e => setProjectName(e.target.value)} disabled={step === 2}/>
          </div>

          {step === 1 && (
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-slate-400 text-sm font-bold">GÖREV LİSTESİ</label>
                
                {/* ŞABLON BUTONLARI */}
                <div className="flex gap-2">
                  <button onClick={() => applyTemplate('pentest_web')} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded border border-slate-600">Web Pentest</button>
                  <button onClick={() => applyTemplate('pentest_network')} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded border border-slate-600">Network</button>
                  <button onClick={() => applyTemplate('dev_react')} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded border border-slate-600">React Dev</button>
                </div>
              </div>
              
              <textarea className="w-full h-64 bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-[--neon-blue] outline-none font-mono text-sm leading-6" placeholder="- Görev @isim (acil)..." value={roadmap} onChange={e => setRoadmap(e.target.value)}></textarea>
              
              <p className="text-xs text-slate-500 mt-2">* Atama yapmak için görevlerin sonuna <span className="text-yellow-500">@kullaniciadi</span> ekleyin.</p>
            </div>
          )}

          {step === 2 && (
            <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Önizleme</h3>
                <button onClick={() => setStep(1)} className="text-xs text-[--neon-blue] underline">Düzenle</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs text-slate-200 uppercase bg-slate-800">
                    <tr><th className="px-4 py-3">Görev</th><th className="px-4 py-3">Ajan</th><th className="px-4 py-3">Öncelik</th></tr>
                  </thead>
                  <tbody>
                    {parsedTasks.map((task, idx) => (
                      <tr key={idx} className="border-b border-slate-700">
                        <td className="px-4 py-3 text-white">{task.title}</td>
                        <td className="px-4 py-3 text-[--neon-blue]">@{task.assigned_to_username}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${task.priority === 'high' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>{task.priority}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 h-fit">
          <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users size={20} className="text-green-500"/> Ekip</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-[--neon-blue]"><span className="font-bold text-sm text-white">@{myProfile?.username || "..."} (Ben)</span><CheckCircle size={16} className="text-[--neon-blue]" /></div>
              {friendsList.map(friend => {
                const isSelected = selectedFriends.find(f => f.uid === friend.uid);
                return (
                  <div key={friend.uid} onClick={() => toggleFriend(friend)} className={`flex items-center justify-between p-3 rounded cursor-pointer border transition-all ${isSelected ? 'bg-green-900/20 border-green-500 text-white' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                    <span className="text-sm">@{friend.username}</span>{isSelected && <CheckCircle size={16} className="text-green-500" />}
                  </div>
                )
              })}
            </div>
          </div>
          {step === 1 ? (
            <button onClick={handleParse} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Play size={20} /> GÖREVLERİ AYRIŞTIR</button>
          ) : (
            <button onClick={handleSaveProject} disabled={loading} className="w-full bg-[--neon-blue] hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">{loading ? 'KAYDEDİLİYOR...' : <><Save size={20} /> ONAYLA VE BAŞLAT</>}</button>
          )}
        </div>
      </div>
    </Layout>
  );
}