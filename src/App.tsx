import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { EmConstrucao } from './pages/EmConstrucao'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<EmConstrucao titulo="Agenda" fase="Fase 1" />} />
            <Route path="/clientes" element={<EmConstrucao titulo="Clientes & Pets" fase="Fase 1" />} />
            <Route path="/financeiro" element={<EmConstrucao titulo="Financeiro" fase="Fase 2" />} />
            <Route path="/estoque" element={<EmConstrucao titulo="Estoque" fase="Fase 3" />} />
            <Route path="/relatorios" element={<EmConstrucao titulo="Relatórios" fase="Fase 3" />} />
            <Route path="/configuracoes" element={<EmConstrucao titulo="Configurações" fase="Fase 3" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
