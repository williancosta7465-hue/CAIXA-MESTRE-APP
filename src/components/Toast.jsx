import { useEffect } from 'react'

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose?.(), 2500)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  const cls =
    type === 'error'
      ? 'bg-red-600/90'
      : type === 'success'
        ? 'bg-emerald-600/90'
        : 'bg-white/15'

  return (
    <div className="fixed left-0 right-0 top-4 z-50">
      <div className="mx-auto w-full max-w-md px-4">
        <div className={`rounded-2xl px-4 py-3 text-sm text-white shadow ${cls}`}>{message}</div>
      </div>
    </div>
  )
}
