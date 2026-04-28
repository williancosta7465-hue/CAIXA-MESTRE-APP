import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import Toast from '../components/Toast.jsx'

export default function LoginPage() {
  const { login: doLogin } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await doLogin({ login: login.trim(), senha })
      const to = loc.state?.from || '/'
      nav(to, { replace: true })
    } catch (err) {
      setToast(err?.message || 'Falha ao entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      {/* Fundo fixo */}
      <div className="fixed inset-0 z-0 cm-bg" />
      <div className="fixed inset-0 z-0 cm-bg-overlay" />
      
      <Toast message={toast} type="error" onClose={() => setToast(null)} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-lg flex-col px-4 py-10 overflow-y-auto">
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 overflow-hidden rounded-3xl bg-white/10">
            <img src="/caixa-mestre-pwa/caixa-mestre-logo.png" alt="CAIXA MESTRE" className="h-full w-full object-contain" />
          </div>
          <div className="mt-4 text-xl font-semibold">CAIXA MESTRE</div>
          <div className="mt-1 text-sm text-white/70">Gestão de Estoque</div>
        </div>

        <form className="mt-8 rounded-2xl cm-card p-4" onSubmit={onSubmit}>
          <label className="block text-xs text-white/70">Login</label>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
            placeholder="Digite seu login"
          />

          <label className="mt-4 block text-xs text-white/70">Senha</label>
          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            type="password"
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
            placeholder="Digite sua senha"
          />

          <button
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="mt-4 text-center">
            <Link className="text-xs text-white/80 underline" to="/recuperar-senha">Esqueci a senha</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
