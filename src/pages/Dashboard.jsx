import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Folder, Clock, MoreVertical, ChevronRight, Plus, Search, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) setUserData(userDoc.data());

        const q = query(collection(db, "projects"), where("member_uids", "array-contains", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const loadedProjects = [];
        querySnapshot.forEach((doc) => { loadedProjects.push({ id: doc.id, ...doc.data() }); });
        loadedProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setProjects(loadedProjects);
      } catch (error) {
        console.error("Veri hatası:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? p.status !== 'completed' : p.status === 'completed';
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      {/* HEADER - DÜZELTİLDİ */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 border-b border-slate-800 pb-6 gap-4">
        
        {/* Sol: Başlık */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Operasyon Merkezi</h1>
          <p className="text-slate-400 text-sm">
            {loading ? "Bağlantı kuruluyor..." : `Hoşgeldin, @${userData?.username || "Operatör"}.`}
          </p>
        </div>

        {/* Sağ: Araçlar ve Profil */}
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
          
          {/* Arama */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18}/>
            <input 
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 w-full focus:border-[--neon-blue] outline-none transition-all"
              placeholder="Operasyon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtreler */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button onClick={() => setFilterStatus('active')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'active' ? 'bg-[--neon-blue] text-white' : 'text-slate-400 hover:text-white'}`}>AKTİF</button>
            <button onClick={() => setFilterStatus('completed')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'completed' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}>BİTEN</button>
            <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>TÜMÜ</button>
          </div>

          {/* GERİ GELEN PROFİL KARTI */}
          <div 
            onClick={() => navigate(`/profile/${currentUser?.uid}`)}
            className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700 cursor-pointer hover:border-[--neon-blue] hover:bg-slate-800 transition-all group ml-2"
          >
            <div className="text-right hidden xl:block">
              <div className="text-xs font-bold text-[--neon-blue] group-hover:text-white transition-colors">
                @{userData?.username || "..."}
              </div>
            </div>
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-[--neon-blue] group-hover:scale-105 transition-transform"/>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[--neon-blue] font-bold uppercase group-hover:text-white">
                {userData?.username?.[0]}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* İÇERİK (Aynı kalacak) */}
      {loading ? (
        <div className="flex justify-center pt-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[--neon-blue]"></div></div>
      ) : filteredProjects.length === 0 ? (
        <div className="col-span-full text-center py-20 bg-slate-800/20 rounded-xl border border-dashed border-slate-700 animate-fadeIn">
          <Folder size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl text-slate-300 mb-2">{searchTerm ? "Eşleşme yok." : "Görüntülenecek operasyon yok."}</h3>
          <button onClick={() => navigate('/new-project')} className="bg-[--neon-blue] text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-all font-bold flex items-center gap-2 mx-auto mt-4"><Plus size={20} /> Yeni Operasyon Başlat</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {filteredProjects.map((project) => (
            <div key={project.id} onClick={() => navigate(`/project/${project.id}`)} className="group bg-[#1e293b] border border-slate-700 hover:border-[--neon-blue] p-6 rounded-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all ${project.status === 'completed' ? 'from-green-500 to-emerald-400' : 'from-transparent via-slate-700 to-transparent group-hover:via-[--neon-blue]'}`}></div>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg transition-colors ${project.status === 'completed' ? 'bg-green-900/20 text-green-500' : 'bg-slate-800 text-slate-400 group-hover:text-[--neon-blue]'}`}>
                  {project.status === 'completed' ? <CheckCircle size={24}/> : <Folder size={24}/>}
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-[--neon-blue] transition-colors">{project.name}</h3>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                <div className="flex items-center gap-1"><Clock size={14} /><span>{new Date(project.created_at).toLocaleDateString('tr-TR')}</span></div>
                <div className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-green-500' : 'bg-[--neon-blue]'}`}></span><span className="uppercase">{project.status === 'completed' ? 'BAŞARILI' : 'AKTİF'}</span></div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                <div className="flex -space-x-2">
                  {project.member_uids.slice(0, 3).map((uid, i) => <div key={i} className="w-8 h-8 rounded-full bg-slate-600 border-2 border-[#1e293b] flex items-center justify-center text-[10px] text-white font-bold">U{i+1}</div>)}
                  {project.member_uids.length > 3 && <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#1e293b] flex items-center justify-center text-[10px] text-white">+{project.member_uids.length - 3}</div>}
                </div>
                <div className="flex items-center gap-1 text-[--neon-blue] text-xs font-bold group-hover:translate-x-1 transition-transform">İncele <ChevronRight size={16} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}