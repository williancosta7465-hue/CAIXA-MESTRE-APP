import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import './index.css'

// Solução definitiva - limpar tudo e redirecionar para raiz
(function() {
  // Se tiver ~and~ em qualquer lugar, limpar tudo
  if (window.location.pathname.includes('~and~') || 
      window.location.search.includes('~and~') || 
      window.location.hash.includes('~and~')) {
    
    // Limpar todos os caches
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) {
          caches.delete(name);
        });
      });
    }
    
    // Limpar localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    
    // Limpar sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    
    // Redirecionar para raiz limpa
    window.location.replace('/CAIXA-MESTRE-APP/');
    return;
  }
  
  // Verificar se está em uma rota SPA que precisa redirecionamento
  if (window.location.pathname !== '/CAIXA-MESTRE-APP/' && 
      window.location.pathname !== '/CAIXA-MESTRE-APP' &&
      !window.location.pathname.includes('.')) {
    
    // Redirecionar para raiz com hash
    const path = window.location.pathname.replace('/CAIXA-MESTRE-APP/', '');
    const search = window.location.search;
    const hash = window.location.hash;
    
    window.location.replace('/CAIXA-MESTRE-APP/#/' + path + search + hash);
  }
})();

// Capturar prompt de instalação PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.deferredPrompt = e
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter basename="/CAIXA-MESTRE-APP/">
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
