import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Toast from '../components/Toast.jsx'
import { getSecurityQuestion, resetPasswordWithSecurityQuestion } from '../auth/auth.js'

export default function RecoverPasswordPage() {
  const nav = useNavigate()
  const [login, setLogin] = useState('')
  const [question, setQuestion] = useState(null)
  const [resposta, setResposta] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!login.trim()) {
        if (active) setQuestion(null)
        return
      }
      const q = await getSecurityQuestion(login.trim())
      if (active) setQuestion(q)
    })()
    return () => {
      active = false
    }
  }, [login])

  async function onSubmit(e) {
    e.preventDefault()
    if (novaSenha !== confirmar) {
      setToastType('error')
      setToast('As senhas não conferem.')
      return
    }
    setBusy(true)
    try {
      await resetPasswordWithSecurityQuestion({ login: login.trim(), resposta, novaSenha })
      setToastType('success')
      setToast('Senha redefinida com sucesso.')
      setTimeout(() => nav('/login', { replace: true }), 600)
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao redefinir senha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      {/* Fundo fixo */}
      <div className="fixed inset-0 z-0 cm-bg" />
      <div className="fixed inset-0 z-0 cm-bg-overlay" />
      
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />
      <div className="relative z-10 mx-auto flex h-full w-full max-w-lg flex-col px-4 py-10 overflow-y-auto">
        <div className="text-lg font-semibold">Recuperar senha</div>
        <div className="mt-1 text-sm text-white/70">Recuperação offline via pergunta de segurança.</div>

        <form className="mt-6 rounded-2xl cm-card p-4" onSubmit={onSubmit}>
          <label className="block text-xs text-white/70">Login</label>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
            placeholder="Digite seu login"
          />

          <div className="mt-4 text-xs text-white/70">Pergunta de segurança</div>
          <div className="mt-1 rounded-xl bg-white/5 px-3 py-3 text-sm text-white/90">
            {question ?? 'Digite o login para carregar a pergunta.'}
          </div>

          <label className="mt-4 block text-xs text-white/70">Resposta</label>
          <input
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
            placeholder="Digite sua resposta"
          />

          <label className="mt-4 block text-xs text-white/70">Nova senha</label>
          <input
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            type="password"
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
            placeholder="Digite a nova senha"
          />

          <label className="mt-4 block text-xs text-white/70">Confirmar nova senha</label>
          <input
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            type="password"
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
            placeholder="Confirme a nova senha"
          />

          <button
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Salvando…' : 'Redefinir senha'}
          </button>

          <div className="mt-4 text-center">
            <Link className="text-xs text-white/80 underline" to="/login">Voltar</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
