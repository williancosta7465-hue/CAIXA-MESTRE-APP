import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { db } from '../data/db.js'
import { useAuth } from '../auth/AuthProvider.jsx'

export default function Shell() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [alertasEstoque, setAlertasEstoque] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    async function checkAlertas() {
      const produtos = await db.produtos.toArray()
      const alertas = produtos.filter(p => p.quantidade < p.estoqueMinimo && p.estoqueMinimo > 0)
      setAlertasEstoque(alertas.length)
    }
    checkAlertas()
    const interval = setInterval(checkAlertas, 30000) // Verifica a cada 30s
    return () => clearInterval(interval)
  }, [])

  const isEstoque = location.pathname === '/estoque' || location.pathname === '/funcionarios'
  const isMais = ['/pedidos', '/relatorios', '/config', '/auditoria', '/usuarios'].some(p => location.pathname.startsWith(p))

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      {/* Fundo fixo - nunca muda/pisca */}
      <div className="fixed inset-0 z-0 cm-bg" />
      <div className="fixed inset-0 z-0 cm-bg-overlay" />
      
      {/* Conteúdo scrollable - tela cheia no celular */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-lg flex-col">
        <header className="shrink-0 px-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl bg-white/10">
              <img src="/caixa-mestre-pwa/caixa-mestre-logo.png" alt="CAIXA MESTRE" className="h-full w-full object-contain" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold tracking-wide">CAIXA MESTRE</div>
              <div className="text-xs text-white/70">Gestão de Estoque</div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6">
          <Outlet />
        </main>

        {/* Menu expansível "Mais" */}
        {menuAberto && (
          <div 
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/50"
            onClick={() => setMenuAberto(false)}
          >
            <div 
              className="mb-16 w-full max-w-lg px-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="rounded-xl bg-brand-900 p-2 shadow-xl">
                <div className="grid grid-cols-2 gap-1">
                  <NavLink to="/pedidos" onClick={() => setMenuAberto(false)} className="flex flex-col items-center justify-center rounded-lg bg-white/10 p-2 text-center text-[10px]">
                    <span className="mb-1 text-lg">📋</span>
                    <span>Pedidos</span>
                  </NavLink>
                  <NavLink to="/relatorios" onClick={() => setMenuAberto(false)} className="flex flex-col items-center justify-center rounded-lg bg-white/10 p-2 text-center text-[10px]">
                    <span className="mb-1 text-lg">📊</span>
                    <span>Relatórios</span>
                  </NavLink>
                  <NavLink to="/config" onClick={() => setMenuAberto(false)} className="flex flex-col items-center justify-center rounded-lg bg-white/10 p-2 text-center text-[10px]">
                    <span className="mb-1 text-lg">⚙️</span>
                    <span>Config</span>
                  </NavLink>
                </div>
                <button 
                  onClick={() => {
                    setMenuAberto(false)
                    logout()
                    navigate('/login')
                  }}
                  className="mt-2 w-full rounded-lg bg-red-500/20 py-2 text-[10px] text-red-300 font-semibold"
                >
                  🚪 Sair do App
                </button>
                <button 
                  onClick={() => setMenuAberto(false)}
                  className="mt-1 w-full rounded-lg bg-white/5 py-1.5 text-[10px] text-white/70"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-brand-900/95 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-5 px-1 py-2 text-xs">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-xl px-1 py-2 ${isActive ? 'bg-white/10 text-white' : 'text-white/70'}`
              }
            >
              <span className="text-lg">🏠</span>
              <span>Início</span>
            </NavLink>
            <NavLink
              to="/entrega"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-xl px-1 py-2 ${isActive ? 'bg-white/10 text-white' : 'text-white/70'}`
              }
            >
              <span className="text-lg">📦</span>
              <span>Entrega</span>
            </NavLink>
            <NavLink
              to="/estoque"
              className={() =>
                `relative flex flex-col items-center justify-center rounded-xl px-1 py-2 ${isEstoque ? 'bg-white/10 text-white' : 'text-white/70'}`
              }
            >
              <span className="text-lg">📦</span>
              <span>Estoque</span>
              {alertasEstoque > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold">
                  {alertasEstoque > 9 ? '9+' : alertasEstoque}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/pendentes"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-xl px-1 py-2 ${isActive ? 'bg-white/10 text-white' : 'text-white/70'}`
              }
            >
              <span className="text-lg">⏰</span>
              <span>Pendentes</span>
            </NavLink>
            <button
              onClick={() => setMenuAberto(true)}
              className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 ${isMais ? 'bg-white/10 text-white' : 'text-white/70'}`}
            >
              <span className="text-lg">⋮⋮⋮</span>
              <span>Mais</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
