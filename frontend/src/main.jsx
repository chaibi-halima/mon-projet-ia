import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ManualForm from './ManualForm.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Route Accueil : Ton formulaire IA actuel */}
        <Route path="/" element={<App />} />
        {/* Nouvelle Route : Formulaire manuel */}
        <Route path="/manuel" element={<ManualForm />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)

// Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
      .then((reg) => console.log('PWA : Service Worker actif ! Scope:', reg.scope))
      .catch((err) => console.error('PWA : Échec du Service Worker :', err));
  });
}
