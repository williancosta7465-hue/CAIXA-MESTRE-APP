export const PERFIS = {
  admin: 'admin',
  almoxarife: 'almoxarife',
  visualizador: 'visualizador'
}

export function canManageUsers(perfil) {
  return perfil === PERFIS.admin
}

export function canAccessSettings(perfil) {
  return perfil === PERFIS.admin
}

export function canMoveStock(perfil) {
  return perfil === PERFIS.admin || perfil === PERFIS.almoxarife
}

export function canEditCatalog(perfil) {
  return perfil === PERFIS.admin || perfil === PERFIS.almoxarife
}

export function canViewCatalog(perfil) {
  return canViewReports(perfil)
}

export function canViewReports(perfil) {
  return perfil === PERFIS.admin || perfil === PERFIS.almoxarife || perfil === PERFIS.visualizador
}
