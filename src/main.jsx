// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter> {/* Sayfa geçişleri için Router */}
      <AuthProvider> {/* Kimlik doğrulama sistemi */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)