import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('E-mail ou senha incorretos.')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-mid to-blue-deep p-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 rounded-full bg-white/10 blur-md" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-terracota/20 blur-md" />

      <div className="relative flex w-full max-w-[820px] overflow-hidden rounded-[26px] shadow-2xl">
        <div className="hidden w-[340px] shrink-0 flex-col justify-center gap-4 bg-gradient-to-br from-blue-mid to-blue-deep p-10 text-white sm:flex">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-extrabold">
            K
          </div>
          <div>
            <div className="text-xl font-extrabold">Gestão Kibanho</div>
            <div className="mt-1 text-[13px] text-white/70">
              Banho e tosa — gestão completa da operação.
            </div>
          </div>
          <ul className="mt-2 flex flex-col gap-2 text-[13px] text-white/85">
            {['Agenda e atendimentos', 'Financeiro e boletos', 'Estoque e reposição'].map(
              (t) => (
                <li key={t} className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                  {t}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="flex w-full flex-col gap-5 bg-card p-10">
          <div>
            <div className="text-xl font-extrabold text-ink">Bem-vinda de volta</div>
            <div className="mt-1 text-[13px] text-text-muted">
              Entre com seu e-mail e senha de acesso.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
            />
            <input
              type="password"
              required
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
            />
            {error && <div className="text-[12.5px] font-semibold text-terracota-strong">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark py-3 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Entrando…' : 'Entrar'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>

          <div className="text-center text-[11px] text-text-faint">
            Acesso restrito à equipe Kibanho
          </div>
        </div>
      </div>
    </div>
  )
}
