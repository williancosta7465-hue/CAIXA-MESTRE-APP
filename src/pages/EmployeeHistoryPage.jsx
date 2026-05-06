import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Toast from '../components/Toast.jsx'
import BackButton from '../components/BackButton.jsx'
import { db } from '../data/db.js'
import { getProductTypeLabel } from '../data/products.js'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

export default function EmployeeHistoryPage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [movements, setMovements] = useState([])
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [dias, setDias] = useState('90')

  useEffect(() => {
    async function load() {
      try {
        const emp = await db.funcionarios.get(employeeId)
        if (!emp) {
          setToastType('error')
          setToast('Funcionário não encontrado.')
          return
        }
        setEmployee(emp)

        const d = Number(dias) || 90
        const desde = Date.now() - (d * 24 * 60 * 60 * 1000)

        const movs = await db.movimentacoes
          .where('funcionarioId')
          .equals(employeeId)
          .and(m => m.dataMovimentacao >= desde)
          .reverse()
          .toArray()

        // Enriquecer com dados dos produtos
        const prodIds = [...new Set(movs.map(m => m.produtoId))]
        const produtos = await db.produtos.bulkGet(prodIds)
        const prodMap = Object.fromEntries(produtos.filter(Boolean).map(p => [p.id, p]))

        setMovements(movs.map(m => ({
          ...m,
          produto: prodMap[m.produtoId]
        })))
      } catch (err) {
        setToastType('error')
        setToast(err?.message || 'Falha ao carregar histórico.')
      }
    }
    load()
  }, [employeeId, dias])

  const resumo = useMemo(() => {
    const totalEntregas = movements.filter(m => m.tipoMovimentacao === 'saida-entrega').reduce((acc, m) => acc + (m.quantidade || 0), 0)
    const totalEmprestimos = movements.filter(m => m.tipoMovimentacao === 'saida-emprestimo').length
    const pendentes = movements.filter(m => m.status === 'pendente-devolucao').length
    return { totalEntregas, totalEmprestimos, pendentes }
  }, [movements])

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <BackButton />

      {employee && (
        <div className="rounded-2xl bg-white/10 p-4">
          <div className="text-sm font-semibold">{employee.nome}</div>
          <div className="mt-1 text-xs text-white/70">
            {employee.funcao || 'Sem função cadastrada'} • {employee.matricula || 'Sem matrícula'}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-lg font-bold">{resumo.totalEntregas}</div>
              <div className="text-[10px] text-white/70">Itens Recebidos</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-lg font-bold">{resumo.totalEmprestimos}</div>
              <div className="text-[10px] text-white/70">Empréstimos</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <div className="text-lg font-bold text-amber-400">{resumo.pendentes}</div>
              <div className="text-[10px] text-white/70">Pendentes</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/10 p-3">
        <div className="text-xs font-semibold text-white/70 mb-2">Período</div>
        <select 
          value={dias} 
          onChange={(e) => setDias(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm"
        >
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 6 meses</option>
          <option value="365">Último ano</option>
        </select>
      </div>

      <div className="space-y-3">
        {movements.length === 0 ? (
          <div className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">
            Nenhuma movimentação encontrada neste período.
          </div>
        ) : (
          movements.map((m) => (
            <div key={m.id} className="rounded-2xl bg-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{m.produtoNome}</div>
                  <div className="mt-1 text-xs text-white/70">
                    {m.produto ? getProductTypeLabel(m.produto.tipo) : 'Produto'} • {formatDate(m.dataMovimentacao)}
                  </div>
                  <div className="mt-1 text-xs">
                    <span className={m.tipoMovimentacao === 'saida-emprestimo' ? 'text-amber-400' : 'text-emerald-400'}>
                      {m.tipoMovimentacao === 'saida-emprestimo' ? '📦 Empréstimo' : '📤 Entrega'}
                    </span>
                    {' • '}
                    <span className={
                      m.status === 'concluido' ? 'text-emerald-400' :
                      m.status === 'pendente-devolucao' ? 'text-amber-400' :
                      m.status === 'perdido' ? 'text-red-400' :
                      'text-white/70'
                    }>
                      {m.status === 'concluido' ? 'Concluído' :
                       m.status === 'pendente-devolucao' ? 'Pendente' :
                       m.status === 'perdido' ? 'Perdido' :
                       m.status}
                    </span>
                  </div>
                  {m.quantidade > 1 && (
                    <div className="mt-1 text-xs text-white/70">Quantidade: {m.quantidade}</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
