import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardKPIs, getPeriodComparison } from '../data/dashboard.js'

export default function DashboardPage() {
  const nav = useNavigate()
  const [kpis, setKpis] = useState(null)
  const [periodData, setPeriodData] = useState(null)
  const [periodDays, setPeriodDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [kpisData, periodComp] = await Promise.all([
        getDashboardKPIs(),
        getPeriodComparison(periodDays)
      ])
      setKpis(kpisData)
      setPeriodData(periodComp)
      setLoading(false)
    }
    load()
  }, [periodDays])

  const stats = kpis || {}

  return (
    <div className="space-y-4">
      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Dashboard</div>
        <div className="mt-1 text-xs text-white/70">Resumo dos últimos 30 dias.</div>
      </div>

      {loading ? (
        <div className="rounded-2xl cm-card p-4 text-sm text-white/70">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs text-white/70">Total produtos</div>
              <div className="mt-1 text-xl font-semibold">{stats.totalProdutos ?? 0}</div>
            </div>
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs text-white/70">Funcionários</div>
              <div className="mt-1 text-xl font-semibold">{stats.totalFuncionarios ?? 0}</div>
            </div>
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs text-white/70">Empréstimos pendentes</div>
              <div className={`mt-1 text-xl font-semibold ${(stats.pendentes ?? 0) > 0 ? 'text-amber-400' : ''}`}>
                {stats.pendentes ?? 0}
              </div>
            </div>
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs text-white/70">Em manutenção</div>
              <div className="mt-1 text-xl font-semibold">{stats.emManutencao ?? 0}</div>
            </div>
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs text-white/70">Abaixo do mínimo</div>
              <div className={`mt-1 text-xl font-semibold ${(stats.abaixoMinimo ?? 0) > 0 ? 'text-amber-400' : ''}`}>
                {stats.abaixoMinimo ?? 0}
              </div>
            </div>
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs text-white/70">Sem estoque</div>
              <div className={`mt-1 text-xl font-semibold ${(stats.itensZerados ?? 0) > 0 ? 'text-red-400' : ''}`}>
                {stats.itensZerados ?? 0}
              </div>
            </div>
          </div>

          <div className="rounded-2xl cm-card p-4">
            <div className="text-xs font-semibold">Consumo por categoria (30 dias)</div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">Ferramentas</div>
                <div className="mt-1 text-lg font-semibold">{stats.consumoPorTipo?.ferramenta ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">Materiais</div>
                <div className="mt-1 text-lg font-semibold">{stats.consumoPorTipo?.material ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">EPIs</div>
                <div className="mt-1 text-lg font-semibold">{stats.consumoPorTipo?.epi ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl cm-card p-4">
            <div className="text-xs font-semibold">Indicadores gerais (30 dias)</div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">Total saídas</div>
                <div className="mt-1 text-lg font-semibold">{stats.totalSaidas30d ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">Taxa perda</div>
                <div className={`mt-1 text-lg font-semibold ${Number(stats.taxaPerda ?? 0) > 5 ? 'text-red-400' : ''}`}>
                  {stats.taxaPerda ?? '0.0'}%
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">Taxa devolução</div>
                <div className={`mt-1 text-lg font-semibold ${Number(stats.taxaDevolucao ?? 0) < 80 ? 'text-amber-400' : ''}`}>
                  {stats.taxaDevolucao ?? '100.0'}%
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center">
                <div className="text-xs text-white/70">Média atraso</div>
                <div className={`mt-1 text-lg font-semibold ${(stats.mediaDiasPendente ?? 0) > 7 ? 'text-red-400' : ''}`}>
                  {stats.mediaDiasPendente ?? 0}d
                </div>
              </div>
            </div>
          </div>

          {/* Comparativos de Período */}
          {periodData && (
            <div className="rounded-2xl cm-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">Comparativo de Período</div>
                <select
                  value={periodDays}
                  onChange={(e) => setPeriodDays(Number(e.target.value))}
                  className="rounded-lg bg-white/10 px-2 py-1 text-xs"
                >
                  <option value={7}>7 dias</option>
                  <option value={30}>30 dias</option>
                  <option value={90}>90 dias</option>
                </select>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/5 p-2 text-center">
                  <div className="text-xs text-white/60">Entregas</div>
                  <div className="text-lg font-semibold">{periodData.current.totalEntregas}</div>
                  <div className={`text-[10px] ${periodData.changes.entregas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {periodData.changes.entregas >= 0 ? '↑' : '↓'} {Math.abs(periodData.changes.entregas)}%
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-2 text-center">
                  <div className="text-xs text-white/60">Empréstimos</div>
                  <div className="text-lg font-semibold">{periodData.current.totalEmprestimos}</div>
                  <div className={`text-[10px] ${periodData.changes.emprestimos >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {periodData.changes.emprestimos >= 0 ? '↑' : '↓'} {Math.abs(periodData.changes.emprestimos)}%
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-2 text-center">
                  <div className="text-xs text-white/60">Total Itens</div>
                  <div className="text-lg font-semibold">{periodData.current.totalItens}</div>
                  <div className={`text-[10px] ${periodData.changes.itens >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {periodData.changes.itens >= 0 ? '↑' : '↓'} {Math.abs(periodData.changes.itens)}%
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-white/50 text-center">
                vs período anterior ({periodDays} dias)
              </div>
            </div>
          )}

          {(stats.topProdutos?.length ?? 0) > 0 && (
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs font-semibold">Top 5 produtos mais consumidos</div>
              <div className="mt-3 space-y-2">
                {stats.topProdutos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                    <div className="text-sm">{i + 1}. {p.nome}</div>
                    <div className="text-xs text-white/70">{p.tipo} • {p.total}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(stats.topFuncPendentes?.length ?? 0) > 0 && (
            <div className="rounded-2xl cm-card p-4">
              <div className="text-xs font-semibold">Funcionários com mais pendentes</div>
              <div className="mt-3 space-y-2">
                {stats.topFuncPendentes.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                    <div className="text-sm">{i + 1}. {f.nome}</div>
                    <div className="text-xs text-amber-400">{f.total} empréstimo(s)</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(stats.produtosAbaixoMinimo?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-amber-500/20 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-amber-300">⚠️ Produtos abaixo do mínimo</div>
                <button 
                  onClick={() => nav('/estoque')}
                  className="text-[10px] text-amber-300 underline"
                >
                  Ver estoque →
                </button>
              </div>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {stats.produtosAbaixoMinimo.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-white/90 truncate flex-1">{p.nome}</span>
                    <span className="text-amber-300 ml-2">
                      {p.quantidade} / {p.estoqueMinimo}
                    </span>
                  </div>
                ))}
                {stats.produtosAbaixoMinimo.length > 5 && (
                  <div className="text-xs text-white/60 text-center">
                    +{stats.produtosAbaixoMinimo.length - 5} produtos...
                  </div>
                )}
              </div>
            </div>
          )}

          {(stats.produtosVencendo?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-red-500/20 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-red-300">⏰ Produtos próximos ao vencimento</div>
                <button 
                  onClick={() => nav('/estoque')}
                  className="text-[10px] text-red-300 underline"
                >
                  Ver estoque →
                </button>
              </div>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {stats.produtosVencendo.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-white/90 truncate flex-1">{p.nome}</span>
                    <span className="text-red-300 ml-2">
                      Vence {new Date(p.dataValidade).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
                {stats.produtosVencendo.length > 5 && (
                  <div className="text-xs text-white/60 text-center">
                    +{stats.produtosVencendo.length - 5} produtos...
                  </div>
                )}
              </div>
            </div>
          )}

          {stats.alertas && stats.alertas.length > 0 ? (
            <div className="rounded-2xl bg-red-600/20 p-4">
              <div className="text-xs font-semibold text-red-300">Alertas</div>
              <ul className="mt-2 space-y-1">
                {stats.alertas.map((a, i) => (
                  <li key={i} className="text-xs text-white/90">• {a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="rounded-2xl cm-card p-4">
        <div className="text-xs font-semibold">Ações rápidas</div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <button onClick={() => nav('/entrega')} className="rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white">Nova entrega</button>
          <button onClick={() => nav('/relatorios')} className="rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white">Relatórios</button>
          <button onClick={() => nav('/pendentes')} className="rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white">Pendentes</button>
        </div>
      </div>
    </div>
  )
}
