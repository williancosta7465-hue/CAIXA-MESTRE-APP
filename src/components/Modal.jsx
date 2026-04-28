export default function Modal({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl bg-brand-900 p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{title}</div>
          <button className="rounded-xl bg-white/10 px-3 py-2 text-xs" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
