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

// Forçar limpeza do Service Worker antigo e caches
if ('serviceWorker' in navigator) {
  // Primeiro, tentar desregistrar qualquer SW antigo
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      console.log('Desregistrando SW antigo:', registration)
      registration.unregister()
    })
  })
  
  // Limpar todos os caches
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        console.log('Deletando cache:', cacheName)
        caches.delete(cacheName)
      })
    })
  }
  
  // Recarregar a página se havia SW antigo
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      console.log('SW antigo encontrado, recarregando...')
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  })
}

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/CAIXA-MESTRE-APP/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado:', registration)
      })
      .catch((error) => {
        console.log('Falha ao registrar Service Worker:', error)
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
