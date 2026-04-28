import { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignaturePad({ onChange }) {
  const ref = useRef(null)
  const [empty, setEmpty] = useState(true)

  function emit() {
    const pad = ref.current
    if (!pad) return
    const isEmpty = pad.isEmpty()
    setEmpty(isEmpty)
    onChange?.(isEmpty ? null : pad.getTrimmedCanvas().toDataURL('image/png'))
  }

  useEffect(() => {
    emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="mb-2 text-xs font-semibold text-white/90">Assinatura</div>
      <div className="overflow-hidden rounded-xl bg-white">
        <SignatureCanvas
          ref={ref}
          penColor="#0b2948"
          canvasProps={{ className: 'h-40 w-full' }}
          onEnd={emit}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-white/70">{empty ? 'Assine no quadro acima.' : 'OK'}</div>
        <button
          type="button"
          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold"
          onClick={() => {
            ref.current?.clear()
            emit()
          }}
        >
          Limpar
        </button>
      </div>
    </div>
  )
}
