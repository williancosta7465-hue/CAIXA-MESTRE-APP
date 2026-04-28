import { useNavigate } from 'react-router-dom'

export default function BackButton({ to = -1, label = '← Voltar' }) {
  const navigate = useNavigate()
  
  return (
    <button
      onClick={() => navigate(to)}
      className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/20"
    >
      {label}
    </button>
  )
}
