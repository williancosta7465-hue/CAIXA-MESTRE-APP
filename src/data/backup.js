import { db } from './db.js'
import { addAuditLog } from './audit.js'

const BACKUP_SETTINGS_KEY = 'autoBackupSettings'
const BACKUP_FOLDER_HANDLE_KEY = 'backupFolderHandle'

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

export async function getBackupFolderHandle() {
  const setting = await db.settings.get(BACKUP_FOLDER_HANDLE_KEY)
  return setting?.value || null
}

export async function saveBackupFolderHandle(handle) {
  await db.settings.put({
    key: BACKUP_FOLDER_HANDLE_KEY,
    value: handle
  })
}

export async function selectBackupFolder() {
  if (!window.showDirectoryPicker) {
    throw new Error('Seu navegador não suporta seleção de pasta. Use Chrome ou Edge.')
  }

  try {
    const handle = await window.showDirectoryPicker()
    await saveBackupFolderHandle(handle)
    return handle
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Seleção de pasta cancelada.')
    }
    throw err
  }
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
  const folderHandle = await getBackupFolderHandle()
  
  if (folderHandle) {
    // Salvar na pasta selecionada
    try {
      const fileName = `backup-caixa-mestre-${backup.dataHora.replace(/[:.]/g, '-')}.json`
      const fileHandle = await folderHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      const json = JSON.stringify(backup, null, 2)
      await writable.write(json)
      await writable.close()
      return { savedToFolder: true, fileName }
    } catch (err) {
      console.error('Erro ao salvar na pasta:', err)
      // Fallback para download normal
    }
  }
  
  // Fallback: download normal
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
  return { savedToFolder: false }
}

export async function listBackups() {
  return db.backups.orderBy('dataCriacao').reverse().toArray()
}

export async function listFolderBackups() {
  const folderHandle = await getBackupFolderHandle()
  if (!folderHandle) return []

  try {
    const backups = []
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith('backup-caixa-mestre-') && entry.name.endsWith('.json')) {
        const file = await entry.getFile()
        const text = await file.text()
        try {
          const data = JSON.parse(text)
          if (data.id && data.dataCriacao) {
            backups.push({
              id: data.id,
              dataCriacao: data.dataCriacao,
              dataHora: data.dataHora,
              versaoApp: data.versaoApp,
              fileName: entry.name,
              fileHandle: entry,
              isFolderBackup: true
            })
          }
        } catch (err) {
          console.error('Erro ao ler arquivo de backup:', entry.name, err)
        }
      }
    }
    return backups.sort((a, b) => b.dataCriacao - a.dataCriacao)
  } catch (err) {
    console.error('Erro ao listar backups da pasta:', err)
    return []
  }
}

export async function deleteBackup(id) {
  await db.backups.delete(id)
}

export async function deleteFolderBackup(backup) {
  if (!backup.fileHandle) return
  try {
    await backup.fileHandle.remove()
  } catch (err) {
    console.error('Erro ao deletar backup da pasta:', err)
    throw err
  }
}

export async function restoreFolderBackup(backup, { usuario }) {
  if (!backup.fileHandle) {
    throw new Error('Backup inválido: sem file handle.')
  }

  try {
    const file = await backup.fileHandle.getFile()
    const text = await file.text()
    const backupData = JSON.parse(text)
    
    return await restoreBackup(backupData, { usuario })
  } catch (err) {
    console.error('Erro ao restaurar backup da pasta:', err)
    throw err
  }
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
