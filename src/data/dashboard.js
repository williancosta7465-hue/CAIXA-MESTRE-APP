import { db } from './db.js'

export async function getDashboardKPIs() {
  const [produtos, funcionarios, movimentacoes, pendentesRaw, emManutencao] = await Promise.all([
    db.produtos.toArray(),
    db.funcionarios.where('status').equals('ativo').count(),
    db.movimentacoes.toArray(),
    db.movimentacoes.where('status').equals('pendente-devolucao').toArray(),
    db.movimentacoes.where('status').equals('em-manutencao').count()
  ])

  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const pendentes = pendentesRaw.length

  const itensAbaixoMinimo = produtos.filter(p => {
    const qty = Number(p.quantidade ?? 0)
    const min = Number(p.estoqueMinimo ?? 0)
    return min > 0 && qty < min
  })

  const itensZerados = produtos.filter(p => Number(p.quantidade ?? 0) === 0)

  // Produtos próximos ao vencimento (próximos 30 dias)
  const trintaDias = now + 30 * 24 * 60 * 60 * 1000
  const produtosVencendo = produtos.filter(p => {
    if (!p.dataValidade) return false
    const dataVenc = new Date(p.dataValidade).getTime()
    return dataVenc > now && dataVenc <= trintaDias
  }).sort((a, b) => new Date(a.dataValidade).getTime() - new Date(b.dataValidade).getTime())

  const movRecentes = movimentacoes.filter(m => m.dataMovimentacao >= thirtyDaysAgo)

  const totalSaidas = movRecentes
    .filter(m => m.tipoMovimentacao === 'saida-entrega' || m.tipoMovimentacao === 'saida-emprestimo')
    .reduce((acc, m) => acc + Number(m.quantidade ?? 0), 0)

  const totalPerdas = movimentacoes
    .filter(m => m.status === 'perdido' && m.dataDevolucaoReal >= thirtyDaysAgo)
    .reduce((acc, m) => acc + Number(m.quantidade ?? 0), 0)

  const totalEpiConsumo = movRecentes
    .filter(m => m.tipoProduto === 'epi' && m.tipoMovimentacao === 'saida-entrega')
    .reduce((acc, m) => acc + Number(m.quantidade ?? 0), 0)

  const taxaPerda = totalSaidas > 0 ? ((totalPerdas / totalSaidas) * 100).toFixed(1) : '0.0'

  // Consumo por categoria (30 dias)
  const consumoPorTipo = {
    ferramenta: movRecentes.filter(m => m.tipoProduto === 'ferramenta' && m.tipoMovimentacao === 'saida-emprestimo').reduce((a, m) => a + Number(m.quantidade ?? 0), 0),
    material: movRecentes.filter(m => m.tipoProduto === 'material' && m.tipoMovimentacao === 'saida-entrega').reduce((a, m) => a + Number(m.quantidade ?? 0), 0),
    epi: movRecentes.filter(m => m.tipoProduto === 'epi' && m.tipoMovimentacao === 'saida-entrega').reduce((a, m) => a + Number(m.quantidade ?? 0), 0)
  }

  // Top 5 produtos mais consumidos (30 dias)
  const produtoMap = new Map()
  movRecentes.filter(m => m.tipoMovimentacao === 'saida-entrega').forEach(m => {
    const key = m.produtoId
    if (!produtoMap.has(key)) produtoMap.set(key, { nome: m.produtoNome, tipo: m.tipoProduto, total: 0 })
    produtoMap.get(key).total += Number(m.quantidade ?? 0)
  })
  const topProdutos = Array.from(produtoMap.values()).sort((a, b) => b.total - a.total).slice(0, 5)

  // Funcionários com mais empréstimos pendentes
  const funcPendentesMap = new Map()
  pendentesRaw.forEach(m => {
    if (!funcPendentesMap.has(m.funcionarioId)) funcPendentesMap.set(m.funcionarioId, { nome: m.funcionarioNome, total: 0 })
    funcPendentesMap.get(m.funcionarioId).total += 1
  })
  const topFuncPendentes = Array.from(funcPendentesMap.values()).sort((a, b) => b.total - a.total).slice(0, 5)

  // Taxa de devolução (últimos 90 dias de empréstimos)
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000
  const emprestimos90d = movimentacoes.filter(m => m.tipoMovimentacao === 'saida-emprestimo' && m.dataMovimentacao >= ninetyDaysAgo)
  const devolvidos90d = emprestimos90d.filter(m => m.status === 'concluido' && m.devolucaoTipo === 'devolvido').length
  const taxaDevolucao = emprestimos90d.length > 0 ? ((devolvidos90d / emprestimos90d.length) * 100).toFixed(1) : '100.0'

  // Média de dias de empréstimo pendente
  let mediaDiasPendente = 0
  if (pendentesRaw.length > 0) {
    const totalDias = pendentesRaw.reduce((acc, m) => {
      const dias = Math.floor((now - (m.dataMovimentacao ?? now)) / (24 * 60 * 60 * 1000))
      return acc + dias
    }, 0)
    mediaDiasPendente = Math.round(totalDias / pendentesRaw.length)
  }

  return {
    totalProdutos: produtos.length,
    totalFuncionarios: funcionarios,
    pendentes,
    emManutencao,
    abaixoMinimo: itensAbaixoMinimo.length,
    itensZerados: itensZerados.length,
    totalSaidas30d: totalSaidas,
    totalPerdas30d: totalPerdas,
    totalEpiConsumo30d: totalEpiConsumo,
    taxaPerda,
    taxaDevolucao,
    mediaDiasPendente,
    consumoPorTipo,
    topProdutos,
    topFuncPendentes,
    produtosAbaixoMinimo: itensAbaixoMinimo,
    produtosVencendo,
    alertas: [
      ...(itensAbaixoMinimo.length > 0 ? [`${itensAbaixoMinimo.length} produtos abaixo do mínimo`] : []),
      ...(itensZerados.length > 0 ? [`${itensZerados.length} produtos sem estoque`] : []),
      ...(pendentes > 0 ? [`${pendentes} empréstimos pendentes`] : []),
      ...(mediaDiasPendente > 7 ? [`Média ${mediaDiasPendente} dias de atraso nos empréstimos`] : []),
      ...(produtosVencendo.length > 0 ? [`${produtosVencendo.length} produtos próximos ao vencimento`] : [])
    ]
  }
}

export async function getConsumoPorFuncionario({ dias = 30 } = {}) {
  const since = Date.now() - dias * 24 * 60 * 60 * 1000
  const movs = await db.movimentacoes
    .filter(m => m.dataMovimentacao >= since && (m.tipoMovimentacao === 'saida-entrega' || m.tipoMovimentacao === 'saida-emprestimo'))
    .toArray()

  const map = new Map()
  movs.forEach(m => {
    const id = m.funcionarioId
    if (!map.has(id)) {
      map.set(id, { funcionarioId: id, funcionarioNome: m.funcionarioNome, total: 0, itens: [] })
    }
    const entry = map.get(id)
    entry.total += Number(m.quantidade ?? 0)
    entry.itens.push({ produto: m.produtoNome, quantidade: m.quantidade, data: m.dataMovimentacao })
  })

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export async function getTopPerdas({ dias = 30, limit = 10 } = {}) {
  const since = Date.now() - dias * 24 * 60 * 60 * 1000
  return db.movimentacoes
    .filter(m => m.status === 'perdido' && m.dataDevolucaoReal >= since)
    .toArray()
    .then(arr => arr
      .sort((a, b) => (b.dataDevolucaoReal ?? 0) - (a.dataDevolucaoReal ?? 0))
      .slice(0, limit)
    )
}

export async function getConsumoPorProduto({ dias = 30 } = {}) {
  const since = Date.now() - dias * 24 * 60 * 60 * 1000
  const movs = await db.movimentacoes
    .filter(m => m.dataMovimentacao >= since && m.tipoMovimentacao === 'saida-entrega')
    .toArray()

  const map = new Map()
  movs.forEach(m => {
    if (!map.has(m.produtoId)) {
      map.set(m.produtoId, { produtoId: m.produtoId, produtoNome: m.produtoNome, tipo: m.tipoProduto, total: 0 })
    }
    map.get(m.produtoId).total += Number(m.quantidade ?? 0)
  })

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

// Comparativos de período
export async function getPeriodComparison(periodDays = 30) {
  const now = Date.now()
  const currentStart = now - (periodDays * 24 * 60 * 60 * 1000)
  const previousStart = currentStart - (periodDays * 24 * 60 * 60 * 1000)
  
  const allMovs = await db.movimentacoes.toArray()
  
  const currentMovs = allMovs.filter(m => m.dataMovimentacao >= currentStart)
  const previousMovs = allMovs.filter(m => 
    m.dataMovimentacao >= previousStart && m.dataMovimentacao < currentStart
  )
  
  const calcMetrics = (movs) => ({
    totalEntregas: movs.filter(m => m.tipoMovimentacao === 'saida-entrega').reduce((acc, m) => acc + (m.quantidade || 0), 0),
    totalEmprestimos: movs.filter(m => m.tipoMovimentacao === 'saida-emprestimo').length,
    totalItens: movs.reduce((acc, m) => acc + (m.quantidade || 0), 0),
    uniqueProducts: new Set(movs.map(m => m.produtoId)).size,
    uniqueEmployees: new Set(movs.map(m => m.funcionarioId)).size
  })
  
  const current = calcMetrics(currentMovs)
  const previous = calcMetrics(previousMovs)
  
  const calcChange = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }
  
  return {
    periodDays,
    current,
    previous,
    changes: {
      entregas: calcChange(current.totalEntregas, previous.totalEntregas),
      emprestimos: calcChange(current.totalEmprestimos, previous.totalEmprestimos),
      itens: calcChange(current.totalItens, previous.totalItens),
      produtos: calcChange(current.uniqueProducts, previous.uniqueProducts),
      funcionarios: calcChange(current.uniqueEmployees, previous.uniqueEmployees)
    }
  }
}
