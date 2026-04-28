import { db } from './db.js'
import { addAuditLog } from './audit.js'

export async function getActiveOrder() {
  const ativos = await db.pedidosAtivo.toArray()
  return ativos[0] ?? null
}

export async function startNewOrder() {
  const ativo = await getActiveOrder()
  if (ativo) throw new Error('Já existe um pedido ativo. Finalize ou cancele-o primeiro.')

  const order = {
    id: crypto.randomUUID(),
    dataInicio: Date.now(),
    itens: []
  }
  await db.pedidosAtivo.add(order)
  return order
}

export async function addItemToOrder({ produtoId, produtoNome, tipo, quantidadeSolicitada, observacao }) {
  const ativo = await getActiveOrder()
  if (!ativo) throw new Error('Nenhum pedido ativo. Inicie um novo pedido.')

  const item = {
    id: crypto.randomUUID(),
    produtoId,
    produtoNome,
    tipo,
    quantidadeSolicitada: Number(quantidadeSolicitada) || 0,
    observacao: observacao ?? null,
    adicionadoEm: Date.now()
  }

  ativo.itens = [...(ativo.itens || []), item]
  await db.pedidosAtivo.update(ativo.id, { itens: ativo.itens })
  return ativo
}

export async function removeItemFromOrder(itemId) {
  const ativo = await getActiveOrder()
  if (!ativo) throw new Error('Nenhum pedido ativo.')

  ativo.itens = (ativo.itens || []).filter(i => i.id !== itemId)
  await db.pedidosAtivo.update(ativo.id, { itens: ativo.itens })
  return ativo
}

export async function finalizeOrder({ usuario, numeroPedido }) {
  const ativo = await getActiveOrder()
  if (!ativo) throw new Error('Nenhum pedido ativo.')
  if (!Array.isArray(ativo.itens) || ativo.itens.length === 0) throw new Error('Pedido vazio.')

  const pedidoFinal = {
    id: ativo.id,
    numero: numeroPedido || `PED-${Date.now()}`,
    dataInicio: ativo.dataInicio,
    dataEnvio: Date.now(),
    itens: ativo.itens,
    usuarioId: usuario?.usuarioId ?? null,
    usuarioNome: usuario?.usuarioNome ?? null
  }

  await db.pedidosArquivados.add(pedidoFinal)
  await db.pedidosAtivo.delete(ativo.id)

  await addAuditLog({
    usuarioId: usuario?.usuarioId ?? null,
    usuarioNome: usuario?.usuarioNome ?? null,
    acao: 'PEDIDO_FINALIZADO',
    detalhes: JSON.stringify({ pedidoId: pedidoFinal.id, numero: pedidoFinal.numero, itensCount: pedidoFinal.itens.length }),
    tabelaAfetada: 'pedidosArquivados',
    registroId: pedidoFinal.id
  })

  return pedidoFinal
}

export async function cancelActiveOrder({ usuario }) {
  const ativo = await getActiveOrder()
  if (!ativo) return null

  await db.pedidosAtivo.delete(ativo.id)

  await addAuditLog({
    usuarioId: usuario?.usuarioId ?? null,
    usuarioNome: usuario?.usuarioNome ?? null,
    acao: 'PEDIDO_CANCELADO',
    detalhes: JSON.stringify({ pedidoId: ativo.id }),
    tabelaAfetada: 'pedidosAtivo',
    registroId: ativo.id
  })

  return true
}

export async function listArchivedOrders({ limit = 50 } = {}) {
  return db.pedidosArquivados
    .orderBy('dataEnvio')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function deleteArchivedOrder(orderId) {
  const pedido = await db.pedidosArquivados.get(orderId)
  if (!pedido) throw new Error('Pedido não encontrado.')
  
  await db.pedidosArquivados.delete(orderId)
  return pedido
}

export function generateOrderText(pedido) {
  const dataStr = new Date(pedido.dataEnvio).toLocaleDateString('pt-BR')
  let txt = `*Pedido: ${pedido.numero}*\n📅 Data: ${dataStr}\n\n*Itens solicitados:*\n`

  pedido.itens.forEach((it, idx) => {
    txt += `${idx + 1}. ${it.produtoNome} (${it.tipo}) - Qtd: ${it.quantidadeSolicitada}${it.observacao ? ` - Obs: ${it.observacao}` : ''}\n`
  })

  txt += `\n_Total: ${pedido.itens.length} itens_`
  return txt
}

export function shareViaWhatsApp(text) {
  const encoded = encodeURIComponent(text)
  const url = `https://wa.me/?text=${encoded}`
  window.open(url, '_blank')
}

// Função auxiliar para desenhar célula da tabela
function drawTableCell(doc, x, y, width, height, text, align = 'left', isHeader = false) {
  doc.setFillColor(isHeader ? 11 : 255, isHeader ? 41 : 255, isHeader ? 72 : 255)
  doc.setDrawColor(200, 200, 200)
  doc.rect(x, y, width, height, isHeader ? 'FD' : 'S')
  doc.setTextColor(isHeader ? 255 : 0, isHeader ? 255 : 0, isHeader ? 255 : 0)
  doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
  const textX = align === 'center' ? x + width / 2 : x + 2
  const textY = y + height / 2 + 3
  doc.text(text, textX, textY, { align: align === 'center' ? 'center' : 'left' })
}

export async function generateOrderPDF(pedido, returnBlob = false) {
  try {
    const { jsPDF } = await import('jspdf')
    // Orientação paisagem (landscape) para caber mais colunas
    const doc = new jsPDF('landscape')

  // Funções auxiliares para tabela
  function drawTableRow(items, y, colWidths, align = 'left') {
    let x = 14
    items.forEach((item, idx) => {
      drawTableCell(doc, x, y, colWidths[idx], 8, item, align, false)
      x += colWidths[idx]
    })
  }

  function drawTableHeader(headers, y, colWidths, align = 'left') {
    let x = 14
    headers.forEach((header, idx) => {
      drawTableCell(doc, x, y, colWidths[idx], 10, header, align, true)
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
      '/caixa-mestre-logo.png',
      '/CAIXA-MESTRE-APP/caixa-mestre-logo.png',
      '/caixa-mestre-pwa/caixa-mestre-logo.png',
      'caixa-mestre-logo.png',
      './caixa-mestre-logo.png'
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
  const titleWidth = doc.getTextWidth('PEDIDO DE COMPRA')
  doc.text('PEDIDO DE COMPRA', (297 - titleWidth) / 2, 30)
  
  // Subtítulo
  doc.setFontSize(12)
  doc.setTextColor(245, 124, 0)
  const subTitleWidth = doc.getTextWidth(`Nº ${pedido.numero}`)
  doc.text(`Nº ${pedido.numero}`, (297 - subTitleWidth) / 2, 38)
  
  // Informações à direita
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Data: ${new Date(pedido.dataEnvio).toLocaleDateString('pt-BR')}`, 250, 25)
  doc.text(`Itens: ${pedido.itens.length}`, 250, 35)
  doc.text('Gerado por: Sistema', 250, 45)
  
  // Linha separadora após cabeçalho
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 65, 280, 65)

  // Tabela de itens - em paisagem cabem mais colunas
  let y = 75
  const colWidths = [15, 125, 40, 25, 55] // #, Produto, Tipo, Qtd, Observação
  drawTableHeader(['#', 'Produto', 'Tipo', 'Qtd', 'Obs'], y, colWidths, 'center')
  y += 10

  doc.setFontSize(8)
  pedido.itens.forEach((it, idx) => {
    if (y > 180) { // Em paisagem, a página é menor na altura
      doc.addPage()
      y = 20
      drawTableHeader(['#', 'Produto', 'Tipo', 'Qtd', 'Obs'], y, colWidths, 'center')
      y += 10
    }
    drawTableRow([
      String(idx + 1),
      it.produtoNome,
      it.tipo,
      String(it.quantidadeSolicitada),
      it.observacao || '-'
    ], y, colWidths, 'center')
    y += 7
  })

  if (returnBlob) {
    return doc.output('blob')
  } else {
    doc.save(`pedido-${pedido.numero}.pdf`)
  }
  } catch (err) {
    console.error('Erro ao gerar PDF do pedido:', err)
    throw new Error(
      err?.message?.includes('jsPDF') ? 
        'Biblioteca PDF não disponível. Tente recarregar a página.' :
        err?.message?.includes('fetch') ?
        'Erro ao carregar recursos. Verifique sua conexão.' :
        `Erro ao gerar PDF: ${err?.message || 'Erro desconhecido'}`
    )
  }
}

export async function shareOrderViaWhatsApp(pedido) {
  try {
    // Gerar o PDF como blob
    const pdfBlob = await generateOrderPDF(pedido, true)
    const file = new File([pdfBlob], `pedido-${pedido.numero}.pdf`, { type: 'application/pdf' })

    // Tentar usar Web Share API (funciona em mobile moderno)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Pedido ${pedido.numero}`,
        text: `Pedido de compra ${pedido.numero} - ${pedido.itens.length} itens`
      })
    } else {
      // Se não suportar, baixa o PDF e mostra mensagem
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedido-${pedido.numero}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      
      // Abrir WhatsApp com mensagem informando para anexar o PDF
      const message = `Olá! Segue o Pedido ${pedido.numero} com ${pedido.itens.length} itens. O PDF foi baixado, por favor anexe-o manualmente.`
      const encoded = encodeURIComponent(message)
      window.open(`https://wa.me/?text=${encoded}`, '_blank')
    }
  } catch (err) {
    console.error('Erro ao compartilhar:', err)
    // Fallback: baixar PDF
    await generateOrderPDF(pedido, false)
    alert('PDF baixado. Por favor, anexe-o manualmente no WhatsApp.')
  }
}
