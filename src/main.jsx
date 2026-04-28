import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import './index.css'

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
