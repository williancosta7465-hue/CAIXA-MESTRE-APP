// Gerador de relatórios PDF simplificado
export function generateStockReport(products, title = 'Relatório de Estoque') {
  const headers = ['Nome', 'Código', 'Tipo', 'Quantidade', 'Estoque Mínimo', 'Status']
  const rows = products.map(p => [
    p.nome || '',
    p.codigo || '',
    p.tipo || '',
    String(p.quantidade || 0),
    String(p.estoqueMinimo || 0),
    p.status || 'ativo'
  ])
  
  return { title, headers, rows, generatedAt: new Date().toISOString() }
}

export function generateMovementReport(movements, title = 'Relatório de Movimentações') {
  const headers = ['Data', 'Produto', 'Funcionário', 'Tipo', 'Quantidade', 'Status']
  const rows = movements.map(m => [
    new Date(m.dataMovimentacao).toLocaleDateString('pt-BR'),
    m.produtoNome || '',
    m.funcionarioNome || '',
    m.tipoMovimentacao || '',
    String(m.quantidade || 0),
    m.status || ''
  ])
  
  return { title, headers, rows, generatedAt: new Date().toISOString() }
}

export function downloadCSV(reportData, filename) {
  const csv = [
    reportData.headers.join(';'),
    ...reportData.rows.map(row => row.join(';'))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
