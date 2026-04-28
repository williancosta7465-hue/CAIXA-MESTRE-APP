import { useEffect, useState } from 'react'
import { db } from '../data/db.js'
import Toast from '../components/Toast.jsx'

function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [toastType, setToastType] = useState('info')
  const [acaoFiltro, setAcaoFiltro] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const all = await db.auditLogs.orderBy('dataHora').reverse().limit(200).toArray()
      setLogs(all)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = logs.filter(l => {
    if (!acaoFiltro.trim()) return true
    return (l.acao || '').toLowerCase().includes(acaoFiltro.toLowerCase())
  })

  async function exportCSV() {
    let csv = 'Data,Hora,Usuário,Ação,Detalhes,Tabela,Registro\n'
    filtered.forEach(l => {
      const d = new Date(l.dataHora)
      csv += `${d.toLocaleDateString('pt-BR')},${d.toLocaleTimeString('pt-BR')},"${l.usuarioNome || '-'}",${l.acao},"${(l.detalhes || '').replace(/"/g, "'")}",${l.tabelaAfetada || '-'},${l.registroId || '-'}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToastType('success')
    setToast('CSV exportado.')
  }

  return (
    <div className="space-y-4">
      <Toast message={toast} type={toastType} onClose={() => setToast(null)} />

      <div className="rounded-2xl cm-card p-4">
        <div className="text-sm font-semibold">Log de Auditoria</div>
        <div className="mt-1 text-xs text-white/70">Últimas 200 ações registradas.</div>
      </div>

      <div className="rounded-2xl cm-card p-4">
        <div className="flex items-center gap-2">
          <input
            value={acaoFiltro}
            onChange={(e) => setAcaoFiltro(e.target.value)}
            className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
            placeholder="Filtrar por ação..."
          />
          <button
            onClick={exportCSV}
            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl cm-card p-4 text-sm text-white/70">Carregando…</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="rounded-2xl cm-card p-4 text-sm text-white/80">Nenhum log.</div>
          ) : (
            filtered.map((l) => (
              <div key={l.id} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{l.acao}</div>
                    <div className="mt-1 text-xs text-white/70">
                      {formatDate(l.dataHora)} • {l.usuarioNome || 'Sistema'}
                    </div>
                    {l.detalhes ? (
                      <div className="mt-1 text-xs text-white/50 truncate">{l.detalhes}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
