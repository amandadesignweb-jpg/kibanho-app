import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Agenda } from './pages/Agenda'
import { NovoAgendamento } from './pages/NovoAgendamento'
import { RegistroProcedimento } from './pages/RegistroProcedimento'
import { Clientes } from './pages/Clientes'
import { FichaPet } from './pages/FichaPet'
import { Financeiro } from './pages/Financeiro'
import { Estoque } from './pages/Estoque'
import { Relatorios } from './pages/Relatorios'
import { Configuracoes } from './pages/Configuracoes'

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/agenda/novo" element={<NovoAgendamento />} />
            <Route path="/agenda/:agendamentoId/registrar" element={<RegistroProcedimento />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<FichaPet />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
