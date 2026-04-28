import { db } from './db.js'

export async function addAuditLog({ usuarioId, usuarioNome, acao, detalhes, tabelaAfetada, registroId }) {
  await db.auditLogs.add({
    id: crypto.randomUUID(),
    dataHora: Date.now(),
    usuarioId: usuarioId ?? null,
    usuarioNome: usuarioNome ?? null,
    acao,
    detalhes: detalhes ?? null,
    tabelaAfetada: tabelaAfetada ?? null,
    registroId: registroId ?? null
  })
}
