import { db, ensureSeedData, verifyPassword, verifySecurityAnswer, hashPassword, hashText } from '../data/db.js'
import { addAuditLog } from '../data/audit.js'

const SESSION_KEY = 'cm_session_v1'

export async function initAuth() {
  await ensureSeedData()
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

export async function login({ login, senha }) {
  await ensureSeedData()
  const user = await db.users.where('login').equals(login).first()

  console.log('Tentativa de login:', { login, usuarioEncontrado: !!user, ativo: user?.ativo })

  if (!user || !user.ativo) {
    console.log('Usuário não encontrado ou inativo:', user)
    await addAuditLog({
      usuarioId: null,
      usuarioNome: null,
      acao: 'LOGIN_FALHA',
      detalhes: JSON.stringify({ login, motivo: 'usuario_inexistente_ou_inativo' }),
      tabelaAfetada: 'users',
      registroId: user?.id ?? null
    })
    throw new Error('Usuário ou senha inválidos.')
  }

  console.log('Verificando senha:', { senhaDigitada: senha, hashArmazenado: user.senhaHash })
  const ok = await verifyPassword(senha, user.senhaHash)
  console.log('Senha verificada:', ok)
  
  if (!ok) {
    const tentativas = (user.tentativasLogin ?? 0) + 1
    await db.users.update(user.id, { tentativasLogin: tentativas })

    await addAuditLog({
      usuarioId: user.id,
      usuarioNome: user.nome,
      acao: 'LOGIN_FALHA',
      detalhes: JSON.stringify({ login, motivo: 'senha_incorreta', tentativas }),
      tabelaAfetada: 'users',
      registroId: user.id
    })

    throw new Error('Usuário ou senha inválidos.')
  }

  await db.users.update(user.id, { tentativasLogin: 0, ultimoAcesso: Date.now() })

  const session = {
    usuarioId: user.id,
    usuarioNome: user.nome,
    login: user.login,
    perfil: user.perfil,
    loginEm: Date.now()
  }
  setSession(session)

  await addAuditLog({
    usuarioId: user.id,
    usuarioNome: user.nome,
    acao: 'LOGIN',
    detalhes: JSON.stringify({ login: user.login, perfil: user.perfil }),
    tabelaAfetada: 'users',
    registroId: user.id
  })

  return session
}

export async function logout() {
  const session = getSession()
  clearSession()
  if (session?.usuarioId) {
    await addAuditLog({
      usuarioId: session.usuarioId,
      usuarioNome: session.usuarioNome,
      acao: 'LOGOUT',
      detalhes: null,
      tabelaAfetada: null,
      registroId: null
    })
  }
}

export async function getSecurityQuestion(login) {
  await ensureSeedData()
  const user = await db.users.where('login').equals(login).first()
  if (!user || !user.ativo) return null
  return user.perguntaSeguranca ?? null
}

export async function resetPasswordWithSecurityQuestion({ login, resposta, novaSenha }) {
  await ensureSeedData()
  const user = await db.users.where('login').equals(login).first()
  if (!user || !user.ativo) throw new Error('Usuário não encontrado.')

  const ok = await verifySecurityAnswer(resposta, user.respostaSegurancaHash)
  if (!ok) {
    await addAuditLog({
      usuarioId: user.id,
      usuarioNome: user.nome,
      acao: 'RECUPERACAO_SENHA_FALHA',
      detalhes: JSON.stringify({ login, motivo: 'resposta_incorreta' }),
      tabelaAfetada: 'users',
      registroId: user.id
    })
    throw new Error('Resposta de segurança inválida.')
  }

  await db.users.update(user.id, { senhaHash: await hashPassword(novaSenha) })

  await addAuditLog({
    usuarioId: user.id,
    usuarioNome: user.nome,
    acao: 'RECUPERACAO_SENHA_SUCESSO',
    detalhes: JSON.stringify({ login }),
    tabelaAfetada: 'users',
    registroId: user.id
  })
}

export async function createUser({ nome, login, senha, perfil, perguntaSeguranca, respostaSeguranca }) {
  await ensureSeedData()
  const exists = await db.users.where('login').equals(login).first()
  if (exists) throw new Error('Login já existe.')

  await db.users.add({
    id: crypto.randomUUID(),
    nome,
    login,
    senhaHash: await hashPassword(senha),
    perfil,
    ativo: true,
    perguntaSeguranca,
    respostaSegurancaHash: await hashText(respostaSeguranca),
    ultimoAcesso: null,
    tentativasLogin: 0,
    criadoEm: Date.now()
  })
}
