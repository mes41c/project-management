import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText } from 'lucide-react'; // İkon
import { 
  doc, collection, onSnapshot, updateDoc, deleteDoc, addDoc, orderBy, query, getDoc 
} from 'firebase/firestore';
import { 
  Trash2, ShieldAlert, Users, User, Calendar, Tag, Activity, X, Send, History, Lock, Copy, Check, CheckCircle, Award, 
  ArrowRight, ArrowLeft, Search, Link as LinkIcon, ExternalLink // <-- YENİ EKLENENLER
} from 'lucide-react';

import Confetti from 'react-confetti'; // YENİ: Konfeti

export default function ProjectDetails() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [viewMode, setViewMode] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [taskSearch, setTaskSearch] = useState('');
  
  // YENİ: Konfeti Kontrolü
  const [showConfetti, setShowConfetti] = useState(false);

  // --- VERİ DİNLEME ---
  useEffect(() => {
    if (!id) return;
    
    const unsubProject = onSnapshot(doc(db, "projects", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProject({ id: docSnap.id, ...data });
        // Eğer proje zaten tamamlanmışsa konfeti gösterme, sadece statik kalsın.
      } else {
        navigate('/dashboard');
      }
    });

    const unsubTasks = onSnapshot(collection(db, "projects", id, "tasks"), (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setTasks(loaded);
    });

    const qLogs = query(collection(db, "projects", id, "activities"), orderBy("created_at", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(d => d.data());
      setActivities(logs);

      const lastRead = parseInt(localStorage.getItem(`read_logs_${id}`) || "0");
      if (logs.length > lastRead) setUnreadCount(logs.length - lastRead);
      else setUnreadCount(0);
    });

    return () => { unsubProject(); unsubTasks(); unsubLogs(); };
  }, [id, navigate]);

  // --- AKSİYONLAR ---

  const toggleHistory = () => {
    const newState = !showHistory;
    setShowHistory(newState);
    if (newState) {
      localStorage.setItem(`read_logs_${id}`, activities.length.toString());
      setUnreadCount(0);
    }
  };

  const logAction = async (text) => {
    await addDoc(collection(db, "projects", id, "activities"), {
      text: text,
      user: currentUser.displayName || currentUser.email.split('@')[0],
      created_at: new Date().toISOString()
    });
  };

  const moveTask = async (taskId, taskTitle, currentStatus, direction) => {
    // Proje tamamlandıysa hareket ettirmeyi engelle (Opsiyonel, şu an açık bırakıyorum)
    const statusOrder = ['todo', 'in_progress', 'review', 'done'];
    const idx = statusOrder.indexOf(currentStatus);
    const newIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (newIdx >= 0 && newIdx < statusOrder.length) {
      const newStatus = statusOrder[newIdx];
      await updateDoc(doc(db, "projects", id, "tasks", taskId), { status: newStatus });
      const statusNames = { todo: "Yapılacak", in_progress: "İşlemde", review: "Kontrol", done: "Tamamlandı" };
      logAction(`'${taskTitle.substring(0, 15)}...' görevini '${statusNames[newStatus]}' aşamasına taşıdı.`);
    }
  };

  // YENİ: PROJE TAMAMLAMA FONKSİYONU
  const handleCompleteProject = async () => {
    if (confirm("Tebrikler! Tüm görevler bitti. Operasyonu 'BAŞARILI' olarak işaretleyip kapatmak istiyor musunuz?")) {
      try {
        await updateDoc(doc(db, "projects", id), {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
        logAction("🏆 OPERASYON BAŞARIYLA TAMAMLANDI! 🏆");
        setShowConfetti(true);
        // 5 saniye sonra konfetiyi durdur
        setTimeout(() => setShowConfetti(false), 8000);
      } catch (error) {
        console.error("Tamamlama hatası:", error);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (confirm("Projeyi silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, "projects", id));
      navigate('/dashboard');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const colors = {
      dark: [15, 23, 42],
      blue: [14, 165, 233],
      gray: [100, 116, 139],
      light: [241, 245, 249],
      red: [239, 68, 68],
      green: [34, 197, 94],
      orange: [249, 115, 22]
    };

    // YARDIMCI: Türkçe Karakter Düzeltici (PDF Standart Fontu İçin)
    // Bu fonksiyon bozuk karakterleri (, 10lk vb.) engeller ve satır kaydırmayı düzeltir.
    const trFix = (str) => {
      if (!str) return "";
      return str
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C');
    };

    // 1. HEADER
    doc.setFontSize(22);
    doc.setTextColor(...colors.dark);
    doc.setFont("helvetica", "bold");
    doc.text("SECURE.PLAN", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(...colors.gray);
    doc.setFont("helvetica", "normal");
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth - 14, 20, { align: 'right' });

    doc.setDrawColor(...colors.blue);
    doc.setLineWidth(1);
    doc.line(14, 25, pageWidth - 14, 25);

    // 2. INFO BOX
    doc.setFillColor(...colors.light);
    doc.rect(14, 35, pageWidth - 28, 35, 'F');

    doc.setFontSize(16);
    doc.setTextColor(...colors.blue);
    doc.setFont("helvetica", "bold");
    doc.text(trFix(project.name).toUpperCase(), 20, 48); // Proje ismini de düzelt

    doc.setFontSize(10);
    doc.setTextColor(...colors.dark);
    doc.setFont("helvetica", "bold");
    
    doc.text("Operasyon ID:", 20, 58);
    doc.setFont("helvetica", "normal");
    doc.text(id, 50, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Durum:", 120, 58);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...(project.status === 'completed' ? colors.green : colors.blue));
    doc.text(project.status === 'active' ? 'AKTIF' : 'TAMAMLANDI', 140, 58);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.dark);
    doc.text("Tamamlanma:", 20, 65);
    doc.setFont("helvetica", "normal");
    doc.text(`%${calculateProgress()}`, 50, 65);

    // 3. TABLO HAZIRLIĞI
    const tableColumn = ["GOREV", "SORUMLU", "DURUM", "ONCELIK", "BITIS"];
    const tableRows = [];

    tasks.forEach(task => {
      const taskData = [
        trFix(task.title), // <-- Görev başlığını düzelt
        `@${trFix(task.assigned_to_username)}`,
        task.status.toUpperCase().replace('_', ' '),
        task.priority.toUpperCase(),
        task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : '-'
      ];
      tableRows.push(taskData);
    });

    // 4. TABLO ÇİZİMİ (SÜTUN GENİŞLİK AYARLARIYLA)
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      theme: 'grid',
      styles: { 
        fontSize: 9, 
        cellPadding: 3,
        textColor: colors.dark,
        lineColor: [200, 200, 200],
        overflow: 'linebreak', // Satır kaydırmayı zorla
        valign: 'middle'
      },
      headStyles: { 
        fillColor: colors.dark, 
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      // ÖZEL SÜTUN GENİŞLİKLERİ (Burası sorunu çözecek)
      columnStyles: {
        0: { cellWidth: 80 }, // Görev Başlığı: Çok geniş
        1: { cellWidth: 30 }, // Sorumlu
        2: { cellWidth: 25 }, // Durum
        3: { cellWidth: 25 }, // Öncelik
        4: { cellWidth: 25 }  // Bitiş
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const text = data.cell.raw;
          if (text === 'HIGH' || text === 'ACIL') {
            data.cell.styles.textColor = colors.red;
            data.cell.styles.fontStyle = 'bold';
          } else if (text === 'MEDIUM') {
            data.cell.styles.textColor = colors.orange;
          }
        }
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'DONE') {
            data.cell.styles.textColor = colors.green;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // 5. FOOTER
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...colors.gray);
      doc.text('GIZLI BELGE (CONFIDENTIAL) // SECURE.PLAN TARAFINDAN URETILMISTIR', pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Sayfa ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    doc.save(`Rapor_${project.name}.pdf`);
  };

  const copyProjectId = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
  };

  const filteredTasks = tasks.filter(t => {
  const matchesUser = viewMode === 'all' ? true : t.assigned_to_uid === currentUser.uid;
  // Başlıkta VEYA Etiketlerde arama yap
  const matchesSearch = t.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
                        t.tags?.some(tag => tag.toLowerCase().includes(taskSearch.toLowerCase()));
  return matchesUser && matchesSearch;
  });
  const progress = calculateProgress();
  const isCompleted = project?.status === 'completed';

  return (
    <Layout>
      {/* KONFETİ EFEKTİ */}
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={500} />}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 border-b border-slate-700 pb-4 gap-4 relative">
        
        {/* SOL: BAŞLIK VE EKİP */}
        <div className="flex-1 w-full lg:w-auto">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {project?.name}
            <button onClick={copyProjectId} className="group flex items-center gap-2 text-[10px] font-mono bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700 hover:border-[--neon-blue] transition-all">
              {id.slice(0,6)}...
              {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12} className="group-hover:text-white"/>}
            </button>
            
            {/* DURUM ROZETİ */}
            {isCompleted ? (
              <span className="bg-green-900/50 text-green-400 text-[10px] px-3 py-1 rounded-full border border-green-700 font-bold flex items-center gap-1 animate-pulse">
                <Award size={12}/> BAŞARILI
              </span>
            ) : (
              <span className="bg-blue-900/50 text-blue-400 text-[10px] px-2 py-1 rounded border border-blue-800 uppercase">
                AKTİF
              </span>
            )}
          </h1>

          <div className="mt-4 flex items-center gap-4 flex-wrap">
             <ProjectTeam memberUids={project?.member_uids || []} />
             <div className="hidden sm:block h-6 w-[1px] bg-slate-700 mx-2"></div>
             <div className="flex gap-2">
                <button onClick={() => setViewMode('all')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'all' ? 'bg-[--neon-blue] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  Tüm Ekip
                </button>
                <button onClick={() => setViewMode('mine')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'mine' ? 'bg-[--neon-blue] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  Sadece Ben
                </button>
                <div className="relative flex-1 sm:flex-none mt-2 sm:mt-0">
  <Search className="absolute left-2 top-1.5 text-slate-500" size={14}/>
  <input 
    className="bg-slate-800 border border-slate-700 text-white text-xs rounded pl-8 pr-3 py-1.5 w-full sm:w-48 focus:border-[--neon-blue] outline-none transition-all"
    placeholder="Görev veya #etiket ara..."
    value={taskSearch}
    onChange={(e) => setTaskSearch(e.target.value)}
  />
</div>
             </div>
          </div>
        </div>

        {/* SAĞ: İLERLEME VE AKSİYONLAR */}
        <div className="flex flex-col items-end gap-2 w-full lg:w-auto">
          
          {/* YENİ: TAMAMLAMA BUTONU (Sadece %100 ise ve henüz tamamlanmadıysa görünür) */}
          {progress === 100 && !isCompleted && (
            <button 
              onClick={handleCompleteProject}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] font-bold text-xs flex items-center gap-2 animate-bounce"
            >
              <Award size={16}/> OPERASYONU TAMAMLA
            </button>
          )}

          <div className="flex items-center gap-4 w-full justify-between lg:justify-end mt-2">
            <div className="text-right flex-1 lg:flex-none mr-2">
               <div className="text-[10px] text-slate-400 mb-1 flex justify-between lg:justify-end gap-2">
                 <span>Operasyon Durumu</span>
                 <span className={`${progress === 100 ? 'text-green-400' : 'text-[--neon-blue]'} font-bold`}>%{progress}</span>
               </div>
               <div className="w-full lg:w-40 h-2 bg-slate-700 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-[--neon-blue]'}`} 
                   style={{ width: `${progress}%` }}
                 ></div>
               </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={toggleHistory}
                className={`relative p-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-bold
                  ${showHistory ? 'bg-slate-700 text-white border-slate-500' : 'text-slate-400 border-transparent hover:bg-slate-800'}`}
              >
                <History size={18} /> <span className="hidden sm:inline">Aktivite</span>
                {unreadCount > 0 && !showHistory && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0f172a] animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <button 
                onClick={handleExportPDF}
                className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                title="Rapor İndir (PDF)"
              >
               <FileText size={18} />
              </button>

              {project?.owner_uid === currentUser.uid && (
                <button onClick={handleDeleteProject} className="p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors" title="Projeyi Sil">
                  <Trash2 size={18}/>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="h-[calc(100vh-240px)] overflow-x-auto pb-4 relative">
        <div className="grid grid-cols-4 gap-4 min-w-[1000px] h-full">
          {['todo', 'in_progress', 'review', 'done'].map(status => (
            <KanbanColumn 
              key={status} 
              status={status} 
              tasks={filteredTasks} 
              onMove={moveTask} 
              onSelectTask={setSelectedTask} 
              currentUser={currentUser}
            />
          ))}
        </div>

        {showHistory && (
           <div className="absolute top-0 right-0 h-full w-80 bg-[#0f172a] border-l border-slate-700 shadow-2xl p-4 overflow-y-auto custom-scrollbar z-10 animate-slideIn">
             <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
               <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity size={16} className="text-[--neon-blue]"/> Operasyon Kayıtları</h3>
               <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><X size={16}/></button>
             </div>
             <div className="space-y-4">
                {activities.map((act, i) => (
                  <div key={i} className="text-xs border-l-2 border-slate-700 pl-3 py-1 relative">
                    <div className="w-2 h-2 rounded-full bg-[--neon-blue] absolute -left-[5px] top-1.5"></div>
                    <span className="text-[--neon-blue] font-bold">{act.user}</span>
                    <p className="text-slate-300 mt-1 leading-snug">{act.text}</p>
                    <span className="text-[10px] text-slate-600 block mt-1">{new Date(act.created_at).toLocaleString('tr-TR')}</span>
                  </div>
                ))}
             </div>
           </div>
        )}
      </div>

      {/* TASK MODAL */}
      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          projectId={id}
          currentUser={currentUser}
          logAction={logAction}
        />
      )}
    </Layout>
  );
}

function ProjectTeam({ memberUids }) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!memberUids || memberUids.length === 0) return;
    const unsubscribes = memberUids.map(uid => {
        return onSnapshot(doc(db, "users", uid), (docSnap) => {
            if (docSnap.exists()) {
                setMembers(prev => {
                    const newList = prev.filter(m => m.uid !== uid);
                    return [...newList, docSnap.data()];
                });
            }
        });
    });
    return () => { unsubscribes.forEach(unsub => unsub()); };
  }, [memberUids]);

  const isOnline = (lastSeen) => {
      if (!lastSeen) return false;
      const diff = Date.now() - lastSeen.toDate().getTime();
      return diff < 5 * 60 * 1000;
  };

  return (
    <div className="flex items-center -space-x-2">
      {members.map((m, i) => {
        const online = isOnline(m.last_seen);
        return (
            <div key={m.uid || i} className="relative group cursor-pointer">
            <div className={`relative rounded-full p-[2px] ${online ? 'bg-gradient-to-tr from-green-500 to-emerald-300' : 'bg-slate-700'}`}>
                {m.photoURL ? (
                    <img src={m.photoURL} alt={m.username} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                    {m.username?.[0]?.toUpperCase()}
                    </div>
                )}
                {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0f172a] rounded-full shadow-lg animate-pulse"></div>}
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap flex flex-col items-center">
                <span className="font-bold">@{m.username}</span>
                <span className={online ? "text-green-400" : "text-slate-500"}>{online ? "Çevrimiçi" : "Çevrimdışı"}</span>
            </div>
            </div>
        );
      })}
    </div>
  );
}

function KanbanColumn({ status, tasks, onMove, onSelectTask, currentUser }) {
  const titles = { todo: "YAPILACAK", in_progress: "İŞLEMDE", review: "KONTROL", done: "BİTTİ" };
  const colors = { todo: "border-slate-500", in_progress: "border-blue-500", review: "border-yellow-500", done: "border-green-500" };
  const list = tasks.filter(t => t.status === status);

  return (
    <div className={`bg-[#1e293b]/50 flex flex-col rounded-xl border-t-4 h-full ${colors[status]}`}>
      <div className="p-3 font-bold text-xs text-slate-300 border-b border-slate-700/50 flex justify-between">
        {titles[status]} <span className="bg-slate-800 px-2 rounded-full text-[10px]">{list.length}</span>
      </div>
      <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
        {list.map(t => <TaskCard key={t.id} task={t} onMove={onMove} onClick={() => onSelectTask(t)} currentUser={currentUser} />)}
      </div>
    </div>
  );
}

function TaskCard({ task, onMove, onClick, currentUser }) {
  const isMyTask = task.assigned_to_uid === currentUser.uid;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div 
      onClick={onClick} 
      className={`bg-[#1e293b] p-4 rounded-lg border shadow-md cursor-pointer group relative transition-all duration-200
      ${isMyTask 
        ? 'border-slate-600 hover:border-[--neon-blue] hover:shadow-[0_0_10px_rgba(14,165,233,0.1)]' 
        : 'border-slate-700 opacity-80 hover:opacity-100'}`}
    >
      
      {/* Etiketler ve Öncelik */}
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="flex flex-wrap gap-1">
          {task.tags?.map((tag, i) => (
            <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">#{tag}</span>
          ))}
        </div>
        {task.priority === 'high' && (
          <div className="flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-0.5 rounded text-[10px] font-bold border border-red-900/50 animate-pulse">
            <ShieldAlert size={12} /> KRİTİK
          </div>
        )}
      </div>
      
      {/* Başlık */}
      <h4 className="text-white text-sm font-medium mb-4 leading-snug break-words">
        {task.title}
      </h4>
      
      {/* Alt Bilgiler ve Butonlar */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
        
        {/* Sol: Kişi ve Tarih */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1
              ${isMyTask ? 'bg-[--neon-blue]/10 text-[--neon-blue] border border-[--neon-blue]/30' : 'bg-slate-700 text-slate-400'}`}>
              <User size={10} /> {isMyTask ? 'Ben' : task.assigned_to_username}
            </span>
          </div>
          {task.due_date && (
            <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
              <Calendar size={10}/> {new Date(task.due_date).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
        
        {/* Sağ: BÜYÜTÜLMÜŞ BUTONLAR (Sadece Benimse) */}
        {isMyTask && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            
            {/* Geri Butonu */}
            {task.status !== 'todo' && (
              <button 
                onClick={() => onMove(task.id, task.title, task.status, 'prev')} 
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-600 transition-colors"
                title="Önceki Aşamaya Taşı"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            {/* İleri Butonu */}
            {task.status !== 'done' && (
              <button 
                onClick={() => onMove(task.id, task.title, task.status, 'next')} 
                className="p-2 bg-[--neon-blue]/10 hover:bg-[--neon-blue] text-[--neon-blue] hover:text-white rounded-md border border-[--neon-blue]/50 transition-all shadow-[0_0_10px_rgba(14,165,233,0.1)]"
                title="Sonraki Aşamaya Taşı"
              >
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, projectId, currentUser, logAction }) {
  const isOwner = currentUser.uid === task.assigned_to_uid;
  const [notes, setNotes] = useState(task.notes || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [newTag, setNewTag] = useState("");
  const [links, setLinks] = useState(task.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");

  const handleSave = async () => {
  if (!isOwner) return;
  // "links: links" kısmını eklemeyi unutma!
  await updateDoc(doc(db, "projects", projectId, "tasks", task.id), { 
    notes: notes, 
    due_date: dueDate, 
    links: links // <-- YENİ
  });
  logAction(`'${task.title}' detaylarını güncelledi.`);
  onClose();
};

  const addLink = () => {
  if (!newLinkUrl) return;
  setLinks([...links, { url: newLinkUrl, name: newLinkName || "Bağlantı" }]);
  setNewLinkUrl("");
  setNewLinkName("");
};

const removeLink = (index) => {
  setLinks(links.filter((_, i) => i !== index));
};

  const addTag = async () => {
    if (!isOwner || !newTag) return;
    const currentTags = task.tags || [];
    await updateDoc(doc(db, "projects", projectId, "tasks", task.id), { tags: [...currentTags, newTag] });
    setNewTag("");
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-xl border border-slate-600 shadow-2xl overflow-hidden animate-fadeIn">
        <div className="p-4 border-b border-slate-700 flex justify-between items-start bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-slate-400">Atanan:</span>
              <span className={`font-bold ${isOwner ? 'text-[--neon-blue]' : 'text-slate-400'}`}>@{task.assigned_to_username}</span>
              {!isOwner && <span className="flex items-center gap-1 bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900 ml-2"><Lock size={10}/> SALT OKUNUR</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div><label className="block text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><Calendar size={14}/> SON TARİH</label><input type="date" disabled={!isOwner} className={`bg-slate-900 border rounded p-2 text-white text-sm w-full outline-none ${!isOwner ? 'border-slate-700 text-slate-500 cursor-not-allowed' : 'border-slate-600 focus:border-[--neon-blue]'}`} value={dueDate} onChange={(e) => setDueDate(e.target.value)}/></div>
          <div><label className="block text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><Tag size={14}/> ETİKETLER</label><div className="flex flex-wrap gap-2 mb-2">{task.tags?.map((t, i) => <span key={i} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">#{t}</span>)}</div>{isOwner && <div className="flex gap-2"><input className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm flex-1 outline-none" placeholder="Yeni etiket..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()}/><button onClick={addTag} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded text-xs">Ekle</button></div>}</div>
          <div>
  <label className="block text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
    <LinkIcon size={14}/> BAĞLANTILAR / KAYNAKLAR
  </label>
  
  {/* Link Listesi */}
  <div className="space-y-2 mb-3">
    {links.map((l, i) => (
      <div key={i} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700 text-xs">
        <a href={l.url} target="_blank" rel="noreferrer" className="text-[--neon-blue] hover:underline flex items-center gap-2 truncate max-w-[250px]">
          <ExternalLink size={12}/> {l.name}
        </a>
        {isOwner && (
          <button onClick={() => removeLink(i)} className="text-red-400 hover:text-white">
            <X size={14}/>
          </button>
        )}
      </div>
    ))}
    {links.length === 0 && <p className="text-xs text-slate-600 italic">Ekli dosya veya bağlantı yok.</p>}
  </div>

  {/* Link Ekleme Formu (Sadece Sahibi) */}
  {isOwner && (
    <div className="flex gap-2">
      <input 
        className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm w-1/3 outline-none focus:border-[--neon-blue]" 
        placeholder="Başlık (örn: Rapor)" 
        value={newLinkName} 
        onChange={(e) => setNewLinkName(e.target.value)}
      />
      <input 
        className="bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm flex-1 outline-none focus:border-[--neon-blue]" 
        placeholder="URL (https://...)" 
        value={newLinkUrl} 
        onChange={(e) => setNewLinkUrl(e.target.value)}
      />
      <button onClick={addLink} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded text-xs">Ekle</button>
    </div>
  )}
</div>
          <div><label className="block text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><Send size={14}/> NOTLAR</label><textarea disabled={!isOwner} className={`w-full h-32 bg-slate-900 border rounded p-3 text-white text-sm outline-none font-mono ${!isOwner ? 'border-slate-700 text-slate-500 cursor-not-allowed' : 'border-slate-600 focus:border-[--neon-blue]'}`} placeholder={isOwner ? "Durum güncellemesi girin..." : "Not girilmemiş."} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea></div>
        </div>
        {isOwner && <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end"><button onClick={handleSave} className="bg-[--neon-blue] hover:bg-blue-600 text-white px-6 py-2 rounded font-bold shadow-lg transition-all">KAYDET</button></div>}
      </div>
    </div>
  );
}