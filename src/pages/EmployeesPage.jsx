import { useEffect, useState } from 'react'
import Modal from '../components/Modal.jsx'
import Toast from '../components/Toast.jsx'
import { createEmployee, listEmployees } from '../data/employees.js'

export default function EmployeesPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('todos')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')

  const [form, setForm] = useState({ nome: '', matricula: '', funcao: '' })

  async function reload() {
    const data = await listEmployees({ q, status })
    setItems(data)
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => reload(), 200)
    return () => clearTimeout(t)
  }, [q, status])

  async function onCreate(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setToastType('error')
      setToast('Nome é obrigatório.')
      return
    }

    setBusy(true)
    try {
      await createEmployee(form)
      setToastType('success')
      setToast('Funcionário cadastrado.')
      setOpen(false)
      setForm({ nome: '', matricula: '', funcao: '' })
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao cadastrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Funcionários</div>
          <div className="text-xs text-white/70">Cadastro e consulta</div>
        </div>
        <button className="rounded-xl bg-accent-600 px-3 py-2 text-xs font-semibold" onClick={() => setOpen(true)}>
          + Novo
        </button>
      </div>

      <div className="rounded-2xl cm-card p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
          placeholder="Buscar por nome ou matrícula"
        />
        <div className="mt-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm">
            <option value="todos">Todos status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl cm-card p-4 text-sm text-white/80">Nenhum funcionário encontrado.</div>
        ) : (
          items.map((f) => (
            <div key={f.id} className="rounded-2xl cm-card p-4">
              <div className="text-sm font-semibold">{f.nome}</div>
              <div className="mt-1 text-xs text-white/70">
                {f.matricula ? `Matrícula: ${f.matricula}` : 'Matrícula: —'}
                {f.funcao ? ` • Função: ${f.funcao}` : ''}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={open} title="Novo funcionário" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={onCreate}>
          <div>
            <div className="text-xs text-white/70">Nome</div>
            <input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Matrícula (opcional)</div>
            <input
              value={form.matricula}
              onChange={(e) => setForm((p) => ({ ...p, matricula: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: 12345"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Função (opcional)</div>
            <input
              value={form.funcao}
              onChange={(e) => setForm((p) => ({ ...p, funcao: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: Soldador"
            />
          </div>

          <button disabled={busy} className="w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
