import { useRef, useState, useCallback } from 'react'

export default function PhotoCapture({ onCapture, label = 'Foto' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      if (typeof base64 === 'string') {
        setPreview(base64)
        onCapture?.(base64)
      }
    }
    reader.readAsDataURL(file)
  }, [onCapture])

  const handleClear = () => {
    setPreview(null)
    onCapture?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="mb-2 text-xs font-semibold text-white/90">{label}</div>
      
      {preview ? (
        <div className="relative">
          <img 
            src={preview} 
            alt="Preview" 
            className="h-32 w-full rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 rounded-lg bg-red-500/80 px-2 py-1 text-xs font-semibold text-white"
          >
            ✕
          </button>
        </div>
      ) : (
        <div 
          onClick={() => inputRef.current?.click()}
          className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/30 bg-white/5 hover:bg-white/10"
        >
          <div className="text-2xl">📷</div>
          <div className="mt-1 text-xs text-white/60">Clique para adicionar foto</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
