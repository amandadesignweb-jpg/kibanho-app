import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './ui/Sidebar'
import { useAuth } from '../lib/AuthContext'

export function Layout() {
  const { session, loading } = useAuth()
  const [menuAberto, setMenuAberto] = useState(false)

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-text-muted">Carregando…</div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <div className="no-print flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <button
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-blue to-blue-dark text-[12px] font-extrabold text-white">
          K
        </div>
        <div className="text-[14px] font-extrabold">Gestão Kibanho</div>
      </div>

      <Sidebar mobileOpen={menuAberto} onCloseMobile={() => setMenuAberto(false)} />

      <div className="flex-1 overflow-x-hidden px-4 py-4 md:px-8 md:py-6">
        <Outlet />
      </div>
    </div>
  )
}
