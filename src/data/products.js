import { db } from './db.js'

export const PRODUCT_TYPES = {
  ferramenta: 'ferramenta',
  material: 'material',
  epi: 'epi'
}

export function getProductTypeLabel(tipo) {
  switch (tipo) {
    case PRODUCT_TYPES.ferramenta:
      return 'Ferramenta'
    case PRODUCT_TYPES.material:
      return 'Material'
    case PRODUCT_TYPES.epi:
      return 'EPI'
    default:
      return '—'
  }
}

export function getProductSubLabel(p) {
  if (p?.tipo !== PRODUCT_TYPES.epi) return null
  return p.reutilizavel ? 'Reutilizável' : 'Descartável'
}

export async function listProducts({ q = '', tipo = 'todos', status = 'todos' } = {}) {
  const query = q.trim().toLowerCase()
  const all = await db.produtos.toArray()

  return all
    .filter((p) => {
      if (tipo !== 'todos' && p.tipo !== tipo) return false
      if (status !== 'todos' && p.status !== status) return false
      if (!query) return true
      return (
        (p.nome ?? '').toLowerCase().includes(query) ||
        (p.codigo ?? '').toLowerCase().includes(query)
      )
    })
    .sort((a, b) => (a.nome ?? '').toLowerCase().localeCompare((b.nome ?? '').toLowerCase()))
}

export async function createProduct(payload) {
  const now = Date.now()
  const product = {
    id: crypto.randomUUID(),
    tipo: payload.tipo,
    reutilizavel: payload.tipo === PRODUCT_TYPES.epi ? Boolean(payload.reutilizavel) : null,
    nome: (payload.nome ?? '').trim(),
    codigo: (payload.codigo ?? '').trim() || null,
    descricao: (payload.descricao ?? '').trim() || null,
    unidade: payload.unidade ?? 'unidade',
    quantidade: Number(payload.quantidade ?? 0),
    estoqueMinimo: Number(payload.estoqueMinimo ?? 0),
    ca: payload.ca ? String(payload.ca).trim() : null,
    foto: payload.foto || null,
    status: 'ativo',
    criadoEm: now,
    atualizadoEm: now
  }

  await db.produtos.add(product)
  return product
}

export async function updateProduct(id, patch) {
  const produto = await db.produtos.get(id)
  if (!produto) throw new Error('Produto não encontrado.')

  const updates = {
    nome: patch.nome !== undefined ? (patch.nome ?? '').trim() : produto.nome,
    codigo: patch.codigo !== undefined ? ((patch.codigo ?? '').trim() || null) : produto.codigo,
    descricao: patch.descricao !== undefined ? ((patch.descricao ?? '').trim() || null) : produto.descricao,
    unidade: patch.unidade ?? produto.unidade,
    quantidade: patch.quantidade !== undefined ? Number(patch.quantidade ?? 0) : produto.quantidade,
    estoqueMinimo: patch.estoqueMinimo !== undefined ? Number(patch.estoqueMinimo ?? 0) : produto.estoqueMinimo,
    ca: patch.ca !== undefined ? (patch.ca ? String(patch.ca).trim() : null) : produto.ca,
    dataValidade: patch.dataValidade !== undefined ? (patch.dataValidade ? String(patch.dataValidade).trim() : null) : produto.dataValidade,
    foto: patch.foto !== undefined ? (patch.foto || null) : produto.foto,
    atualizadoEm: Date.now()
  }

  await db.produtos.update(id, updates)
  return { ...produto, ...updates }
}

export async function getProduct(id) {
  return db.produtos.get(id)
}

export async function deleteProduct(id) {
  await db.produtos.delete(id)
}
