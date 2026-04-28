import { useEffect, useMemo, useState } from 'react'
import Toast from '../components/Toast.jsx'
import SignaturePad from '../components/SignaturePad.jsx'
import PhotoCapture from '../components/PhotoCapture.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { listEmployees } from '../data/employees.js'
import { PRODUCT_TYPES, getProductSubLabel, getProductTypeLabel, listProducts } from '../data/products.js'
import { createTransaction } from '../data/movements.js'

const EPI_MOTIVOS = [
  { value: 'novo', label: 'Novo' },
  { value: 'perda', label: 'Perda' },
  { value: 'troca', label: 'Troca' }
]

function getOperacaoLabel(produto) {
  if (!produto) return '—'
  if (produto.tipo === PRODUCT_TYPES.ferramenta) return 'Empréstimo'
  if (produto.tipo === PRODUCT_TYPES.material) return 'Entrega'
  if (produto.tipo === PRODUCT_TYPES.epi) return produto.reutilizavel ? 'Empréstimo' : 'Entrega'
  return 'Entrega'
}

export default function DeliveryPage() {
  const { session } = useAuth()
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')

  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])

  const [employeeQ, setEmployeeQ] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmployeeId) ?? null, [employees, selectedEmployeeId])

  const [tipo, setTipo] = useState(PRODUCT_TYPES.ferramenta)
  const [productQ, setProductQ] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId) ?? null, [products, selectedProductId])
  const [qty, setQty] = useState('1')
  const [motivoEpi, setMotivoEpi] = useState('')
  const [obsItem, setObsItem] = useState('')
  const [obsGeral, setObsGeral] = useState('')

  const [cart, setCart] = useState([])
  const [signature, setSignature] = useState(null)
  const [fotoEntrega, setFotoEntrega] = useState(null)
  const [busy, setBusy] = useState(false)

  async function loadBase() {
    const [emps, prods] = await Promise.all([
      listEmployees({ q: '', status: 'ativo' }),
      listProducts({ q: '', tipo: 'todos', status: 'ativo' })
    ])
    setEmployees(emps)
    setProducts(prods)
  }

  useEffect(() => {
    loadBase()
  }, [])

  useEffect(() => {
    setSelectedProductId('')
    setMotivoEpi('')
    setObsItem('')
    setQty('1')
  }, [tipo])

  const filteredEmployees = useMemo(() => {
    const q = employeeQ.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e => (e.nome ?? '').toLowerCase().includes(q) || (e.matricula ?? '').toLowerCase().includes(q))
  }, [employees, employeeQ])

  const filteredProducts = useMemo(() => {
    const q = productQ.trim().toLowerCase()
    return products
      .filter(p => p.tipo === tipo)
      .filter(p => {
        if (!q) return true
        return (p.nome ?? '').toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q)
      })
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
  }, [products, productQ, tipo])

  const needMotivo = useMemo(() => {
    return selectedProduct?.tipo === PRODUCT_TYPES.epi && !selectedProduct?.reutilizavel
  }, [selectedProduct])

  function resetItemForm() {
    setSelectedProductId('')
    setQty('1')
    setMotivoEpi('')
    setObsItem('')
  }

  function addToCart() {
    if (!selectedEmployee) {
      setToastType('error')
      setToast('Selecione um funcionário.')
      return
    }
    if (!selectedProduct) {
      setToastType('error')
      setToast('Selecione um produto.')
      return
    }

    const qNum = Number(qty)
    if (!Number.isFinite(qNum) || qNum <= 0) {
      setToastType('error')
      setToast('Quantidade inválida.')
      return
    }

    const disponivel = Number(selectedProduct.quantidade ?? 0)
    const jaNoCarrinho = cart
      .filter(i => i.produtoId === selectedProduct.id)
      .reduce((acc, i) => acc + Number(i.quantidade ?? 0), 0)

    if (qNum + jaNoCarrinho > disponivel) {
      setToastType('error')
      setToast(`Quantidade maior que o estoque disponível (${disponivel}).`)
      return
    }

    if (needMotivo && !motivoEpi) {
      setToastType('error')
      setToast('Selecione o motivo do EPI (Novo/Perda/Troca).')
      return
    }

    setCart((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        produtoId: selectedProduct.id,
        produtoNome: selectedProduct.nome,
        tipo: selectedProduct.tipo,
        epiReutilizavel: selectedProduct.tipo === PRODUCT_TYPES.epi ? Boolean(selectedProduct.reutilizavel) : null,
        quantidade: qNum,
        motivoEpi: needMotivo ? motivoEpi : null,
        observacao: obsItem?.trim() || null
      }
    ])

    resetItemForm()
    setToastType('success')
    setToast('Item adicionado ao carrinho.')
  }

  async function finalize() {
    setBusy(true)
    try {
      await createTransaction({
        usuario: session,
        funcionario: selectedEmployee,
        itens: cart,
        assinaturaBase64: signature,
        fotoEntrega: fotoEntrega,
        observacaoGeral: obsGeral?.trim() || null
      })
      setToastType('success')
      setToast('Movimentação registrada com sucesso.')
      setCart([])
      setSignature(null)
      setFotoEntrega(null)
      setObsGeral('')
      await loadBase()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao finalizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <BackButton />

      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Entrega / Empréstimo</div>
        <div className="mt-1 text-xs text-white/70">Carrinho: selecione funcionário, adicione itens e finalize com assinatura.</div>
      </div>

      <div className="rounded-2xl cm-card p-4">
        <div className="text-xs font-semibold">1) Funcionário</div>
        <input
          value={employeeQ}
          onChange={(e) => setEmployeeQ(e.target.value)}
          className="mt-2 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
          placeholder="Buscar por nome ou matrícula"
        />
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="mt-2 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
        >
          <option value="">Selecione…</option>
          {filteredEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}{e.matricula ? ` (${e.matricula})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl cm-card p-4">
        <div className="text-xs font-semibold">2) Adicionar item</div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTipo(PRODUCT_TYPES.ferramenta)}
            className={`rounded-xl px-2 py-2 text-xs font-semibold ${tipo === PRODUCT_TYPES.ferramenta ? 'bg-accent-600' : 'bg-white/10'}`}
          >
            Ferramenta
          </button>
          <button
            type="button"
            onClick={() => setTipo(PRODUCT_TYPES.material)}
            className={`rounded-xl px-2 py-2 text-xs font-semibold ${tipo === PRODUCT_TYPES.material ? 'bg-accent-600' : 'bg-white/10'}`}
          >
            Material
          </button>
          <button
            type="button"
            onClick={() => setTipo(PRODUCT_TYPES.epi)}
            className={`rounded-xl px-2 py-2 text-xs font-semibold ${tipo === PRODUCT_TYPES.epi ? 'bg-accent-600' : 'bg-white/10'}`}
          >
            EPI
          </button>
        </div>

        <div className="mt-3 text-xs text-white/70">Produtos ({getProductTypeLabel(tipo)})</div>
        <input
          value={productQ}
          onChange={(e) => setProductQ(e.target.value)}
          className="mt-2 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
          placeholder="Buscar produto"
        />
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="mt-2 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
        >
          <option value="">Selecione…</option>
          {filteredProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
              {p.tipo === PRODUCT_TYPES.epi ? ` (${getProductSubLabel(p)})` : ''}
              {` - disp: ${Number(p.quantidade ?? 0)}`}
            </option>
          ))}
        </select>

        {selectedProduct ? (
          <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-white/80">
            <div className="font-semibold">{selectedProduct.nome}</div>
            <div className="mt-1">
              Operação: <span className="font-semibold">{getOperacaoLabel(selectedProduct)}</span>
              {' '}• Disponível: <span className="font-semibold">{Number(selectedProduct.quantidade ?? 0)}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-white/70">Quantidade</div>
            <input
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            />
          </div>

          {needMotivo ? (
            <div>
              <div className="text-xs text-white/70">Motivo (EPI)</div>
              <select
                value={motivoEpi}
                onChange={(e) => setMotivoEpi(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
              >
                <option value="">Selecione…</option>
                {EPI_MOTIVOS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <div className="text-xs text-white/70">Motivo (EPI)</div>
              <div className="mt-1 rounded-xl bg-white/5 px-3 py-3 text-sm text-white/60">—</div>
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="text-xs text-white/70">Observação (opcional)</div>
          <input
            value={obsItem}
            onChange={(e) => setObsItem(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            placeholder="Ex: uso imediato"
          />
        </div>

        <button
          type="button"
          onClick={addToCart}
          className="mt-4 w-full rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold"
        >
          Adicionar ao carrinho
        </button>
      </div>

      <div className="rounded-2xl cm-card p-4">
        <div className="text-xs font-semibold">3) Carrinho</div>
        {cart.length === 0 ? (
          <div className="mt-2 text-sm text-white/70">Nenhum item adicionado.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {cart.map((i) => (
              <div key={i.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{i.produtoNome}</div>
                    <div className="mt-1 text-xs text-white/70">
                      {i.tipo === PRODUCT_TYPES.epi ? `EPI • ${i.epiReutilizavel ? 'Reutilizável' : 'Descartável'}` : getProductTypeLabel(i.tipo)}
                      {' '}• Qtd: <span className="font-semibold">{i.quantidade}</span>
                      {i.motivoEpi ? ` • Motivo: ${i.motivoEpi}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs"
                    onClick={() => setCart((prev) => prev.filter((x) => x.id !== i.id))}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="text-xs text-white/70">Observação geral (opcional)</div>
          <input
            value={obsGeral}
            onChange={(e) => setObsGeral(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            placeholder="Ex: entrega referente ao setor ..."
          />
        </div>
      </div>

      <PhotoCapture
        label="Foto da entrega (opcional)"
        onCapture={setFotoEntrega}
      />

      <SignaturePad onChange={setSignature} />

      <button
        disabled={busy || !selectedEmployee || cart.length === 0 || !signature}
        onClick={finalize}
        className="w-full rounded-2xl bg-accent-600 px-4 py-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Finalizando…' : 'Entregar itens (finalizar)'}
      </button>
    </div>
  )
}
