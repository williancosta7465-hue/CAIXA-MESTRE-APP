import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { db } from '../data/db.js'
import Toast from '../components/Toast.jsx'
import BackButton from '../components/BackButton.jsx'
import { getBackupSettings, saveBackupSettings, createBackup, listBackups, deleteBackup, restoreBackup, getBackupFolderHandle, selectBackupFolder, listFolderBackups, deleteFolderBackup, restoreFolderBackup, downloadBackup } from '../data/backup.js'

export default function SettingsPage() {
  const { session } = useAuth()
  const isAdmin = session?.perfil === 'admin'
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [busy, setBusy] = useState(false)
  const [backupSettings, setBackupSettings] = useState({ enabled: true, interval: 'daily', lastBackup: null })
  const [backups, setBackups] = useState([])
  const [showBackups, setShowBackups] = useState(false)
  const [backupFolder, setBackupFolder] = useState(null)

  useEffect(() => {
    async function loadSettings() {
      const settings = await getBackupSettings()
      setBackupSettings(settings)
      const list = await listBackups()
      setBackups(list)
      const folder = await getBackupFolderHandle()
      setBackupFolder(folder)
    }
    loadSettings()
  }, [])

  async function exportBackup() {
    setBusy(true)
    try {
      const data = {
        exportedAt: Date.now(),
        version: 4,
        produtos: await db.produtos.toArray(),
        funcionarios: await db.funcionarios.toArray(),
        movimentacoes: await db.movimentacoes.toArray(),
        users: await db.users.toArray(),
        auditLogs: await db.auditLogs.toArray(),
        settings: await db.settings.toArray()
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-caixa-mestre-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setToastType('success')
      setToast('Backup exportado.')
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao exportar.')
    } finally {
      setBusy(false)
    }
  }

  async function importBackup(file) {
    setBusy(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.version || !Array.isArray(data.produtos)) {
        throw new Error('Arquivo de backup inválido.')
      }

      await db.transaction('rw', db.produtos, db.funcionarios, db.movimentacoes, db.users, db.auditLogs, db.settings, async () => {
        await db.produtos.clear()
        await db.funcionarios.clear()
        await db.movimentacoes.clear()
        await db.auditLogs.clear()
        await db.settings.clear()

        if (data.produtos?.length) await db.produtos.bulkAdd(data.produtos)
        if (data.funcionarios?.length) await db.funcionarios.bulkAdd(data.funcionarios)
        if (data.movimentacoes?.length) await db.movimentacoes.bulkAdd(data.movimentacoes)
        if (data.auditLogs?.length) await db.auditLogs.bulkAdd(data.auditLogs)
        if (data.settings?.length) await db.settings.bulkAdd(data.settings)
      })

      setToastType('success')
      setToast('Backup restaurado. Recarregue a página.')
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao restaurar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleBackupNow() {
    setBusy(true)
    try {
      const backup = await createBackup({ usuario: session })
      const result = await downloadBackup(backup)
      
      if (result.savedToFolder) {
        setToastType('success')
        setToast(`Backup salvo na pasta: ${result.fileName}`)
      } else {
        setToastType('success')
        setToast('Backup criado e baixado com sucesso.')
      }
      
      const list = await listBackups()
      setBackups(list)
      
      // Se tiver pasta configurada, atualizar lista também
      if (backupFolder) {
        const folderBackups = await listFolderBackups()
        setBackups(folderBackups)
      }
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao criar backup.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteBackup(id) {
    if (!confirm('Tem certeza que deseja excluir este backup?')) return
    setBusy(true)
    try {
      await deleteBackup(id)
      setToastType('success')
      setToast('Backup excluído.')
      const list = await listBackups()
      setBackups(list)
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao excluir.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSelectBackupFolder() {
    setBusy(true)
    try {
      const handle = await selectBackupFolder()
      setBackupFolder(handle)
      setToastType('success')
      setToast('Pasta de backup configurada com sucesso.')
      
      // Carregar backups da pasta
      const folderBackups = await listFolderBackups()
      setBackups(folderBackups)
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao selecionar pasta.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestoreFolderBackup(backup) {
    if (!confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.')) return
    setBusy(true)
    try {
      await restoreFolderBackup(backup, { usuario: session })
      setToastType('success')
      setToast('Backup restaurado. Recarregue a página.')
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao restaurar.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteFolderBackup(backup) {
    if (!confirm('Tem certeza que deseja excluir este backup?')) return
    setBusy(true)
    try {
      await deleteFolderBackup(backup)
      setToastType('success')
      setToast('Backup excluído.')
      const folderBackups = await listFolderBackups()
      setBackups(folderBackups)
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao excluir.')
    } finally {
      setBusy(false)
    }
  }

  async function updateBackupSettings(key, value) {
    const newSettings = { ...backupSettings, [key]: value }
    setBackupSettings(newSettings)
    await saveBackupSettings(newSettings)
    setToastType('success')
    setToast('Configurações salvas.')
  }

  async function clearDatabase() {
    if (!confirm('Tem certeza que deseja limpar TODO o banco de dados? Esta ação não pode ser desfeita!')) return
    setBusy(true)
    try {
      await db.delete()
      setToastType('success')
      setToast('Banco de dados limpo. A página será recarregada.')
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setToastType('error')
      setToast(err?.message || 'Falha ao limpar banco de dados.')
    } finally {
      setBusy(false)
    }
  }

  async function installApp() {
    // Verificar se o prompt de instalação está disponível
    const deferredPrompt = window.deferredPrompt
    
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setToastType('success')
        setToast('App instalado com sucesso!')
      } else {
        setToastType('info')
        setToast('Instalação cancelada.')
      }
      window.deferredPrompt = null
    } else {
      setToastType('info')
      setToast('Para instalar o app, use o menu do navegador (⋮) e selecione "Instalar" ou "Adicionar à tela inicial".')
    }
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <BackButton />

      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Configurações</div>
        <div className="mt-1 text-xs text-white/70">Backup, administração e informações.</div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl cm-card p-4">
          <div className="text-xs font-semibold">Backup e Restauração</div>
          
          {/* Configurações de Backup Automático */}
          <div className="mt-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Backup Automático</div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={backupSettings.enabled}
                  onChange={(e) => updateBackupSettings('enabled', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer-checked:bg-accent-600 peer-checked:after:translate-x-full peer-focus:ring-accent-300 h-5 w-9 rounded-full bg-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all"></div>
              </label>
            </div>
            {backupSettings.enabled && (
              <div className="mt-2">
                <div className="text-xs text-white/60 mb-1">Intervalo</div>
                <select
                  value={backupSettings.interval}
                  onChange={(e) => updateBackupSettings('interval', e.target.value)}
                  className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm"
                >
                  <option value="hourly">A cada hora</option>
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                </select>
                {backupSettings.lastBackup && (
                  <div className="mt-1 text-[10px] text-white/50">
                    Último backup: {new Date(backupSettings.lastBackup).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <button
              disabled={busy}
              onClick={handleBackupNow}
              className="w-full rounded-xl bg-emerald-600/90 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Criando…' : 'Criar backup agora'}
            </button>
            <button
              disabled={busy}
              onClick={handleSelectBackupFolder}
              className="w-full rounded-xl bg-blue-600/90 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Selecionando…' : backupFolder ? '📁 Pasta configurada' : '📁 Selecionar pasta de backup'}
            </button>
            <label className="block w-full rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importBackup(f)
                  e.target.value = ''
                }}
              />
              Restaurar backup (JSON)
            </label>
            <button
              onClick={() => setShowBackups(!showBackups)}
              className="w-full rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold"
            >
              {showBackups ? 'Ocultar backups salvos' : 'Ver backups salvos'}
            </button>
            {showBackups && backups.length > 0 && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {backups.map((backup) => (
                  <div key={backup.id} className="rounded-lg bg-white/5 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{new Date(backup.dataCriacao).toLocaleString('pt-BR')}</div>
                        <div className="text-white/50">
                          v{backup.versaoApp}
                          {backup.isFolderBackup && ' 📁'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {backup.isFolderBackup && (
                          <button
                            onClick={() => handleRestoreFolderBackup(backup)}
                            disabled={busy}
                            className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/30"
                          >
                            Restaurar
                          </button>
                        )}
                        <button
                          onClick={() => backup.isFolderBackup ? handleDeleteFolderBackup(backup) : handleDeleteBackup(backup.id)}
                          disabled={busy}
                          className="rounded-lg bg-red-500/20 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/30"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-white/60">Atenção: restaurar substitui todos os dados atuais.</div>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-2xl cm-card p-4">
          <div className="text-xs font-semibold">Administração</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-white" to="/auditoria">
              Log de Auditoria
            </Link>
            <Link className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-white" to="/usuarios">
              Gerenciar Usuários
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            <button
              disabled={busy}
              onClick={clearDatabase}
              className="w-full rounded-xl bg-red-600/90 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Limpando…' : 'Limpar Banco de Dados'}
            </button>
            <button
              onClick={installApp}
              className="w-full rounded-xl bg-blue-600/90 px-3 py-3 text-sm font-semibold text-white"
            >
              Baixar/Instalar App
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl cm-card p-4">
        <div className="text-xs font-semibold">Sobre</div>
        <div className="mt-2 text-xs text-white/80">Versão: 1.0.0</div>
        <div className="mt-1 text-xs text-white/80">Criado por: WILLIAN COSTA FEITOZA SILVA</div>
        <div className="mt-1 text-xs text-white/80">Telefone: (66) 99931-1927</div>
        <div className="mt-1 text-xs text-white/80">Email: WILLIAN.COSTA7465@GMAIL.COM</div>
      </div>
    </div>
  )
}
