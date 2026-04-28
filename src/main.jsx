import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import './index.css'

// Limpar URLs malformadas antes de iniciar o app
if (window.location.pathname.includes('~and~')) {
  const cleanPath = window.location.pathname.replace(/~and~/g, '&')
  const cleanSearch = window.location.search.replace(/~and~/g, '&')
  const cleanHash = window.location.hash
  
  window.location.replace(
    window.location.protocol + '//' + 
    window.location.hostname + 
    (window.location.port ? ':' + window.location.port : '') + 
    cleanPath + 
    cleanSearch + 
    cleanHash
  )
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
