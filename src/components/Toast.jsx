import { useEffect } from 'react'

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose?.(), 4000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  const cls =
    type === 'error'
      ? 'bg-red-600/95'
      : type === 'success'
        ? 'bg-emerald-600/95'
        : type === 'warning'
          ? 'bg-amber-600/95'
          : 'bg-blue-600/95'

  return (
    <div className="fixed left-0 right-0 top-20 z-50">
      <div className="mx-auto w-full max-w-md px-4">
        <div className={`rounded-2xl px-6 py-4 text-sm text-white shadow-lg backdrop-blur-sm ${cls}`}>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {type === 'error' && <span className="text-lg">⚠️</span>}
              {type === 'success' && <span className="text-lg">✅</span>}
              {type === 'warning' && <span className="text-lg">🔔</span>}
              {type === 'info' && <span className="text-lg">ℹ️</span>}
            </div>
            <div className="flex-1">{message}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
