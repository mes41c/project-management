import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove, onSnapshot, getDoc 
} from 'firebase/firestore';
import { UserPlus, Search, UserCheck, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // <-- EKLENDİ

export default function Social() {
  const { currentUser } = useAuth();
  const navigate = useNavigate(); // <-- EKLENDİ
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [myProfile, setMyProfile] = useState(null);
  const [friendList, setFriendList] = useState([]);

  useEffect(() => {
    if (currentUser) {
      const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMyProfile(data);
          if (data.friend_ids && data.friend_ids.length > 0) {
            fetchFriendsDetails(data.friend_ids);
          } else {
            setFriendList([]); // Arkadaş kalmadıysa listeyi temizle
          }
        }
      });
      return () => unsub();
    }
  }, [currentUser]);

  async function fetchFriendsDetails(ids) {
    const friendsData = [];
    for (const id of ids) {
      const friendSnap = await getDoc(doc(db, "users", id));
      if (friendSnap.exists()) friendsData.push(friendSnap.data());
    }
    setFriendList(friendsData);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    setSearchResult(null);
    setMessage('');

    try {
      const q = query(collection(db, "users"), where("username", "==", searchTerm));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userFound = querySnapshot.docs[0].data();
        if (userFound.uid === currentUser.uid) {
          setMessage("Kendini ekleyemezsin.");
        } else {
          setSearchResult(userFound);
        }
      } else {
        setMessage("Operatör bulunamadı.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Sistem hatası.");
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest() {
    if (!searchResult) return;
    try {
      const targetRef = doc(db, "users", searchResult.uid);
      await updateDoc(targetRef, { pending_requests: arrayUnion(currentUser.uid) });
      setMessage("İstek iletildi.");
      setSearchResult(null);
    } catch (error) {
      console.error(error);
    }
  }

  async function acceptRequest(requesterId) {
    try {
      const myRef = doc(db, "users", currentUser.uid);
      await updateDoc(myRef, { friend_ids: arrayUnion(requesterId), pending_requests: arrayRemove(requesterId) });
      const theirRef = doc(db, "users", requesterId);
      await updateDoc(theirRef, { friend_ids: arrayUnion(currentUser.uid) });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Users className="text-[--neon-blue]" /> Ekip & Bağlantılar
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SOL KOLON */}
        <div className="space-y-8">
          <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white">Operatör Ara</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Kod Adı (Username) girin..." 
                className="flex-1 bg-slate-900 border border-slate-600 rounded p-3 text-white focus:border-[--neon-blue] outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button disabled={loading} className="bg-[--neon-blue] p-3 rounded text-white hover:bg-blue-600"><Search /></button>
            </form>
            {message && <p className="mt-3 text-yellow-400 text-sm">{message}</p>}
            
            {searchResult && (
              <div className="mt-4 p-4 bg-slate-800 rounded flex items-center justify-between border border-slate-600 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white uppercase">
                    {searchResult.username[0]}
                  </div>
                  <div>
                    <div className="font-bold text-[--neon-blue]">{searchResult.username}</div>
                    <div className="text-xs text-slate-400">Analist</div>
                  </div>
                </div>
                {myProfile?.friend_ids?.includes(searchResult.uid) ? (
                  <span className="text-green-500 text-sm flex items-center gap-1"><UserCheck size={16}/> Ekipte</span>
                ) : (
                  <button onClick={sendRequest} className="text-sm bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white flex items-center gap-1"><UserPlus size={16} /> Ekle</button>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Clock className="text-yellow-500" /> Bekleyen İstekler</h2>
            {myProfile?.pending_requests?.length === 0 ? (
              <p className="text-slate-500 text-sm">İstek yok.</p>
            ) : (
              <div className="space-y-3">
                {myProfile?.pending_requests.map((reqId) => (
                  <RequestCard key={reqId} requesterId={reqId} onAccept={() => acceptRequest(reqId)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ KOLON: Arkadaşlarım */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 h-fit">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><UserCheck className="text-green-500" /> Aktif Ekip Üyeleri</h2>
          {friendList.length === 0 ? (
            <div className="text-center py-10 text-slate-500"><p>Listeniz boş.</p></div>
          ) : (
            <div className="space-y-3">
              {friendList.map(friend => (
                <div key={friend.uid} className="flex items-center justify-between p-3 bg-slate-800/50 rounded hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-600">
                  <div className="flex items-center gap-3">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white uppercase">{friend.username[0]}</div>
                    )}
                    <div>
                      <div className="font-bold text-white">{friend.username}</div>
                      <div className="text-xs text-green-400">Çevrimiçi</div>
                    </div>
                  </div>
                  
                  {/* DÜZELTİLEN KISIM: ARTIK TIKLANABİLİR */}
                  <button 
                    onClick={() => navigate(`/profile/${friend.uid}`)} 
                    className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white transition-colors"
                  >
                    Profil
                  </button>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

function RequestCard({ requesterId, onAccept }) {
  const [user, setUser] = useState(null);
  useEffect(() => { getDoc(doc(db, "users", requesterId)).then(snap => { if(snap.exists()) setUser(snap.data()); }); }, [requesterId]);
  if (!user) return <div className="animate-pulse h-12 bg-slate-800 rounded"></div>;
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-600">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[--neon-blue] text-white flex items-center justify-center font-bold text-xs uppercase">{user.username[0]}</div>
        <span className="font-bold">{user.username}</span>
      </div>
      <button onClick={onAccept} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Kabul Et</button>
    </div>
  );
}