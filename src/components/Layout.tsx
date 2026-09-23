import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './ui/Sidebar'
import { useAuth } from '../lib/AuthContext'

export function Layout() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-text-muted">Carregando…</div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden px-8 py-6">
        <Outlet />
      </div>
    </div>
  )
}
