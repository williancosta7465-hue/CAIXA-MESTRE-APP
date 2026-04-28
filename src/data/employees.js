import { db } from './db.js'

export async function listEmployees({ q = '', status = 'todos' } = {}) {
  const query = q.trim().toLowerCase()
  const all = await db.funcionarios.toArray()

  return all
    .filter((f) => {
      if (status !== 'todos' && f.status !== status) return false
      if (!query) return true
      return (
        (f.nome ?? '').toLowerCase().includes(query) ||
        (f.matricula ?? '').toLowerCase().includes(query)
      )
    })
    .sort((a, b) => (b.criadoEm ?? 0) - (a.criadoEm ?? 0))
}

export async function createEmployee(payload) {
  const now = Date.now()
  const emp = {
    id: crypto.randomUUID(),
    nome: (payload.nome ?? '').trim(),
    matricula: (payload.matricula ?? '').trim() || null,
    funcao: (payload.funcao ?? '').trim() || null,
    status: 'ativo',
    criadoEm: now,
    atualizadoEm: now
  }

  await db.funcionarios.add(emp)
  return emp
}

export async function updateEmployee({ id, nome, matricula, funcao, status }) {
  const emp = await db.funcionarios.get(id)
  if (!emp) throw new Error('Funcionário não encontrado')

  const updates = {
    nome: (nome ?? '').trim(),
    matricula: (matricula ?? '').trim() || null,
    funcao: (funcao ?? '').trim() || null,
    status: status || emp.status,
    atualizadoEm: Date.now()
  }

  await db.funcionarios.update(id, updates)
  return { ...emp, ...updates }
}

export async function deleteEmployee(id) {
  const emp = await db.funcionarios.get(id)
  if (!emp) throw new Error('Funcionário não encontrado')

  // Verificar se há movimentações pendentes
  const movs = await db.movimentacoes.where('funcionarioId').equals(id).toArray()
  const pendentes = movs.filter(m => m.status === 'pendente-devolucao')

  if (pendentes.length > 0) {
    throw new Error(`Não é possível excluir. Funcionário possui ${pendentes.length} empréstimo(s) pendente(s).`)
  }

  await db.funcionarios.delete(id)
}
