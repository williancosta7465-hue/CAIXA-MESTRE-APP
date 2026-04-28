import { useEffect, useState } from 'react'
import { db, hashPassword } from '../data/db.js'
import { addAuditLog } from '../data/audit.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import Toast from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'
import { canManageUsers, canAccessSettings, canMoveStock, canEditCatalog, canViewCatalog, canViewReports } from '../utils/permissions.js'

const PERFIS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'almoxarife', label: 'Almoxarife' },
  { value: 'visualizador', label: 'Visualizador' }
]

function getPermissionsDescription(perfil) {
  const permissions = []
  if (canManageUsers(perfil)) permissions.push('Gerenciar usuários')
  if (canAccessSettings(perfil)) permissions.push('Acessar configurações')
  if (canMoveStock(perfil)) permissions.push('Mover estoque')
  if (canEditCatalog(perfil)) permissions.push('Editar catálogo')
  if (canViewCatalog(perfil)) permissions.push('Ver catálogo')
  if (canViewReports(perfil)) permissions.push('Ver relatórios')
  return permissions.length > 0 ? permissions.join(', ') : 'Sem permissões'
}

export default function UsersPage() {
  const { session } = useAuth()
  const [users, setUsers] = useState([])
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPasswords, setShowPasswords] = useState({})

  const [form, setForm] = useState({
    nome: '',
    login: '',
    senha: '',
    perfil: 'almoxarife',
    perguntaSeguranca: 'Qual o nome da sua mãe?',
    respostaSeguranca: ''
  })

  const [editingUser, setEditingUser] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null })

  async function reload() {
    const all = await db.users.toArray()
    setUsers(all.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')))
  }

  useEffect(() => {
    reload()
  }, [])

  function openEdit(user) {
    setEditingUser(user)
    setForm({
      nome: user.nome || '',
      login: user.login || '',
      senha: '',
      perfil: user.perfil || 'almoxarife',
      perguntaSeguranca: user.perguntaSeguranca || 'Qual o nome da sua mãe?',
      respostaSeguranca: ''
    })
    setOpen(true)
  }

  function openCreate() {
    setEditingUser(null)
    setForm({
      nome: '',
      login: '',
      senha: '',
      perfil: 'almoxarife',
      perguntaSeguranca: 'Qual o nome da sua mãe?',
      respostaSeguranca: ''
    })
    setOpen(true)
  }

  async function onCreate(e) {
    e.preventDefault()
    
    // Validações mais robustas
    const errors = []
    
    if (!form.nome.trim()) {
      errors.push('Nome é obrigatório')
    } else if (form.nome.trim().length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres')
    }
    
    if (!form.login.trim()) {
      errors.push('Login é obrigatório')
    } else if (form.login.trim().length < 3) {
      errors.push('Login deve ter pelo menos 3 caracteres')
    } else if (!/^[a-zA-Z0-9._-]+$/.test(form.login.trim())) {
      errors.push('Login só pode conter letras, números, ponto, traço e underscore')
    }
    
    if (!form.senha.trim()) {
      errors.push('Senha é obrigatória')
    } else if (form.senha.trim().length < 6) {
      errors.push('Senha deve ter pelo menos 6 caracteres')
    }
    
    if (!form.respostaSeguranca.trim()) {
      errors.push('Resposta de segurança é obrigatória')
    } else if (form.respostaSeguranca.trim().length < 3) {
      errors.push('Resposta de segurança deve ter pelo menos 3 caracteres')
    }
    
    if (errors.length > 0) {
      setToastType('error')
      setToast(errors.join('. '))
      return
    }

    setBusy(true)
    try {
      const exists = await db.users.where('login').equals(form.login.trim()).first()
      if (exists) {
        setToastType('error')
        setToast('Login já existe.')
        return
      }

      const now = Date.now()
      const user = {
        id: crypto.randomUUID(),
        nome: form.nome.trim(),
        login: form.login.trim(),
        senhaHash: await hashPassword(form.senha),
        perfil: form.perfil,
        ativo: true,
        perguntaSeguranca: form.perguntaSeguranca.trim(),
        respostaSegurancaHash: await hashPassword(form.respostaSeguranca),
        ultimoAcesso: null,
        tentativasLogin: 0,
        criadoEm: now
      }

      await db.users.add(user)

      // Verificar se usuário foi salvo corretamente
      const savedUser = await db.users.where('login').equals(user.login).first()
      console.log('Usuário salvo:', savedUser)
      console.log('Hash da senha:', user.senhaHash)

      await addAuditLog({
        usuarioId: session?.usuarioId ?? null,
        usuarioNome: session?.usuarioNome ?? null,
        acao: 'USUARIO_CRIADO',
        detalhes: JSON.stringify({ login: user.login, perfil: user.perfil }),
        tabelaAfetada: 'users',
        registroId: user.id
      })

      setToastType('success')
      setToast('Usuário criado. Verifique o console para depuração.')
      setOpen(false)
      setForm({ nome: '', login: '', senha: '', perfil: 'almoxarife', perguntaSeguranca: 'Qual o nome da sua mãe?', respostaSeguranca: '' })
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao criar.')
    } finally {
      setBusy(false)
    }
  }

  async function onUpdate(e) {
    e.preventDefault()
    
    // Validações para edição
    const errors = []
    
    if (!form.nome.trim()) {
      errors.push('Nome é obrigatório')
    } else if (form.nome.trim().length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres')
    }
    
    if (form.senha.trim() && form.senha.trim().length < 6) {
      errors.push('Senha deve ter pelo menos 6 caracteres')
    }
    
    if (form.respostaSeguranca.trim() && form.respostaSeguranca.trim().length < 3) {
      errors.push('Resposta de segurança deve ter pelo menos 3 caracteres')
    }
    
    if (errors.length > 0) {
      setToastType('error')
      setToast(errors.join('. '))
      return
    }

    setBusy(true)
    try {
      const updates = {
        nome: form.nome.trim(),
        perfil: form.perfil,
        perguntaSeguranca: form.perguntaSeguranca.trim(),
      }

      if (form.senha.trim()) {
        updates.senhaHash = await hashPassword(form.senha)
      }
      if (form.respostaSeguranca.trim()) {
        updates.respostaSegurancaHash = await hashPassword(form.respostaSeguranca)
      }

      await db.users.update(editingUser.id, updates)

      await addAuditLog({
        usuarioId: session?.usuarioId ?? null,
        usuarioNome: session?.usuarioNome ?? null,
        acao: 'USUARIO_ATUALIZADO',
        detalhes: JSON.stringify({ login: editingUser.login }),
        tabelaAfetada: 'users',
        registroId: editingUser.id
      })

      setToastType('success')
      setToast('Usuário atualizado.')
      setOpen(false)
      setEditingUser(null)
      setForm({ nome: '', login: '', senha: '', perfil: 'almoxarife', perguntaSeguranca: 'Qual o nome da sua mãe?', respostaSeguranca: '' })
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao atualizar.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteModal.user) return

    try {
      await db.users.delete(deleteModal.user.id)

      await addAuditLog({
        usuarioId: session?.usuarioId ?? null,
        usuarioNome: session?.usuarioNome ?? null,
        acao: 'USUARIO_EXCLUIDO',
        detalhes: JSON.stringify({ login: deleteModal.user.login, nome: deleteModal.user.nome }),
        tabelaAfetada: 'users',
        registroId: deleteModal.user.id
      })

      setToastType('success')
      setToast('Usuário excluído.')
      setDeleteModal({ open: false, user: null })
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao excluir.')
    }
  }

  async function toggleAtivo(user) {
    const novo = !user.ativo
    await db.users.update(user.id, { ativo: novo })
    await addAuditLog({
      usuarioId: session?.usuarioId ?? null,
      usuarioNome: session?.usuarioNome ?? null,
      acao: novo ? 'USUARIO_ATIVADO' : 'USUARIO_DESATIVADO',
      detalhes: JSON.stringify({ login: user.login }),
      tabelaAfetada: 'users',
      registroId: user.id
    })
    setToastType('success')
    setToast(novo ? 'Usuário ativado.' : 'Usuário desativado.')
    await reload()
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Gerenciar Usuários</div>
        <div className="mt-1 text-xs text-white/70">Criar, ativar/desativar usuários.</div>
      </div>

      <button
        onClick={openCreate}
        className="w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white"
      >
        + Novo usuário
      </button>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl cm-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{u.nome}</div>
                <div className="mt-1 text-xs text-white/70">
                  {u.login} • {PERFIS.find(p => p.value === u.perfil)?.label || u.perfil}
                </div>
                <div className={`mt-1 text-xs ${u.ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Permissões: {getPermissionsDescription(u.perfil)}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {u.login !== 'admin' && (
                  <button
                    onClick={() => toggleAtivo(u)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold ${u.ativo ? 'bg-red-600/80' : 'bg-emerald-600/80'}`}
                  >
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                )}
                <button
                  onClick={() => openEdit(u)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-[10px] font-semibold hover:bg-white/20"
                >
                  ✏️ Editar
                </button>
                {u.login !== 'admin' && (
                  <button
                    onClick={() => setDeleteModal({ open: true, user: u })}
                    className="rounded-lg bg-red-500/20 px-3 py-1.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/30"
                  >
                    🗑️ Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} title={editingUser ? 'Editar usuário' : 'Novo usuário'} onClose={() => { setOpen(false); setEditingUser(null) }}>
        <form className="space-y-3" onSubmit={editingUser ? onUpdate : onCreate}>
          <div>
            <div className="text-xs text-white/70">Nome</div>
            <input
              value={form.nome}
              onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: João Silva"
            />
          </div>
          <div>
            <div className="text-xs text-white/70">Login</div>
            <input
              value={form.login}
              onChange={(e) => setForm(f => ({ ...f, login: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: joao.silva"
              disabled={!!editingUser}
            />
            {editingUser && <div className="mt-1 text-[10px] text-white/50">Login não pode ser alterado</div>}
          </div>
          <div>
            <div className="text-xs text-white/70">Senha {editingUser && '(deixe em branco para manter)'}</div>
            <div className="mt-1 relative">
              <input
                type={showPasswords[editingUser?.id || 'new'] ? 'text' : 'password'}
                value={form.senha}
                onChange={(e) => setForm(f => ({ ...f, senha: e.target.value }))}
                className="w-full rounded-xl bg-white/10 px-3 py-3 pr-10 text-sm outline-none"
                placeholder={editingUser ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ 
                  ...prev, 
                  [editingUser?.id || 'new']: !prev[editingUser?.id || 'new'] 
                }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showPasswords[editingUser?.id || 'new'] ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs text-white/70">Perfil</div>
            <select
              value={form.perfil}
              onChange={(e) => setForm(f => ({ ...f, perfil: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
            >
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-white/70">Pergunta de segurança</div>
            <input
              value={form.perguntaSeguranca}
              onChange={(e) => setForm(f => ({ ...f, perguntaSeguranca: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <div className="text-xs text-white/70">Resposta de segurança</div>
            <input
              value={form.respostaSeguranca}
              onChange={(e) => setForm(f => ({ ...f, respostaSeguranca: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Resposta para recuperação de senha"
            />
          </div>
          <button
            disabled={busy}
            className="w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Salvando…' : editingUser ? 'Atualizar usuário' : 'Criar usuário'}
          </button>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão */}
      <Modal 
        open={deleteModal.open} 
        title="Confirmar exclusão"
        onClose={() => setDeleteModal({ open: false, user: null })}
      >
        <div className="text-center">
          <div className="text-sm mb-2">
            Tem certeza que deseja excluir o usuário:
          </div>
          <div className="text-lg font-semibold text-red-300">
            {deleteModal.user?.nome}
          </div>
          <div className="text-xs text-white/70 mt-1">
            ({deleteModal.user?.login})
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setDeleteModal({ open: false, user: null })}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white"
          >
            🗑️ Excluir
          </button>
        </div>
      </Modal>
    </div>
  )
}
