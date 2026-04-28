import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider.jsx'

export default function RequirePermission({ allow, children }) {
  const { ready, session } = useAuth()
  const loc = useLocation()

  if (!ready) {
    return <div className="min-h-full bg-brand-900 text-white p-6">Carregando…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

  const perfil = session.perfil
  if (typeof allow === 'function' && !allow(perfil)) {
    return <Navigate to="/" replace />
  }

  return children
}
