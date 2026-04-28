import { db } from './db.js'
import { addAuditLog } from './audit.js'

export const MOVEMENT_TYPES = {
  saida_emprestimo: 'saida-emprestimo',
  saida_entrega: 'saida-entrega',
  devolucao: 'devolucao',
  cancelar_entrega: 'cancelar-entrega',
  cancelar_emprestimo: 'cancelar-emprestimo'
}

export const DEVOLUCAO_TIPO = {
  devolvido: 'devolvido',
  perdido: 'perdido',
  manutencao: 'manutencao'
}

function getOperacaoPorProduto(produto) {
  if (produto.tipo === 'ferramenta') return 'emprestimo'
  if (produto.tipo === 'material') return 'entrega'
  if (produto.tipo === 'epi') return produto.reutilizavel ? 'emprestimo' : 'entrega'
  return 'entrega'
}

export async function createTransaction({
  usuario,
  funcionario,
  itens,
  assinaturaBase64,
  fotoEntrega,
  observacaoGeral
}) {
  if (!funcionario?.id) throw new Error('Selecione um funcionário.')
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('Carrinho vazio.')
  if (!assinaturaBase64) throw new Error('Assinatura obrigatória.')

  const now = Date.now()

  return db.transaction('rw', db.produtos, db.movimentacoes, db.auditLogs, async () => {
    for (const it of itens) {
      const produto = await db.produtos.get(it.produtoId)
      if (!produto) throw new Error('Produto não encontrado.')

      const qty = Number(it.quantidade)
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantidade inválida.')

      const atual = Number(produto.quantidade ?? 0)
      if (qty > atual) {
        throw new Error(`Estoque insuficiente: ${produto.nome} (disp: ${atual})`)
      }

      const operacao = getOperacaoPorProduto(produto)
      const tipoMovimentacao = operacao === 'emprestimo' ? MOVEMENT_TYPES.saida_emprestimo : MOVEMENT_TYPES.saida_entrega

      if (produto.tipo === 'epi' && !produto.reutilizavel) {
        const motivo = it.motivoEpi
        if (!motivo) throw new Error(`Informe o motivo do EPI: ${produto.nome}`)
      }

      await db.produtos.update(produto.id, {
        quantidade: atual - qty,
        atualizadoEm: now
      })

      const mov = {
        id: crypto.randomUUID(),
        produtoId: produto.id,
        produtoNome: produto.nome,
        tipoProduto: produto.tipo,
        epiReutilizavel: produto.tipo === 'epi' ? Boolean(produto.reutilizavel) : null,
        tipoMovimentacao,
        quantidade: qty,
        funcionarioId: funcionario.id,
        funcionarioNome: funcionario.nome,
        dataMovimentacao: now,
        status: operacao === 'emprestimo' ? 'pendente-devolucao' : 'concluido',
        devolucaoTipo: null,
        dataDevolucaoReal: null,
        motivoEpi: produto.tipo === 'epi' && !produto.reutilizavel ? it.motivoEpi : null,
        observacao: it.observacao ?? null,
        observacaoGeral: observacaoGeral ?? null,
        assinaturaFuncionario: assinaturaBase64,
        fotoEntrega: fotoEntrega ?? null,
        usuarioId: usuario?.usuarioId ?? null,
        usuarioNome: usuario?.usuarioNome ?? null
      }

      await db.movimentacoes.add(mov)
    }

    await addAuditLog({
      usuarioId: usuario?.usuarioId ?? null,
      usuarioNome: usuario?.usuarioNome ?? null,
      acao: 'MOVIMENTACAO_CARRINHO_FINALIZADA',
      detalhes: JSON.stringify({ funcionarioId: funcionario.id, itens: itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })) }),
      tabelaAfetada: 'movimentacoes',
      registroId: null
    })

    return { ok: true }
  })
}

export async function listPendingLoans() {
  return db.movimentacoes.where('status').equals('pendente-devolucao').toArray()
}

export async function registerLoanReturn({ usuario, movementId, observacao }) {
  const now = Date.now()
  return db.transaction('rw', db.movimentacoes, db.produtos, db.auditLogs, async () => {
    const mov = await db.movimentacoes.get(movementId)
    if (!mov) throw new Error('Movimentação não encontrada.')
    if (mov.status !== 'pendente-devolucao') throw new Error('Este item não está pendente.')

    const produto = await db.produtos.get(mov.produtoId)
    if (!produto) throw new Error('Produto não encontrado.')

    const atual = Number(produto.quantidade ?? 0)
    const qty = Number(mov.quantidade ?? 0)
    await db.produtos.update(produto.id, { quantidade: atual + qty, atualizadoEm: now })

    await db.movimentacoes.update(mov.id, {
      status: 'concluido',
      devolucaoTipo: DEVOLUCAO_TIPO.devolvido,
      dataDevolucaoReal: now,
      observacaoDevolucao: observacao ?? null,
      usuarioDevolucaoId: usuario?.usuarioId ?? null,
      usuarioDevolucaoNome: usuario?.usuarioNome ?? null
    })

    await addAuditLog({
      usuarioId: usuario?.usuarioId ?? null,
      usuarioNome: usuario?.usuarioNome ?? null,
      acao: 'DEVOLUCAO_REGISTRADA',
      detalhes: JSON.stringify({ movementId }),
      tabelaAfetada: 'movimentacoes',
      registroId: mov.id
    })
  })
}

export async function markLoanAsLost({ usuario, movementId, observacao }) {
  const now = Date.now()
  return db.transaction('rw', db.movimentacoes, db.auditLogs, async () => {
    const mov = await db.movimentacoes.get(movementId)
    if (!mov) throw new Error('Movimentação não encontrada.')
    if (mov.status !== 'pendente-devolucao') throw new Error('Este item não está pendente.')

    await db.movimentacoes.update(mov.id, {
      status: 'perdido',
      devolucaoTipo: DEVOLUCAO_TIPO.perdido,
      dataDevolucaoReal: now,
      observacaoDevolucao: observacao ?? null,
      usuarioDevolucaoId: usuario?.usuarioId ?? null,
      usuarioDevolucaoNome: usuario?.usuarioNome ?? null
    })

    await addAuditLog({
      usuarioId: usuario?.usuarioId ?? null,
      usuarioNome: usuario?.usuarioNome ?? null,
      acao: 'EMPRESTIMO_MARCADO_PERDIDO',
      detalhes: JSON.stringify({ movementId }),
      tabelaAfetada: 'movimentacoes',
      registroId: mov.id
    })
  })
}

export async function sendLoanToMaintenance({ usuario, movementId, observacao }) {
  const now = Date.now()
  return db.transaction('rw', db.movimentacoes, db.auditLogs, async () => {
    const mov = await db.movimentacoes.get(movementId)
    if (!mov) throw new Error('Movimentação não encontrada.')
    if (mov.status !== 'pendente-devolucao') throw new Error('Este item não está pendente.')

    await db.movimentacoes.update(mov.id, {
      status: 'em-manutencao',
      devolucaoTipo: DEVOLUCAO_TIPO.manutencao,
      dataEnvioManutencao: now,
      observacaoDevolucao: observacao ?? null,
      usuarioDevolucaoId: usuario?.usuarioId ?? null,
      usuarioDevolucaoNome: usuario?.usuarioNome ?? null
    })

    await addAuditLog({
      usuarioId: usuario?.usuarioId ?? null,
      usuarioNome: usuario?.usuarioNome ?? null,
      acao: 'EMPRESTIMO_ENVIADO_MANUTENCAO',
      detalhes: JSON.stringify({ movementId }),
      tabelaAfetada: 'movimentacoes',
      registroId: mov.id
    })
  })
}

export async function returnFromMaintenance({ usuario, movementId, observacao }) {
  const now = Date.now()
  return db.transaction('rw', db.movimentacoes, db.produtos, db.auditLogs, async () => {
    const mov = await db.movimentacoes.get(movementId)
    if (!mov) throw new Error('Movimentação não encontrada.')
    if (mov.status !== 'em-manutencao') throw new Error('Este item não está em manutenção.')

    const produto = await db.produtos.get(mov.produtoId)
    if (!produto) throw new Error('Produto não encontrado.')

    const atual = Number(produto.quantidade ?? 0)
    const qty = Number(mov.quantidade ?? 0)
    await db.produtos.update(produto.id, { quantidade: atual + qty, atualizadoEm: now })

    await db.movimentacoes.update(mov.id, {
      status: 'concluido',
      devolucaoTipo: DEVOLUCAO_TIPO.devolvido,
      dataDevolucaoReal: now,
      observacaoRetornoManutencao: observacao ?? null,
      usuarioRetornoId: usuario?.usuarioId ?? null,
      usuarioRetornoNome: usuario?.usuarioNome ?? null
    })

    await addAuditLog({
      usuarioId: usuario?.usuarioId ?? null,
      usuarioNome: usuario?.usuarioNome ?? null,
      acao: 'MANUTENCAO_RETORNO_ESTOQUE',
      detalhes: JSON.stringify({ movementId }),
      tabelaAfetada: 'movimentacoes',
      registroId: mov.id
    })
  })
}
