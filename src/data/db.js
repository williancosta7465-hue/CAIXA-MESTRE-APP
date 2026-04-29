import Dexie from 'dexie'

export const db = new Dexie('caixa_mestre')

db.version(1).stores({
  users: 'id, login, perfil, ativo',
  auditLogs: 'id, dataHora, usuarioId, acao, tabelaAfetada, registroId',
  settings: 'key'
})

db.version(2).stores({
  users: 'id, login, perfil, ativo',
  auditLogs: 'id, dataHora, usuarioId, acao, tabelaAfetada, registroId',
  settings: 'key',
  produtos: 'id, tipo, nome, codigo, status, criadoEm',
  funcionarios: 'id, nome, matricula, status, criadoEm',
  movimentacoes: 'id, dataMovimentacao, funcionarioId, produtoId, tipoMovimentacao, status',
  pedidosAtivo: 'id, dataInicio',
  pedidosArquivados: 'id, numero, dataEnvio'
})

db.version(3)
  .stores({
    users: 'id, login, perfil, ativo',
    auditLogs: 'id, dataHora, usuarioId, acao, tabelaAfetada, registroId',
    settings: 'key',
    produtos: 'id, tipo, reutilizavel, nome, codigo, status, criadoEm',
    funcionarios: 'id, nome, matricula, status, criadoEm',
    movimentacoes: 'id, dataMovimentacao, funcionarioId, produtoId, tipoMovimentacao, status',
    pedidosAtivo: 'id, dataInicio',
    pedidosArquivados: 'id, numero, dataEnvio'
  })
  .upgrade(async (tx) => {
    const produtos = tx.table('produtos')
    await produtos.toCollection().modify((p) => {
      if (p.tipo === 'epi-pessoal') {
        p.tipo = 'epi'
        p.reutilizavel = false
      } else if (p.tipo === 'epi-reutilizavel') {
        p.tipo = 'epi'
        p.reutilizavel = true
      } else if (p.tipo === 'epi') {
        if (typeof p.reutilizavel !== 'boolean') p.reutilizavel = false
      }
    })
  })

// Versão 4: Adiciona contadores para numeração sequencial
db.version(4)
  .stores({
    users: 'id, login, perfil, ativo',
    auditLogs: 'id, dataHora, usuarioId, acao, tabelaAfetada, registroId',
    settings: 'key',
    produtos: 'id, tipo, reutilizavel, nome, codigo, status, criadoEm',
    funcionarios: 'id, nome, matricula, status, criadoEm',
    movimentacoes: 'id, dataMovimentacao, funcionarioId, produtoId, tipoMovimentacao, status, devolucaoTipo',
    pedidosAtivo: 'id, dataInicio',
    pedidosArquivados: 'id, numero, dataEnvio',
    counters: 'id'
  })
  .upgrade(async (tx) => {
    const movs = tx.table('movimentacoes')
    await movs.toCollection().modify((m) => {
      if (typeof m.devolucaoTipo === 'undefined') m.devolucaoTipo = null
      if (typeof m.dataDevolucaoReal === 'undefined') m.dataDevolucaoReal = null
    })
  })

// Versão 5: Adiciona foto nos produtos, fotoEntrega e assinatura nas movimentações
db.version(5)
  .stores({
    users: 'id, login, perfil, ativo',
    auditLogs: 'id, dataHora, usuarioId, acao, tabelaAfetada, registroId',
    settings: 'key',
    produtos: 'id, tipo, reutilizavel, nome, codigo, status, criadoEm',
    funcionarios: 'id, nome, matricula, status, criadoEm',
    movimentacoes: 'id, dataMovimentacao, funcionarioId, produtoId, tipoMovimentacao, status, devolucaoTipo',
    pedidosAtivo: 'id, dataInicio',
    pedidosArquivados: 'id, numero, dataEnvio',
    counters: 'id',
    backups: 'id, dataCriacao'
  })

export async function getNextOrderNumber() {
  const counter = await db.counters.get('orderNumber')
  const current = counter?.value || 0
  const next = current + 1
  
  await db.counters.put({
    id: 'orderNumber',
    value: next,
    updatedAt: Date.now()
  })
  
  return `PED-${String(next).padStart(3, '0')}`
}

export async function ensureSeedData() {
  const existing = await db.users.where('login').equals('admin').first()
  if (!existing) {
    await db.users.add({
      id: crypto.randomUUID(),
      nome: 'Administrador',
      login: 'admin',
      senhaHash: await hashPassword('7465'),
      perfil: 'admin',
      ativo: true,
      perguntaSeguranca: 'Qual o nome da sua mãe?',
      respostaSegurancaHash: await hashText('admin'),
      ultimoAcesso: null,
      tentativasLogin: 0,
      criadoEm: Date.now()
    })
  }
  
  // Importar dados iniciais se o banco estiver vazio
  await importInitialData()
}

async function importInitialData() {
  try {
    // Verificar se já existem produtos (se sim, dados já foram importados)
    const produtosCount = await db.produtos.count()
    if (produtosCount > 0) return
    
    // Disparar evento de início da importação
    window.dispatchEvent(new CustomEvent('dataImportStart', { 
      detail: { message: 'Iniciando importação de dados...' } 
    }))
    
    // Buscar arquivo de dados iniciais
    const response = await fetch('./dados_importar.json')
    if (!response.ok) {
      const msg = 'Arquivo dados_importar.json não encontrado, pulando importação inicial'
      console.log(msg)
      window.dispatchEvent(new CustomEvent('dataImportWarning', { 
        detail: { message: msg } 
      }))
      return
    }
    
    const data = await response.json()
    
    // Disparar evento de progresso
    window.dispatchEvent(new CustomEvent('dataImportProgress', { 
      detail: { message: 'Processando arquivo de dados...' } 
    }))
    
    let produtosImportados = 0
    let funcionariosImportados = 0
    let movimentacoesImportadas = 0
    
    await db.transaction('rw', db.produtos, db.funcionarios, db.movimentacoes, async () => {
      if (data.produtos?.length) {
        await db.produtos.bulkAdd(data.produtos)
        produtosImportados = data.produtos.length
        window.dispatchEvent(new CustomEvent('dataImportProgress', { 
          detail: { message: `Importando ${produtosImportados} produtos...` } 
        }))
      }
      if (data.funcionarios?.length) {
        await db.funcionarios.bulkAdd(data.funcionarios)
        funcionariosImportados = data.funcionarios.length
        window.dispatchEvent(new CustomEvent('dataImportProgress', { 
          detail: { message: `Importando ${funcionariosImportados} funcionários...` } 
        }))
      }
      if (data.movimentacoes?.length) {
        await db.movimentacoes.bulkAdd(data.movimentacoes)
        movimentacoesImportadas = data.movimentacoes.length
        window.dispatchEvent(new CustomEvent('dataImportProgress', { 
          detail: { message: `Importando ${movimentacoesImportadas} movimentações...` } 
        }))
      }
    })
    
    const successMsg = `Dados importados com sucesso! ${produtosImportados} produtos, ${funcionariosImportados} funcionários, ${movimentacoesImportadas} movimentações`
    console.log(successMsg)
    window.dispatchEvent(new CustomEvent('dataImportSuccess', { 
      detail: { 
        message: successMsg,
        produtos: produtosImportados,
        funcionarios: funcionariosImportados,
        movimentacoes: movimentacoesImportadas
      } 
    }))
  } catch (err) {
    const errorMsg = `Erro ao importar dados: ${err?.message || 'Erro desconhecido'}`
    console.error('Erro ao importar dados iniciais:', err)
    window.dispatchEvent(new CustomEvent('dataImportError', { 
      detail: { message: errorMsg, error: err } 
    }))
  }
}

export async function hashText(text) {
  const enc = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return bufferToHex(digest)
}

export async function hashPassword(password) {
  return hashText(password)
}

export async function verifyPassword(password, passwordHash) {
  const h = await hashPassword(password)
  return timingSafeEqual(h, passwordHash)
}

export async function verifySecurityAnswer(answer, answerHash) {
  const h = await hashText(answer)
  return timingSafeEqual(h, answerHash)
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
