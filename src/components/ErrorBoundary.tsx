import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Rede de segurança contra tela em branco: qualquer erro não tratado em
 * tempo de execução (ex.: uma query que falha de um jeito inesperado) cai
 * aqui em vez de derrubar a aplicação inteira silenciosamente.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Erro não tratado na aplicação:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
          <div className="max-w-[420px] rounded-card bg-card p-8 text-center shadow-card">
            <div className="mb-3 text-[15px] font-extrabold text-ink">Algo deu errado</div>
            <div className="mb-5 text-[13px] leading-[1.5] text-text-muted">
              Ocorreu um erro inesperado ao carregar esta tela. Tente recarregar a página; se o
              problema continuar, avise a Amanda.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-6 py-[11px] text-[13px] font-bold text-white"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
