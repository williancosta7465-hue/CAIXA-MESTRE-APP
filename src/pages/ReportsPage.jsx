import { useEffect, useMemo, useState } from 'react'
import Toast from '../components/Toast.jsx'
import BackButton from '../components/BackButton.jsx'
import { listEmployees } from '../data/employees.js'
import { getConsumoPorFuncionario, getConsumoPorProduto, getTopPerdas } from '../data/dashboard.js'
import { db } from '../data/db.js'
import { useAuth } from '../auth/AuthProvider.jsx'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('pt-BR')
  } catch {
    return '—'
  }
}

const REPORT_TYPES = [
  { id: 'consumo_funcionario', label: 'Consumo por funcionário' },
  { id: 'consumo_produto', label: 'Consumo por produto' },
  { id: 'perdas', label: 'Perdas recentes' },
  { id: 'pendentes', label: 'Pendentes de devolução' },
  { id: 'epi_motivos', label: 'EPIs por motivo' }
]

const EPI_MOTIVOS = [
  { id: '', label: 'Todos' },
  { id: 'novo', label: 'Novo' },
  { id: 'perda', label: 'Perda' },
  { id: 'troca', label: 'Troca' }
]

export default function ReportsPage() {
  const { session } = useAuth()
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [reportType, setReportType] = useState('consumo_funcionario')
  const [dias, setDias] = useState('30')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [detailModal, setDetailModal] = useState({ open: false, employee: null, movements: [] })
  const [selectedMotivo, setSelectedMotivo] = useState('')

  useEffect(() => {
    listEmployees({ status: 'ativo' }).then(setEmployees)
  }, [])

  async function openEmployeeDetails(employeeId) {
    const employee = employees.find(e => e.id === employeeId)
    if (!employee) return

    const d = Number(dias) || 30
    const since = Date.now() - d * 24 * 60 * 60 * 1000

    const movements = await db.movimentacoes
      .where('funcionarioId')
      .equals(employeeId)
      .filter(m => m.dataMovimentacao >= since)
      .reverse()
      .toArray()

    setDetailModal({ open: true, employee, movements })
  }

  async function loadReport() {
    setLoading(true)
    try {
      const d = Number(dias) || 30
      let result = []

      switch (reportType) {
        case 'consumo_funcionario':
          result = await getConsumoPorFuncionario({ dias: d })
          if (selectedEmployeeId) {
            result = result.filter(r => r.funcionarioId === selectedEmployeeId)
          }
          break
        case 'consumo_produto':
          result = await getConsumoPorProduto({ dias: d })
          break
        case 'perdas':
          result = await getTopPerdas({ dias: d, limit: 50 })
          break
        case 'pendentes':
          result = await db.movimentacoes.where('status').equals('pendente-devolucao').toArray()
          if (selectedEmployeeId) {
            result = result.filter(r => r.funcionarioId === selectedEmployeeId)
          }
          result = result.sort((a, b) => (a.dataMovimentacao ?? 0) - (b.dataMovimentacao ?? 0))
          break
        case 'epi_motivos':
          const sinceEpi = Date.now() - d * 24 * 60 * 60 * 1000
          result = await db.movimentacoes
            .filter(m => m.tipoProduto === 'epi' && !m.epiReutilizavel && m.dataMovimentacao >= sinceEpi && m.motivoEpi)
            .toArray()
          if (selectedMotivo) {
            result = result.filter(r => r.motivoEpi === selectedMotivo)
          }
          break
        default:
          result = []
      }

      setData(result)
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    if (data.length === 0) return
    let csv = ''

    if (reportType === 'consumo_funcionario') {
      csv = 'Funcionário,Total Itens\n'
      data.forEach(r => { csv += `"${r.funcionarioNome}",${r.total}\n` })
    } else if (reportType === 'consumo_produto') {
      csv = 'Produto,Tipo,Total\n'
      data.forEach(r => { csv += `"${r.produtoNome}","${r.tipo}",${r.total}\n` })
    } else if (reportType === 'perdas') {
      csv = 'Data,Produto,Funcionário,Quantidade,Observação\n'
      data.forEach(r => { csv += `${formatDate(r.dataDevolucaoReal)},"${r.produtoNome}","${r.funcionarioNome}",${r.quantidade},"${r.observacaoDevolucao || ''}"\n` })
    } else if (reportType === 'pendentes') {
      csv = 'Data,Produto,Funcionário,Quantidade\n'
      data.forEach(r => { csv += `${formatDate(r.dataMovimentacao)},"${r.produtoNome}","${r.funcionarioNome}",${r.quantidade}\n` })
    } else if (reportType === 'epi_motivos') {
      csv = 'Data,Produto,Funcionário,Motivo,Quantidade\n'
      data.forEach(r => { csv += `${formatDate(r.dataMovimentacao)},"${r.produtoNome}","${r.funcionarioNome}",${r.motivoEpi},${r.quantidade}\n` })
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    setToastType('success')
    setToast('CSV exportado.')
  }

  async function exportPDF() {
    if (data.length === 0) {
      setToastType('error')
      setToast('Nenhum dado para gerar PDF. Gere o relatório primeiro.')
      return
    }
    
    setToastType('info')
    setToast('Gerando PDF...')
    
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF('landscape')

      // Função auxiliar para desenhar célula da tabela
      function drawTableCell(x, y, width, height, text, align = 'left', isHeader = false) {
        doc.setFillColor(isHeader ? 11 : 255, isHeader ? 41 : 255, isHeader ? 72 : 255)
        doc.setDrawColor(200, 200, 200)
        doc.rect(x, y, width, height, isHeader ? 'FD' : 'S')
        doc.setTextColor(isHeader ? 255 : 0, isHeader ? 255 : 0, isHeader ? 255 : 0)
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
        const textX = align === 'center' ? x + width / 2 : x + 2
        const textY = y + height / 2 + 3
        doc.text(text, textX, textY, { align: align === 'center' ? 'center' : 'left' })
      }

      // Função para desenhar linha de dados
      function drawTableRow(items, y, colWidths, align = 'left') {
        let x = 14
        items.forEach((item, idx) => {
          drawTableCell(x, y, colWidths[idx], 8, item, align, false)
          x += colWidths[idx]
        })
      }

      // Função para desenhar cabeçalho da tabela
      function drawTableHeader(headers, y, colWidths, align = 'left') {
        let x = 14
        headers.forEach((header, idx) => {
          drawTableCell(x, y, colWidths[idx], 10, header, align, true)
          x += colWidths[idx]
        })
      }

      // Cabeçalho profissional com fundo gradient
      // Fundo do cabeçalho
      doc.setFillColor(15, 42, 68)
      doc.rect(0, 0, 297, 60, 'F')
      
      // Linha laranja inferior
      doc.setFillColor(245, 124, 0)
      doc.rect(0, 56, 297, 4, 'F')
      
      // Adicionar logo
      let logoLoaded = false
      try {
        const possiblePaths = [
          './caixa-mestre-logo.png',
          '/caixa-mestre-logo.png',
          'caixa-mestre-logo.png'
        ]
        
        let logoBase64 = null
        for (const logoUrl of possiblePaths) {
          try {
            const response = await fetch(logoUrl)
            if (response.ok) {
              const blob = await response.blob()
              const reader = new FileReader()
              logoBase64 = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
              })
              if (logoBase64) break
            }
          } catch (e) {
            // Tenta próximo caminho
          }
        }
        
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 15, 15, 40, 40)
          logoLoaded = true
        }
      } catch (e) {
        console.log('Não foi possível carregar o logo:', e)
      }
      
      // Título centralizado
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      const titleWidth = doc.getTextWidth('RELATÓRIO')
      doc.text('RELATÓRIO', (297 - titleWidth) / 2, 30)
      
      // Subtítulo
      doc.setFontSize(12)
      doc.setTextColor(245, 124, 0)
      const subTitleWidth = doc.getTextWidth(title)
      doc.text(title.toUpperCase(), (297 - subTitleWidth) / 2, 38)
      
      // Informações à direita
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 250, 25)
      doc.text(`Registros: ${data.length}`, 250, 35)
      doc.text(`Gerado por: ${session?.usuarioNome || 'Sistema'}`, 250, 45)
      
      // Linha separadora após cabeçalho
      doc.setDrawColor(200, 200, 200)
      doc.line(14, 65, 280, 65)

      let y = 75

      // Desenhar tabela baseada no tipo de relatório (modo paisagem)
      if (reportType === 'consumo_funcionario') {
        const colWidths = [15, 185, 60]
        drawTableHeader(['#', 'Funcionário', 'Total'], y, colWidths, 'center')
        y += 10
        data.forEach((item, idx) => {
          if (y > 180) {
            doc.addPage()
            y = 20
            drawTableHeader(['#', 'Funcionário', 'Total'], y, colWidths, 'center')
            y += 10
          }
          drawTableRow([String(idx + 1), item.funcionarioNome, String(item.total)], y, colWidths, 'center')
          y += 7
        })
      } else if (reportType === 'consumo_produto') {
        const colWidths = [20, 125, 40, 55]
        drawTableHeader(['#', 'Produto', 'Tipo', 'Total'], y, colWidths, 'center')
        y += 10
        data.forEach((item, idx) => {
          if (y > 180) {
            doc.addPage()
            y = 20
            drawTableHeader(['#', 'Produto', 'Tipo', 'Total'], y, colWidths, 'center')
            y += 10
          }
          drawTableRow([String(idx + 1), item.produtoNome, item.tipo, String(item.total)], y, colWidths, 'center')
          y += 7
        })
      } else if (reportType === 'perdas') {
        const colWidths = [20, 40, 120, 80, 30]
        drawTableHeader(['#', 'Data', 'Produto', 'Funcionário', 'Qtd'], y, colWidths, 'center')
        y += 10
        data.forEach((item, idx) => {
          if (y > 180) {
            doc.addPage()
            y = 20
            drawTableHeader(['#', 'Data', 'Produto', 'Funcionário', 'Qtd'], y, colWidths, 'center')
            y += 10
          }
          drawTableRow([String(idx + 1), formatDate(item.dataDevolucaoReal), item.produtoNome, item.funcionarioNome, String(item.quantidade)], y, colWidths, 'center')
          y += 8
          if (item.observacaoDevolucao && y < 180) {
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text(`Obs: ${item.observacaoDevolucao}`, 20, y)
            y += 5
            doc.setFontSize(9)
            doc.setTextColor(0, 0, 0)
          }
        })
      } else if (reportType === 'pendentes') {
        const colWidths = [15, 95, 65, 35, 45]
        drawTableHeader(['#', 'Produto', 'Funcionário', 'Qtd', 'Data'], y, colWidths, 'center')
        y += 10
        data.forEach((item, idx) => {
          if (y > 180) {
            doc.addPage()
            y = 20
            drawTableHeader(['#', 'Produto', 'Funcionário', 'Qtd', 'Data'], y, colWidths, 'center')
            y += 10
          }
          drawTableRow([String(idx + 1), item.produtoNome, item.funcionarioNome, String(item.quantidade), formatDate(item.dataMovimentacao)], y, colWidths, 'center')
          y += 7
        })
      } else if (reportType === 'epi_motivos') {
        const colWidths = [15, 45, 75, 55, 35, 30]
        drawTableHeader(['#', 'Data', 'Produto', 'Funcionário', 'Motivo', 'Qtd'], y, colWidths, 'center')
        y += 10
        data.forEach((item, idx) => {
          if (y > 180) {
            doc.addPage()
            y = 20
            drawTableHeader(['#', 'Data', 'Produto', 'Funcionário', 'Motivo', 'Qtd'], y, colWidths, 'center')
            y += 10
          }
          drawTableRow([String(idx + 1), formatDate(item.dataMovimentacao), item.produtoNome, item.funcionarioNome, item.motivoEpi || '-', String(item.quantidade)], y, colWidths, 'center')
          y += 7
        })
      }

      const fileName = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      setToastType('success')
      setToast(`PDF gerado: ${fileName}`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setToastType('error')
      let errorMsg = 'Erro ao gerar PDF'
      
      if (err?.message?.includes('jsPDF')) {
        errorMsg = 'Biblioteca PDF não disponível. Tente recarregar a página.'
      } else if (err?.message?.includes('fetch')) {
        errorMsg = 'Erro ao carregar recursos. Verifique sua conexão.'
      } else if (err?.message) {
        errorMsg = `Erro: ${err.message}`
      }
      
      setToast(errorMsg)
    }
  }

  const title = useMemo(() => REPORT_TYPES.find(r => r.id === reportType)?.label || 'Relatório', [reportType])

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <BackButton />

      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Relatórios</div>
        <div className="mt-1 text-xs text-white/70">Filtre e exporte dados do sistema.</div>
      </div>

      <div className="rounded-2xl cm-card p-4">
        <div className="text-xs text-white/70 mb-2">Filtros do relatório</div>
        
        <div className="space-y-3">
          <div>
            <div className="text-xs text-white/60">Tipo de relatório</div>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
            >
              {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-white/60">Período (dias)</div>
              <input
                inputMode="numeric"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none"
                placeholder="30"
              />
            </div>
            {(reportType === 'consumo_funcionario' || reportType === 'pendentes') && (
              <div>
                <div className="text-xs text-white/60">Funcionário</div>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
                >
                  <option value="">Todos</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            )}
            {reportType === 'epi_motivos' && (
              <div>
                <div className="text-xs text-white/60">Motivo</div>
                <select
                  value={selectedMotivo}
                  onChange={(e) => setSelectedMotivo(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-3 text-sm"
                >
                  {EPI_MOTIVOS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <button
            disabled={loading}
            onClick={loadReport}
            className="w-full rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Carregando…' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="rounded-2xl cm-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">{title}</div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold">CSV</button>
              <button onClick={exportPDF} className="rounded-xl bg-accent-600 px-3 py-2 text-xs font-semibold text-white">PDF</button>
            </div>
          </div>
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
            {reportType === 'consumo_funcionario' && data.map(r => (
              <div key={r.funcionarioId} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{r.funcionarioNome}</div>
                    <div className="text-xs text-white/70">Total: {r.total} itens</div>
                  </div>
                  <button
                    onClick={() => openEmployeeDetails(r.funcionarioId)}
                    className="rounded-lg bg-accent-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            ))}
            {reportType === 'consumo_produto' && data.map(r => (
              <div key={r.produtoId} className="rounded-xl bg-white/5 p-3">
                <div className="text-sm font-semibold">{r.produtoNome}</div>
                <div className="text-xs text-white/70">{r.tipo} • Total: {r.total}</div>
              </div>
            ))}
            {reportType === 'perdas' && data.map(r => (
              <div key={r.id} className="rounded-xl bg-white/5 p-3">
                <div className="text-sm font-semibold">{r.produtoNome}</div>
                <div className="text-xs text-white/70">{formatDate(r.dataDevolucaoReal)} • {r.funcionarioNome} • Qtd: {r.quantidade}</div>
                {r.observacaoDevolucao && <div className="mt-1 text-xs text-white/50">Obs: {r.observacaoDevolucao}</div>}
              </div>
            ))}
            {reportType === 'pendentes' && data.map(r => (
              <div key={r.id} className="rounded-xl bg-white/5 p-3">
                <div className="text-sm font-semibold">{r.produtoNome}</div>
                <div className="text-xs text-white/70">{formatDate(r.dataMovimentacao)} • {r.funcionarioNome} • Qtd: {r.quantidade}</div>
              </div>
            ))}
            {reportType === 'epi_motivos' && data.map(r => (
              <div key={r.id} className="rounded-xl bg-white/5 p-3">
                <div className="text-sm font-semibold">{r.produtoNome}</div>
                <div className="text-xs text-white/70">{formatDate(r.dataMovimentacao)} • {r.funcionarioNome} • Motivo: {r.motivoEpi} • Qtd: {r.quantidade}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="rounded-2xl cm-card p-4 text-sm text-white/70">Nenhum dado. Clique em "Gerar relatório".</div>
      )}

      {/* Modal de Detalhes */}
      {detailModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setDetailModal({ open: false, employee: null, movements: [] })}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#0b2948] p-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold">{detailModal.employee?.nome}</div>
                <div className="text-xs text-white/70">Movimentações recentes</div>
              </div>
              <button
                onClick={() => setDetailModal({ open: false, employee: null, movements: [] })}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              {detailModal.movements.length === 0 ? (
                <div className="text-sm text-white/70">Nenhuma movimentação encontrada.</div>
              ) : (
                detailModal.movements.map((m) => (
                  <div key={m.id} className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{m.produtoNome}</div>
                      <div className={`rounded-lg px-2 py-1 text-[10px] ${
                        m.status === 'pendente-devolucao' ? 'bg-amber-500/90 text-white' :
                        m.status === 'devolvido' ? 'bg-emerald-600/90 text-white' :
                        'bg-blue-600/90 text-white'
                      }`}>
                        {m.status === 'pendente-devolucao' ? 'Pendente' :
                         m.status === 'devolvido' ? 'Devolvido' :
                         m.status === 'entregue' ? 'Entregue' : m.status}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                      {formatDate(m.dataMovimentacao)} • Qtd: {m.quantidade}
                    </div>
                    {m.fotoEntrega && (
                      <div className="mt-2">
                        <div className="text-xs text-white/60 mb-1">Foto da entrega</div>
                        <img
                          src={m.fotoEntrega}
                          alt="Foto da entrega"
                          className="w-full rounded-lg object-cover max-h-32"
                        />
                      </div>
                    )}
                    {m.assinaturaFuncionario && (
                      <div className="mt-2">
                        <div className="text-xs text-white/60 mb-1">Assinatura</div>
                        <img
                          src={m.assinaturaFuncionario}
                          alt="Assinatura"
                          className="w-full rounded-lg bg-white p-1 max-h-24"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
