import { useEffect } from 'react'

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose?.(), 5000)
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
    <div className="fixed left-0 right-0 top-16 z-50 md:top-20">
      <div className="mx-auto w-full max-w-md px-4">
        <div className={`rounded-2xl px-4 py-3 text-sm text-white shadow-lg backdrop-blur-sm ${cls}`}>
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 mt-0.5">
              {type === 'error' && <span className="text-base">⚠️</span>}
              {type === 'success' && <span className="text-base">✅</span>}
              {type === 'warning' && <span className="text-base">🔔</span>}
              {type === 'info' && <span className="text-base">ℹ️</span>}
            </div>
            <div className="flex-1 leading-tight">{message}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
