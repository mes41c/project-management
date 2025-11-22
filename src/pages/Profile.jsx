import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove 
} from 'firebase/firestore';
import { 
  User, Mail, Shield, Calendar, Folder, UserMinus, Settings, Lock, Globe, Eye, EyeOff, CheckCircle, XCircle 
} from 'lucide-react';

export default function Profile() {
  const { uid } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Ayarlar Modu
  const [editMode, setEditMode] = useState(false);
  // Varsayılan Ayarlar: Email kapalı, Geçmiş kapalı
  const [privacy, setPrivacy] = useState({ showEmail: false, showHistory: false });

  const isMe = currentUser.uid === uid;

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Profil Verisi
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) return navigate('/dashboard');
        
        const userData = userSnap.data();
        setProfile(userData);
        // Mevcut ayarları al veya varsayılanları kullan
        const userPrivacy = userData.privacy_settings || { showEmail: false, showHistory: false };
        setPrivacy(userPrivacy);

        // 2. Arkadaşlık Kontrolü
        let friendStatus = false;
        if (!isMe && currentUser) {
          const myRef = doc(db, "users", currentUser.uid);
          const mySnap = await getDoc(myRef);
          if (mySnap.exists()) {
            const myFriends = mySnap.data().friend_ids || [];
            friendStatus = myFriends.includes(uid);
            setIsFriend(friendStatus);
          }
        }

        // 3. Proje Geçmişi (Görünürlük Mantığı)
        // Kural: (Benim profilimse) VEYA (Arkadaşımsa VE Geçmişi Göster izni varsa)
        const canViewProjects = isMe || (friendStatus && userPrivacy.showHistory);

        if (canViewProjects) {
          // HATA ÇÖZÜMÜ:
          // Sorguyu "Arkadaşımın Projeleri"ne göre değil, "BENİM Projelerim"e göre yapıyoruz.
          // Çünkü sadece kendi olduğum projeleri okuma yetkim var.
          const q = query(
            collection(db, "projects"), 
            where("member_uids", "array-contains", currentUser.uid) 
          );
          
          const projectSnaps = await getDocs(q);
          const mutualProjects = [];

          projectSnaps.forEach(doc => {
             const data = doc.data();
             // Eğer profilini gezdiğim kişi (uid) de bu projede varsa listeye ekle.
             // Böylece sadece "ORTAK" projeleri listelemiş oluruz.
             if (data.member_uids.includes(uid)) {
                mutualProjects.push(data);
             }
          });
          
          setProjects(mutualProjects);
        } else {
          setProjects([]);
        }

      } catch (error) {
        console.error("Profil yükleme hatası:", error);
        // Yetki hatası alırsak projeleri boşalt
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [uid, currentUser, isMe, navigate]);

  // --- AKSİYONLAR ---

  const handleUnfriend = async () => {
    if (!confirm(`${profile.username} kişisini arkadaşlıktan çıkarmak istiyor musun?`)) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { friend_ids: arrayRemove(uid) });
      await updateDoc(doc(db, "users", uid), { friend_ids: arrayRemove(currentUser.uid) });
      setIsFriend(false);
      setProjects([]); // Arkadaşlıktan çıkınca projeler gizlenmeli
      alert("Bağlantı koparıldı.");
    } catch (error) { console.error(error); }
  };

  const savePrivacy = async () => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { privacy_settings: privacy });
      setEditMode(false);
      alert("Gizlilik ayarları güncellendi.");
    } catch (error) { console.error(error); }
  };

  const sendMail = () => {
    window.location.href = `mailto:${profile.email}`;
  };

  if (loading) return <Layout><div className="p-10 text-center">Profil taranıyor...</div></Layout>;

  // GÖRÜNÜRLÜK KONTROLLERİ
  const canSeeEmail = isMe || (isFriend && privacy.showEmail);
  const canSeeHistory = isMe || (isFriend && privacy.showHistory);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        
        {/* ÜST KART */}
        <div className="bg-[#1e293b] rounded-2xl p-8 border border-slate-700 mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-[#0f172a] bg-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.username} className="w-full h-full object-cover"/>
                ) : (
                  <span className="text-4xl font-bold text-slate-500 uppercase">{profile.username?.[0]}</span>
                )}
              </div>
            </div>

            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">@{profile.username}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-400 mb-6">
                <span className="flex items-center gap-1"><Shield size={14}/> Operatör</span>
                <span className="flex items-center gap-1"><Calendar size={14}/> Kayıt: {new Date(profile.created_at).toLocaleDateString('tr-TR')}</span>
                
                {/* E-POSTA GÖRÜNÜRLÜĞÜ */}
                {canSeeEmail ? (
                  <button onClick={sendMail} className="flex items-center gap-1 text-[--neon-blue] hover:underline bg-blue-900/20 px-2 py-1 rounded border border-blue-900/50 transition-colors">
                    <Mail size={14}/> {profile.email}
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-slate-600 cursor-not-allowed" title="Gizli Bilgi">
                    <Lock size={14}/> E-posta Gizli
                  </span>
                )}
              </div>

              <div className="flex justify-center md:justify-start gap-3">
                {isMe ? (
                  <button onClick={() => setEditMode(!editMode)} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${editMode ? 'bg-slate-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                    <Settings size={16}/> Gizlilik Ayarları
                  </button>
                ) : isFriend ? (
                  <button onClick={handleUnfriend} className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900 rounded-lg flex items-center gap-2 transition-all">
                    <UserMinus size={16}/> Arkadaşlıktan Çıkar
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-slate-800 text-slate-500 rounded-lg border border-slate-700">Bağlantı Yok</span>
                )}
              </div>
            </div>

            {/* İstatistik */}
            <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 text-center min-w-[150px]">
              <div className="text-2xl font-bold text-white">{projects.length}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Görünür Operasyon</div>
            </div>
          </div>

          {/* --- GİZLİLİK AYARLARI PANELİ (SADECE BEN) --- */}
          {editMode && (
            <div className="mt-8 p-6 bg-slate-900/80 rounded-xl border border-slate-600 animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2"><Lock size={18} className="text-[--neon-blue]"/> Gizlilik Tercihleri</h3>
                <button onClick={savePrivacy} className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-all">
                  <CheckCircle size={14}/> AYARLARI KAYDET
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Ayar 1: E-posta */}
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700">
                  <div>
                    <div className="text-sm text-white font-bold flex items-center gap-2">
                      <Mail size={16}/> E-posta Görünürlüğü
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Arkadaşların e-posta adresini görüp mail atabilir.</div>
                  </div>
                  <button 
                    onClick={() => setPrivacy({ ...privacy, showEmail: !privacy.showEmail })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${privacy.showEmail ? 'bg-[--neon-blue]' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${privacy.showEmail ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                {/* Ayar 2: Geçmiş (YENİ) */}
                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700">
                  <div>
                    <div className="text-sm text-white font-bold flex items-center gap-2">
                      <Folder size={16}/> Operasyon Geçmişi
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Arkadaşların dahil olduğun (ortak) projeleri listeyebilir.</div>
                  </div>
                  <button 
                    onClick={() => setPrivacy({ ...privacy, showHistory: !privacy.showHistory })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${privacy.showHistory ? 'bg-[--neon-blue]' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${privacy.showHistory ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ALT KART: OPERASYON GEÇMİŞİ */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Folder className="text-[--neon-blue]" /> Operasyon Geçmişi
          </h2>
          {!isMe && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              {canSeeHistory ? <Eye size={12}/> : <EyeOff size={12}/>} 
              {canSeeHistory ? "Arkadaş tarafından görünür" : "Gizli Profil"}
            </span>
          )}
        </div>
        
        {canSeeHistory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj, i) => (
              <div key={i} className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 flex justify-between items-center hover:border-slate-500 transition-colors">
                <div>
                  <div className="font-bold text-white">{proj.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <Calendar size={10}/> {new Date(proj.created_at).toLocaleDateString('tr-TR')}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold ${proj.status === 'active' ? 'border-green-900 text-green-500 bg-green-900/20' : 'border-slate-600 text-slate-500'}`}>
                  {proj.status}
                </span>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-12 bg-[#1e293b]/50 rounded-xl border border-dashed border-slate-700">
                <Folder size={32} className="mx-auto text-slate-600 mb-2"/>
                <p className="text-slate-500 text-sm">Görüntülenecek ortak operasyon kaydı yok.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#1e293b]/50 rounded-xl border border-slate-800 p-8 text-center">
            <Lock size={32} className="mx-auto text-slate-600 mb-3"/>
            <h3 className="text-slate-400 font-bold">Bu bilgiler gizli</h3>
            <p className="text-xs text-slate-500 mt-1">Kullanıcı operasyon geçmişini paylaşmıyor.</p>
          </div>
        )}

      </div>
    </Layout>
  );
}