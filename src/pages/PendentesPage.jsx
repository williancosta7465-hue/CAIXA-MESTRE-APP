import { useEffect, useMemo, useState } from 'react'
import Toast from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import {
  listPendingLoans,
  markLoanAsLost,
  registerLoanReturn,
  sendLoanToMaintenance,
  returnFromMaintenance
} from '../data/movements.js'
import { db } from '../data/db.js'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export default function PendentesPage() {
  const { session } = useAuth()
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [items, setItems] = useState([])
  const [maintenanceItems, setMaintenanceItems] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [tab, setTab] = useState('pendentes')

  // Filtros
  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [filtroProduto, setFiltroProduto] = useState('')
  const [filtroDias, setFiltroDias] = useState('todos')

  const [modal, setModal] = useState({ open: false, action: null, item: null })
  const [obs, setObs] = useState('')

  async function reload() {
    const [pend, maint] = await Promise.all([
      listPendingLoans(),
      db.movimentacoes.where('status').equals('em-manutencao').toArray()
    ])
    setItems(pend)
    setMaintenanceItems(maint)
  }

  useEffect(() => {
    reload()
  }, [])

  const pendentesFiltrados = useMemo(() => {
    let result = [...items]
    
    // Filtro por funcionário
    if (filtroFuncionario.trim()) {
      const q = filtroFuncionario.toLowerCase()
      result = result.filter(m => m.funcionarioNome?.toLowerCase().includes(q))
    }
    
    // Filtro por produto
    if (filtroProduto.trim()) {
      const q = filtroProduto.toLowerCase()
      result = result.filter(m => m.produtoNome?.toLowerCase().includes(q))
    }
    
    // Filtro por dias
    if (filtroDias !== 'todos') {
      const dias = Number(filtroDias)
      const limite = Date.now() - (dias * 24 * 60 * 60 * 1000)
      result = result.filter(m => (m.dataMovimentacao ?? 0) < limite)
    }
    
    return result.sort((a, b) => (a.dataMovimentacao ?? 0) - (b.dataMovimentacao ?? 0))
  }, [items, filtroFuncionario, filtroProduto, filtroDias])

  const emManutencaoFiltrados = useMemo(() => {
    let result = [...maintenanceItems]
    
    if (filtroFuncionario.trim()) {
      const q = filtroFuncionario.toLowerCase()
      result = result.filter(m => m.funcionarioNome?.toLowerCase().includes(q))
    }
    
    if (filtroProduto.trim()) {
      const q = filtroProduto.toLowerCase()
      result = result.filter(m => m.produtoNome?.toLowerCase().includes(q))
    }
    
    return result.sort((a, b) => (a.dataEnvioManutencao ?? 0) - (b.dataEnvioManutencao ?? 0))
  }, [maintenanceItems, filtroFuncionario, filtroProduto])

  // Dados exibidos conforme aba
  const pendentes = pendentesFiltrados
  const emManutencao = emManutencaoFiltrados

  async function runAction(action, item) {
    setBusyId(item.id)
    try {
      if (action === 'devolver') {
        await registerLoanReturn({ usuario: session, movementId: item.id, observacao: obs })
      } else if (action === 'perdido') {
        await markLoanAsLost({ usuario: session, movementId: item.id, observacao: obs })
      } else if (action === 'manutencao') {
        await sendLoanToMaintenance({ usuario: session, movementId: item.id, observacao: obs })
      } else if (action === 'retorno_manutencao') {
        await returnFromMaintenance({ usuario: session, movementId: item.id, observacao: obs })
      }

      setToastType('success')
      setToast('Atualizado com sucesso.')
      setModal({ open: false, action: null, item: null })
      setObs('')
      await reload()
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao atualizar.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <BackButton />

      <div className="rounded-2xl cm-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Pendências</div>
          <div className="text-xs text-white/70">{tab === 'pendentes' ? `${pendentes.length} pendentes` : `${emManutencao.length} em manutenção`}</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab('pendentes')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === 'pendentes' ? 'bg-accent-600 text-white' : 'bg-white/10'}`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setTab('manutencao')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === 'manutencao' ? 'bg-accent-600 text-white' : 'bg-white/10'}`}
          >
            Em Manutenção
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl cm-card p-3">
        <div className="text-xs font-semibold text-white/70 mb-2">🔍 Filtros</div>
        <div className="space-y-2">
          <input
            value={filtroFuncionario}
            onChange={(e) => setFiltroFuncionario(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40"
            placeholder="Buscar por funcionário..."
          />
          <input
            value={filtroProduto}
            onChange={(e) => setFiltroProduto(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40"
            placeholder="Buscar por produto..."
          />
          {tab === 'pendentes' && (
            <select 
              value={filtroDias} 
              onChange={(e) => setFiltroDias(e.target.value)}
              className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm"
            >
              <option value="todos">Todos os períodos</option>
              <option value="7">Mais de 7 dias</option>
              <option value="15">Mais de 15 dias</option>
              <option value="30">Mais de 30 dias</option>
              <option value="60">Mais de 60 dias</option>
            </select>
          )}
        </div>
        {(filtroFuncionario || filtroProduto || filtroDias !== 'todos') && (
          <button
            onClick={() => {
              setFiltroFuncionario('')
              setFiltroProduto('')
              setFiltroDias('todos')
            }}
            className="mt-2 w-full rounded-xl bg-white/5 py-2 text-xs text-white/70"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {tab === 'pendentes' && (
        <>
          {pendentes.length === 0 ? (
            <div className="rounded-2xl cm-card p-4 text-sm text-white/80">Nenhuma pendência.</div>
          ) : (
            <div className="space-y-3">
              {pendentes.map((m) => (
                <div key={m.id} className="rounded-2xl cm-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{m.produtoNome}</div>
                      <div className="mt-1 text-xs text-white/70">
                        Funcionário: {m.funcionarioNome} • Qtd: {m.quantidade}
                      </div>
                      <div className="mt-1 text-xs text-white/70">Data: {formatDate(m.dataMovimentacao)}</div>
                      <div className="mt-1 text-xs text-white/70">
                        Status: <span className="font-semibold">{m.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      disabled={busyId === m.id}
                      className="rounded-xl bg-emerald-600/90 px-2 py-2 text-xs font-semibold disabled:opacity-60"
                      onClick={() => {
                        setObs('')
                        setModal({ open: true, action: 'devolver', item: m })
                      }}
                    >
                      Devolver
                    </button>
                    <button
                      disabled={busyId === m.id}
                      className="rounded-xl bg-amber-500/90 px-2 py-2 text-xs font-semibold disabled:opacity-60"
                      onClick={() => {
                        setObs('')
                        setModal({ open: true, action: 'manutencao', item: m })
                      }}
                    >
                      Manutenção
                    </button>
                    <button
                      disabled={busyId === m.id}
                      className="rounded-xl bg-red-600/90 px-2 py-2 text-xs font-semibold disabled:opacity-60"
                      onClick={() => {
                        setObs('')
                        setModal({ open: true, action: 'perdido', item: m })
                      }}
                    >
                      Perdido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'manutencao' && (
        <>
          {emManutencao.length === 0 ? (
            <div className="rounded-2xl cm-card p-4 text-sm text-white/80">Nenhum item em manutenção.</div>
          ) : (
            <div className="space-y-3">
              {emManutencao.map((m) => (
                <div key={m.id} className="rounded-2xl cm-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{m.produtoNome}</div>
                      <div className="mt-1 text-xs text-white/70">
                        Funcionário: {m.funcionarioNome} • Qtd: {m.quantidade}
                      </div>
                      <div className="mt-1 text-xs text-white/70">Enviado: {formatDate(m.dataEnvioManutencao)}</div>
                      <div className="mt-1 text-xs text-white/70">
                        Status: <span className="font-semibold text-amber-400">{m.status}</span>
                      </div>
                      {m.observacaoDevolucao ? (
                        <div className="mt-1 text-xs text-white/60">Motivo: {m.observacaoDevolucao}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      disabled={busyId === m.id}
                      className="w-full rounded-xl bg-emerald-600/90 px-3 py-2 text-xs font-semibold disabled:opacity-60"
                      onClick={() => {
                        setObs('')
                        setModal({ open: true, action: 'retorno_manutencao', item: m })
                      }}
                    >
                      Retornou da manutenção (voltar ao estoque)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={modal.open}
        title={
          modal.action === 'devolver'
            ? 'Confirmar devolução'
            : modal.action === 'manutencao'
              ? 'Enviar para manutenção'
              : modal.action === 'retorno_manutencao'
                ? 'Retorno da manutenção'
                : 'Marcar como perdido'
        }
        onClose={() => setModal({ open: false, action: null, item: null })}
      >
        <div className="text-sm font-semibold">{modal.item?.produtoNome}</div>
        <div className="mt-1 text-xs text-white/70">Funcionário: {modal.item?.funcionarioNome} • Qtd: {modal.item?.quantidade}</div>

        <div className="mt-4">
          <div className="text-xs text-white/70">Observação (opcional)</div>
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
            placeholder="Ex: quebrou / não localizado / enviado oficina"
          />
        </div>

        <button
          disabled={!modal.item || busyId === modal.item?.id}
          onClick={() => runAction(modal.action, modal.item)}
          className="mt-4 w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Confirmar
        </button>
      </Modal>
    </div>
  )
}
