import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import './index.css'

// Limpar URLs malformadas do histórico (problema com 404.html antigo)
if (window.location.href.includes('~and~') || window.location.pathname.includes('//')) {
  console.log('URL malformada detectada, limpando...')
  window.location.replace('/CAIXA-MESTRE-APP/')
}

// Forçar limpeza TOTAL do Service Worker antigo e caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}

if ('caches' in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      caches.delete(cacheName)
    })
  })
}

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
