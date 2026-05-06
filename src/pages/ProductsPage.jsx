import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal.jsx'
import Toast from '../components/Toast.jsx'
import {
  PRODUCT_TYPES,
  createProduct,
  updateProduct,
  getProductSubLabel,
  getProductTypeLabel,
  listProducts
} from '../data/products.js'
import { createEmployee, updateEmployee, listEmployees } from '../data/employees.js'

const UNITS = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'pacote', label: 'Pacote' },
  { value: 'metro', label: 'Metro' },
  { value: 'kg', label: 'Kg' },
  { value: 'litro', label: 'Litro' }
]

export default function ProductsPage() {
  const [aba, setAba] = useState('produtos')
  
  // Estados para Produtos
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')

  // Estados para Funcionários
  const [empQ, setEmpQ] = useState('')
  const [employees, setEmployees] = useState([])
  const [empOpen, setEmpOpen] = useState(false)
  const [empBusy, setEmpBusy] = useState(false)
  const [empForm, setEmpForm] = useState({ nome: '', matricula: '', funcao: '' })

  // Estados para Edição
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState(null)

  const [form, setForm] = useState({
    tipo: PRODUCT_TYPES.material,
    reutilizavel: false,
    nome: '',
    codigo: '',
    descricao: '',
    unidade: 'unidade',
    quantidade: '0',
    estoqueMinimo: '0',
    ca: ''
  })

  async function reload() {
    const data = await listProducts({ q, tipo, status })
    setItems(data)
  }

  async function reloadEmployees() {
    const data = await listEmployees({ q: empQ, status: 'ativo' })
    setEmployees(data)
  }

  useEffect(() => {
    reload()
    reloadEmployees()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => reload(), 200)
    return () => clearTimeout(t)
  }, [q, tipo, status])

  useEffect(() => {
    const t = setTimeout(() => reloadEmployees(), 200)
    return () => clearTimeout(t)
  }, [empQ])

  async function onCreateEmployee(e) {
    e.preventDefault()
    if (!empForm.nome.trim()) {
      setToastType('error')
      setToast('Nome é obrigatório.')
      return
    }
    setEmpBusy(true)
    try {
      await createEmployee(empForm)
      setToastType('success')
      setToast('Funcionário cadastrado.')
      setEmpOpen(false)
      setEmpForm({ nome: '', matricula: '', funcao: '' })
      await reloadEmployees()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao cadastrar.')
    } finally {
      setEmpBusy(false)
    }
  }

  function openEditEmployee(emp) {
    setEditingEmployee(emp)
    setEmpForm({
      nome: emp.nome || '',
      matricula: emp.matricula || '',
      funcao: emp.funcao || ''
    })
    setEmpOpen(true)
  }

  async function onUpdateEmployee(e) {
    e.preventDefault()
    if (!empForm.nome.trim()) {
      setToastType('error')
      setToast('Nome é obrigatório.')
      return
    }

    setEmpBusy(true)
    try {
      await updateEmployee({ id: editingEmployee.id, ...empForm })
      setToastType('success')
      setToast('Funcionário atualizado.')
      setEmpOpen(false)
      setEditingEmployee(null)
      setEmpForm({ nome: '', matricula: '', funcao: '' })
      await reloadEmployees()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao atualizar.')
    } finally {
      setEmpBusy(false)
    }
  }

  const showCa = useMemo(() => {
    return form.tipo === PRODUCT_TYPES.epi
  }, [form.tipo])

  const showReusable = useMemo(() => {
    return form.tipo === PRODUCT_TYPES.epi
  }, [form.tipo])

  async function onCreate(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setToastType('error')
      setToast('Nome é obrigatório.')
      return
    }

    setBusy(true)
    try {
      await createProduct(form)
      setToastType('success')
      setToast('Produto cadastrado.')
      setOpen(false)
      setForm((f) => ({ ...f, nome: '', codigo: '', descricao: '', quantidade: '0' }))
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao cadastrar.')
    } finally {
      setBusy(false)
    }
  }

  function openEdit(product) {
    setEditingProduct(product)
    setForm({
      tipo: product.tipo || PRODUCT_TYPES.material,
      reutilizavel: product.reutilizavel || false,
      nome: product.nome || '',
      codigo: product.codigo || '',
      descricao: product.descricao || '',
      unidade: product.unidade || 'unidade',
      quantidade: String(product.quantidade ?? 0),
      estoqueMinimo: String(product.estoqueMinimo ?? 0),
      ca: product.ca || ''
    })
    setOpen(true)
  }

  async function onUpdate(e) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setToastType('error')
      setToast('Nome é obrigatório.')
      return
    }

    setBusy(true)
    try {
      await updateProduct({ id: editingProduct.id, ...form })
      setToastType('success')
      setToast('Produto atualizado.')
      setOpen(false)
      setEditingProduct(null)
      setForm({
        tipo: PRODUCT_TYPES.material,
        reutilizavel: false,
        nome: '',
        codigo: '',
        descricao: '',
        unidade: 'unidade',
        quantidade: '0',
        estoqueMinimo: '0',
        ca: ''
      })
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao atualizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      {/* Abas */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setAba('produtos')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${aba === 'produtos' ? 'bg-accent-600 text-white' : 'bg-white/10 text-white/70'}`}
        >
          📦 Produtos
        </button>
        <button
          onClick={() => setAba('funcionarios')}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${aba === 'funcionarios' ? 'bg-accent-600 text-white' : 'bg-white/10 text-white/70'}`}
        >
          👤 Funcionários
        </button>
      </div>

      {aba === 'produtos' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Produtos</div>
              <div className="text-xs text-white/70">{items.length} cadastrados</div>
            </div>
            <button className="rounded-xl bg-accent-600 px-3 py-2 text-xs font-semibold" onClick={() => setOpen(true)}>
              + Novo
            </button>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
              placeholder="Buscar por nome ou código"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl bg-white/10 px-3 py-3 text-sm">
                <option value="todos">Todos os tipos</option>
                <option value={PRODUCT_TYPES.ferramenta}>Ferramentas</option>
                <option value={PRODUCT_TYPES.material}>Materiais</option>
                <option value={PRODUCT_TYPES.epi}>EPIs</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl bg-white/10 px-3 py-3 text-sm">
                <option value="todos">Todos status</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">Nenhum produto encontrado.</div>
            ) : (
              items.map((p) => {
                const min = Number(p.estoqueMinimo ?? 0)
                const qty = Number(p.quantidade ?? 0)
                const below = qty < min
                const equal = qty === min && min > 0

                const badge = below ? 'bg-red-600/90' : equal ? 'bg-amber-500/90' : 'bg-emerald-600/80'
                const badgeText = below ? 'Abaixo do mínimo' : equal ? 'No mínimo' : 'OK'

                return (
                  <div key={p.id} className="rounded-2xl bg-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p.nome}</div>
                        <div className="mt-1 text-xs text-white/70">
                          {getProductTypeLabel(p.tipo)}
                          {getProductSubLabel(p) ? ` • ${getProductSubLabel(p)}` : ''}
                          {p.codigo ? ` • ${p.codigo}` : ''}
                        </div>
                        <div className="mt-2 text-xs text-white/80">
                          Estoque: <span className="font-semibold">{qty}</span>
                          {min > 0 ? (
                            <>
                              {' '}
                              / mín: <span className="font-semibold">{min}</span>
                            </>
                          ) : null}
                          {' '}
                          {p.unidade ? <span className="text-white/60">({p.unidade})</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className={`rounded-xl px-2 py-1 text-[11px] ${badge}`}>{badgeText}</div>
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/80 hover:bg-white/20"
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {aba === 'funcionarios' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Funcionários</div>
              <div className="text-xs text-white/70">{employees.length} cadastrados</div>
            </div>
            <button className="rounded-xl bg-accent-600 px-3 py-2 text-xs font-semibold" onClick={() => setEmpOpen(true)}>
              + Novo
            </button>
          </div>

          <div className="rounded-2xl bg-white/10 p-3">
            <input
              value={empQ}
              onChange={(e) => setEmpQ(e.target.value)}
              className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
              placeholder="Buscar por nome ou matrícula"
            />
          </div>

          <div className="space-y-3">
            {employees.length === 0 ? (
              <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">Nenhum funcionário encontrado.</div>
            ) : (
              employees.map((e) => (
                <div key={e.id} className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">{e.nome}</div>
                      <div className="mt-1 text-xs text-white/70">
                        {e.funcao ? `${e.funcao} • ` : ''}{e.matricula || 'Sem matrícula'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openEditEmployee(e)}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/80 hover:bg-white/20"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => navigate(`/funcionario/${e.id}/historico`)}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/80 hover:bg-white/20"
                      >
                        📋 Histórico
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal Produto */}
      <Modal open={open} title={editingProduct ? 'Editar produto' : 'Novo produto'} onClose={() => { setOpen(false); setEditingProduct(null) }}>
        <form className="space-y-3" onSubmit={editingProduct ? onUpdate : onCreate}>
          <div>
            <div className="text-xs text-white/70">Tipo</div>
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
            >
              <option value={PRODUCT_TYPES.ferramenta}>Ferramenta</option>
              <option value={PRODUCT_TYPES.material}>Material</option>
              <option value={PRODUCT_TYPES.epi}>EPI</option>
            </select>
          </div>

          {showReusable ? (
            <label className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
              <input
                type="checkbox"
                checked={Boolean(form.reutilizavel)}
                onChange={(e) => setForm((f) => ({ ...f, reutilizavel: e.target.checked }))}
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-semibold">Reutilizável</div>
                <div className="text-xs text-white/70">Marcado: empréstimo com devolução • Desmarcado: entrega (consumo)</div>
              </div>
            </label>
          ) : null}

          <div>
            <div className="text-xs text-white/70">Nome</div>
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: Luva de couro"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Código (opcional)</div>
            <input
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: LUV-001"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Quantidade inicial</div>
            <input
              inputMode="numeric"
              value={form.quantidade}
              onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Quantidade mínima (alerta)</div>
            <input
              inputMode="numeric"
              value={form.estoqueMinimo}
              onChange={(e) => setForm((f) => ({ ...f, estoqueMinimo: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Unidade</div>
            <select
              value={form.unidade}
              onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {showCa ? (
            <div>
              <div className="text-xs text-white/70">CA (opcional)</div>
              <input
                value={form.ca}
                onChange={(e) => setForm((f) => ({ ...f, ca: e.target.value }))}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
                placeholder="Ex: 12345"
              />
            </div>
          ) : null}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      </Modal>

      {/* Modal Funcionário */}
      <Modal open={empOpen} title={editingEmployee ? 'Editar funcionário' : 'Novo funcionário'} onClose={() => { setEmpOpen(false); setEditingEmployee(null) }}>
        <form className="space-y-3" onSubmit={editingEmployee ? onUpdateEmployee : onCreateEmployee}>
          <div>
            <div className="text-xs text-white/70">Nome</div>
            <input
              value={empForm.nome}
              onChange={(e) => setEmpForm((f) => ({ ...f, nome: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Matrícula (opcional)</div>
            <input
              value={empForm.matricula}
              onChange={(e) => setEmpForm((f) => ({ ...f, matricula: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: 12345"
            />
          </div>

          <div>
            <div className="text-xs text-white/70">Função (opcional)</div>
            <input
              value={empForm.funcao}
              onChange={(e) => setEmpForm((f) => ({ ...f, funcao: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
              placeholder="Ex: Eletricista"
            />
          </div>

          <button
            disabled={empBusy}
            className="w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {empBusy ? 'Salvando…' : editingEmployee ? 'Atualizar' : 'Salvar'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
