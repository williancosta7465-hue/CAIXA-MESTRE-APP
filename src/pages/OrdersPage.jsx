import { useEffect, useMemo, useState } from 'react'
import Toast from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { db, getNextOrderNumber } from '../data/db.js'
import { finalizeOrder, startNewOrder, addItemToOrder, removeItemFromOrder, getActiveOrder, listArchivedOrders, generateOrderPDF, shareOrderViaWhatsApp, deleteArchivedOrder } from '../data/orders.js'
import { PRODUCT_TYPES, getProductTypeLabel, listProducts } from '../data/products.js'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export default function OrdersPage() {
  const { session } = useAuth()
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [tab, setTab] = useState('ativo')

  const [activeOrder, setActiveOrder] = useState(null)
  const [archivedOrders, setArchivedOrders] = useState([])
  const [products, setProducts] = useState([])

  const [tipo, setTipo] = useState(PRODUCT_TYPES.material)
  const [productQ, setProductQ] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState('1')
  const [obs, setObs] = useState('')

  const [numeroPedido, setNumeroPedido] = useState('')

  async function gerarNumeroPedido() {
    return await getNextOrderNumber()
  }
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [ativo, arquivados, prods] = await Promise.all([
      getActiveOrder(),
      listArchivedOrders({ limit: 20 }),
      listProducts({ q: '', tipo: 'todos', status: 'ativo' })
    ])
    setActiveOrder(ativo)
    setArchivedOrders(arquivados)
    setProducts(prods)
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    async function setNumeroAuto() {
      if (activeOrder && !numeroPedido) {
        const novoNumero = await gerarNumeroPedido()
        setNumeroPedido(novoNumero)
      }
    }
    setNumeroAuto()
  }, [activeOrder])

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

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId) ?? null, [products, selectedProductId])

  async function onStartNew() {
    setBusy(true)
    try {
      await startNewOrder()
      const novoNumero = await gerarNumeroPedido()
      setNumeroPedido(novoNumero)
      setToastType('success')
      setToast('Novo pedido iniciado.')
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao iniciar.')
    } finally {
      setBusy(false)
    }
  }

  async function onAddItem() {
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
    try {
      await addItemToOrder({
        produtoId: selectedProduct.id,
        produtoNome: selectedProduct.nome,
        tipo: selectedProduct.tipo,
        quantidadeSolicitada: qNum,
        observacao: obs?.trim() || null
      })
      setToastType('success')
      setToast('Item adicionado ao pedido.')
      setSelectedProductId('')
      setQty('1')
      setObs('')
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao adicionar.')
    }
  }

  async function onRemove(itemId) {
    try {
      await removeItemFromOrder(itemId)
      setToastType('success')
      setToast('Item removido.')
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao remover.')
    }
  }

  async function onFinalize() {
    if (!activeOrder) return
    if (!numeroPedido.trim()) {
      setToastType('error')
      setToast('Informe o número do pedido.')
      return
    }
    setBusy(true)
    try {
      const pedido = await finalizeOrder({ usuario: session, numeroPedido: numeroPedido.trim() })
      setToastType('success')
      setToast(`Pedido ${pedido.numero} finalizado.`)
      setNumeroPedido('')
      await reload()
      setTab('historico')
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao finalizar.')
    } finally {
      setBusy(false)
    }
  }

  async function onCancel() {
    if (!confirm('Cancelar o pedido ativo?')) return
    setBusy(true)
    try {
      await cancelActiveOrder({ usuario: session })
      setToastType('info')
      setToast('Pedido cancelado.')
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao cancelar.')
    } finally {
      setBusy(false)
    }
  }

  async function onDownloadPDF(pedido) {
    try {
      await generateOrderPDF(pedido, session?.usuarioNome || 'Sistema')
      setToastType('success')
      setToast('PDF gerado.')
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao gerar PDF.')
    }
  }

  async function onShareWhatsApp(pedido) {
    try {
      await shareOrderViaWhatsApp(pedido, session?.usuarioNome || 'Sistema')
    } catch (err) {
      setToastType('error')
      setToast('Erro ao compartilhar: ' + (err?.message || 'Erro desconhecido'))
    }
  }

  async function onDeleteOrder(pedido) {
    if (!confirm(`Tem certeza que deseja excluir o pedido ${pedido.numero}? Esta ação não pode ser desfeita.`)) return
    
    setBusy(true)
    try {
      await deleteArchivedOrder(pedido.id)
      setToastType('success')
      setToast(`Pedido ${pedido.numero} excluído.`)
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao excluir pedido.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <BackButton />

      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Pedidos</div>
        <div className="mt-1 text-xs text-white/70">Acumule itens em falta durante o período e envie o pedido ao final.</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTab('ativo')}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === 'ativo' ? 'bg-accent-600 text-white' : 'bg-white/10'}`}
        >
          Pedido Ativo
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === 'historico' ? 'bg-accent-600 text-white' : 'bg-white/10'}`}
        >
          Histórico
        </button>
      </div>

      {tab === 'ativo' && (
        <div className="space-y-4">
          {!activeOrder ? (
            <div className="rounded-2xl cm-card p-4">
              <div className="text-sm text-white/80">Nenhum pedido ativo.</div>
              <button
                disabled={busy}
                onClick={onStartNew}
                className="mt-3 w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Iniciar novo pedido
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl cm-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Pedido em andamento</div>
                  <div className="text-xs text-white/70">{activeOrder.itens?.length || 0} itens</div>
                </div>
                <div className="mt-3 text-xs text-white/70">Número do pedido <span className="text-white/50">(automático)</span></div>
                <input
                  value={numeroPedido}
                  readOnly
                  className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-sm outline-none text-white/80"
                />
              </div>

              <div className="rounded-2xl cm-card p-4">
                <div className="text-xs font-semibold">Adicionar item</div>
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

                <div className="mt-3 text-xs text-white/70">Produto</div>
                <input
                  value={productQ}
                  onChange={(e) => setProductQ(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none placeholder:text-white/40"
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
                      {p.nome}{p.codigo ? ` (${p.codigo})` : ''} - disp: {Number(p.quantidade ?? 0)}
                    </option>
                  ))}
                </select>

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
                  <div>
                    <div className="text-xs text-white/70">Observação</div>
                    <input
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
                      placeholder="Ex: urgente"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onAddItem}
                  className="mt-3 w-full rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold"
                >
                  Adicionar ao pedido
                </button>
              </div>

              <div className="rounded-2xl cm-card p-4">
                <div className="text-xs font-semibold">Itens do pedido</div>
                {(activeOrder.itens || []).length === 0 ? (
                  <div className="mt-2 text-sm text-white/70">Nenhum item adicionado.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {activeOrder.itens.map((it) => (
                      <div key={it.id} className="rounded-xl bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{it.produtoNome}</div>
                            <div className="mt-1 text-xs text-white/70">
                              {getProductTypeLabel(it.tipo)} • Qtd: <span className="font-semibold">{it.quantidadeSolicitada}</span>
                              {it.observacao ? ` • Obs: ${it.observacao}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs"
                            onClick={() => onRemove(it.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={busy || (activeOrder.itens || []).length === 0 || !numeroPedido.trim()}
                  onClick={onFinalize}
                  className="rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? 'Finalizando…' : 'Finalizar pedido'}
                </button>
                <button
                  disabled={busy}
                  onClick={onCancel}
                  className="rounded-xl bg-red-600/80 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div className="space-y-3">
          {archivedOrders.length === 0 ? (
            <div className="rounded-2xl cm-card p-4 text-sm text-white/80">Nenhum pedido arquivado.</div>
          ) : (
            archivedOrders.map((ped) => (
              <div key={ped.id} className="rounded-2xl cm-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{ped.numero}</div>
                    <div className="mt-1 text-xs text-white/70">
                      Data: {formatDate(ped.dataEnvio)} • {ped.itens?.length || 0} itens
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Por: {ped.usuarioNome || '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onDownloadPDF(ped)}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold"
                  >
                    Baixar PDF
                  </button>
                  <button
                    onClick={() => onShareWhatsApp(ped)}
                    className="rounded-xl bg-emerald-600/90 px-3 py-2 text-xs font-semibold"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => onDeleteOrder(ped)}
                    className="rounded-xl bg-red-600/90 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
