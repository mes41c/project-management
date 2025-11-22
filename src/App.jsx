// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Sayfaları (Pages) İçe Aktarıyoruz
import Login from './pages/Login';
import SetUsername from './pages/SetUsername';
import Dashboard from './pages/Dashboard'; // <-- KRİTİK DEĞİŞİKLİK BURADA
import Social from './pages/Social';
import NewProject from './pages/NewProject';
import Profile from './pages/Profile';
import ProjectDetails from './pages/ProjectDetails';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-[--bg-dark] text-white">
      <Routes>
        {/* Ana Rota: Giriş yapmışsa Dashboard, yapmamışsa Login */}
        <Route 
          path="/" 
          element={currentUser ? <Dashboard /> : <Navigate to="/login" />} 
        />

        <Route path="/social" element={currentUser ? <Social /> : <Navigate to="/login" />} />

        <Route path="/new-project" element={currentUser ? <NewProject /> : <Navigate to="/login" />} />

        <Route path="/profile/:uid" element={currentUser ? <Profile /> : <Navigate to="/login" />} />

        <Route 
          path="/project/:id" 
          element={currentUser ? <ProjectDetails /> : <Navigate to="/login" />} 
        />
        
        <Route path="/login" element={<Login />} />
        
        {/* Kullanıcı adı seçme rotası */}
        <Route 
          path="/set-username" 
          element={currentUser ? <SetUsername /> : <Navigate to="/login" />} 
        />
        
        {/* Dashboard Rotası */}
        <Route 
          path="/dashboard" 
          element={currentUser ? <Dashboard /> : <Navigate to="/login" />} 
        />
      </Routes>
    </div>
  );
}

export default App;