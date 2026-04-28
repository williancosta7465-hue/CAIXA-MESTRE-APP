import { db } from './db.js'
import { addAuditLog } from './audit.js'

const BACKUP_SETTINGS_KEY = 'autoBackupSettings'

export async function getBackupSettings() {
  const settings = await db.settings.get(BACKUP_SETTINGS_KEY)
  return settings?.value || {
    enabled: true,
    interval: 'daily',
    lastBackup: null
  }
}

export async function saveBackupSettings(settings) {
  await db.settings.put({
    key: BACKUP_SETTINGS_KEY,
    value: settings
  })
}

export async function createBackup({ usuario }) {
  const now = Date.now()
  const dataHora = new Date().toISOString()

  const backup = {
    id: crypto.randomUUID(),
    dataCriacao: now,
    versaoApp: '1.0.0',
    dataHora: dataHora,
    dados: {}
  }

  // Exportar todas as tabelas
  const tabelas = [
    'users',
    'auditLogs',
    'settings',
    'produtos',
    'funcionarios',
    'movimentacoes',
    'pedidosAtivo',
    'pedidosArquivados',
    'counters'
  ]

  for (const tabela of tabelas) {
    backup.dados[tabela] = await db[tabela].toArray()
  }

  // Salvar backup no banco
  await db.backups.add(backup)

  // Registrar log
  await addAuditLog({
    usuarioId: usuario?.usuarioId ?? null,
    usuarioNome: usuario?.usuarioNome ?? null,
    acao: 'BACKUP_CRIADO',
    detalhes: JSON.stringify({ backupId: backup.id, dataHora }),
    tabelaAfetada: 'backups',
    registroId: backup.id
  })

  return backup
}

export async function downloadBackup(backup) {
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `backup-caixa-mestre-${backup.dataHora.replace(/[:.]/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function listBackups() {
  return db.backups.orderBy('dataCriacao').reverse().toArray()
}

export async function deleteBackup(id) {
  await db.backups.delete(id)
}

export async function restoreBackup(backupData, { usuario }) {
  if (!backupData?.dados) throw new Error('Backup inválido.')

  const now = Date.now()

  // Limpar todas as tabelas antes de restaurar
  const tabelas = Object.keys(backupData.dados)

  await db.transaction('rw', tabelas.map(t => db[t]), async () => {
    for (const tabela of tabelas) {
      if (db[tabela]) {
        await db[tabela].clear()
        if (Array.isArray(backupData.dados[tabela])) {
          await db[tabela].bulkAdd(backupData.dados[tabela])
        }
      }
    }
  })

  // Registrar log
  await addAuditLog({
    usuarioId: usuario?.usuarioId ?? null,
    usuarioNome: usuario?.usuarioNome ?? null,
    acao: 'BACKUP_RESTAURADO',
    detalhes: JSON.stringify({ 
      backupDataHora: backupData.dataHora,
      backupVersao: backupData.versaoApp 
    }),
    tabelaAfetada: 'all',
    registroId: null
  })

  return { ok: true }
}

export async function autoBackupCheck({ usuario }) {
  const settings = await getBackupSettings()

  if (!settings.enabled) return null

  const now = Date.now()
  const lastBackup = settings.lastBackup
  let shouldBackup = false

  if (!lastBackup) {
    shouldBackup = true
  } else {
    const diffMs = now - lastBackup
    const diffHours = diffMs / (1000 * 60 * 60)

    switch (settings.interval) {
      case 'hourly':
        shouldBackup = diffHours >= 1
        break
      case 'daily':
        shouldBackup = diffHours >= 24
        break
      case 'weekly':
        shouldBackup = diffHours >= 168 // 7 dias
        break
      default:
        shouldBackup = diffHours >= 24
    }
  }

  if (shouldBackup) {
    const backup = await createBackup({ usuario })
    settings.lastBackup = now
    await saveBackupSettings(settings)
    return backup
  }

  return null
}
