import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Chip, TagPill, StatusPill } from '../components/ui/Pill'
import { ReagendarModal } from '../components/ui/ReagendarModal'
import { JustificarModal } from '../components/ui/JustificarModal'
import clsx from '../lib/clsx'
import type { AgendamentoStatus } from '../types/database'

interface AgendamentoLinha {
  id: string
  hora: string
  status: AgendamentoStatus
  pagamento_status: 'pago' | 'pendente'
  tipo_servico: 'avulso' | 'pacote'
  pet: { nome: string; tutor: { nome: string } | null } | null
}

function startOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = domingo
  const out = new Date(d)
  out.setDate(d.getDate() - day)
  out.setHours(0, 0, 0, 0)
  return out
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function Agenda() {
  const [refDate, setRefDate] = useState(new Date())
  const [selected, setSelected] = useState(toISO(new Date()))
  const [agendamentos, setAgendamentos] = useState<AgendamentoLinha[]>([])
  const [contagemSemana, setContagemSemana] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const semana = useMemo(() => {
    const start = startOfWeek(refDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [refDate])

  const loadDia = useCallback(async (dataISO: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('agendamentos')
      .select('id, hora, status, pagamento_status, tipo_servico, pet:pets(nome, tutor:tutores(nome))')
      .eq('data', dataISO)
      .order('hora', { ascending: true })
    setAgendamentos((data as unknown as AgendamentoLinha[]) ?? [])
    setLoading(false)
  }, [])

  const loadSemana = useCallback(async (dias: Date[]) => {
    const ini = toISO(dias[0])
    const fim = toISO(dias[6])
    const { data } = await supabase
      .from('agendamentos')
      .select('data')
      .gte('data', ini)
      .lte('data', fim)
    const contagem: Record<string, number> = {}
    for (const row of (data as { data: string }[] | null) ?? []) {
      contagem[row.data] = (contagem[row.data] ?? 0) + 1
    }
    setContagemSemana(contagem)
  }, [])

  useEffect(() => {
    loadDia(selected)
  }, [selected, loadDia])

  useEffect(() => {
    loadSemana(semana)
  }, [semana, loadSemana])

  const [remarcando, setRemarcando] = useState<{ id: string; nome: string } | null>(null)
  const [justificando, setJustificando] = useState<{ id: string; nome: string } | null>(null)

  const hojeISO = toISO(new Date())

  const agendamentosOrdenados = [...agendamentos].sort((a, b) => {
    const aFeito = a.status === 'realizado' ? 1 : 0
    const bFeito = b.status === 'realizado' ? 1 : 0
    if (aFeito !== bFeito) return aFeito - bFeito
    return a.hora.localeCompare(b.hora)
  })

  return (
    <div className="flex h-auto flex-col gap-3 md:h-[calc(100vh-48px)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[19px] font-extrabold">Agenda</div>
          <div className="mt-[2px] text-[12px] text-text-muted">
            {refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip active>Semana</Chip>
          <Link
            to="/agenda/novo"
            className="flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[14px] py-[10px] text-[13px] font-bold text-white sm:px-[18px]"
          >
            <span className="sm:hidden">+ Agendar</span>
            <span className="hidden sm:inline">+ Novo agendamento</span>
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setRefDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          ‹
        </button>
        <div className="flex flex-1 gap-2 overflow-x-auto sm:overflow-visible">
          {semana.map((d) => {
            const iso = toISO(d)
            const isSelected = iso === selected
            const isHoje = iso === hojeISO
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={clsx(
                  'w-[42px] shrink-0 rounded-xl py-[7px] text-center sm:w-auto sm:flex-1',
                  isSelected
                    ? 'bg-gradient-to-br from-blue to-blue-dark text-white'
                    : isHoje
                      ? 'bg-terracota-tint2 border border-terracota-border'
                      : 'bg-card'
                )}
              >
                <div className={clsx('text-[8.5px] font-bold', isSelected ? 'text-white/75' : 'text-text-faint')}>
                  {DIAS[d.getDay()]}
                </div>
                <div className="mt-[1px] text-[12px] font-extrabold">{d.getDate()}</div>
                <div className={clsx('mt-[1px] text-[8.5px]', isSelected ? 'text-white/75' : 'text-text-faint')}>
                  {contagemSemana[iso] ?? 0} banho{(contagemSemana[iso] ?? 0) !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setRefDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          ›
        </button>
      </div>

      <div className="shrink-0 text-[10.5px] text-text-faint">próximos primeiro, realizados por último</div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:h-auto">
          {agendamentosOrdenados.length === 0 && (
            <div className="text-[13px] text-text-muted">Nenhum agendamento neste dia.</div>
          )}
          {agendamentosOrdenados.map((a) => (
            <div
              key={a.id}
              className={clsx(
                'flex flex-wrap items-center gap-3 rounded-2xl p-[9px_13px] shadow-rowcard',
                a.pagamento_status === 'pendente' ? 'border border-terracota-border bg-terracota-tint2' : 'bg-card'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-tint text-[8px] font-bold text-blue">
                IMG
              </div>
              <div className="min-w-0 flex-grow">
                <div className="flex items-center gap-2">
                  <div className="text-[13px] font-bold">{a.pet?.nome}</div>
                  <TagPill tone={a.tipo_servico === 'pacote' ? 'blue' : 'neutral'}>
                    {a.tipo_servico === 'pacote' ? 'Pacote' : 'Avulso'}
                  </TagPill>
                </div>
                <div className="mt-[1px] text-[11.5px] text-text-muted">
                  {a.hora.slice(0, 5)} · {a.pet?.tutor?.nome ?? '—'}
                </div>
              </div>
              {a.status === 'realizado' ? (
                <TagPill tone="blue">Realizado</TagPill>
              ) : (
                <div className="flex flex-wrap gap-[6px]">
                  <Link
                    to={`/agenda/${a.id}/registrar`}
                    className="inline-flex items-center gap-[5px] rounded-pill border border-transparent bg-gradient-to-br from-blue to-blue-dark px-3 py-[6px] text-[11px] font-bold text-white"
                  >
                    Realizado
                  </Link>
                  <StatusPill active={a.status === 'remarcado'} onClick={() => setRemarcando({ id: a.id, nome: a.pet?.nome ?? 'Pet' })}>
                    Remarcado
                  </StatusPill>
                  <StatusPill active={a.status === 'nao_realizado'} onClick={() => setJustificando({ id: a.id, nome: a.pet?.nome ?? 'Pet' })}>
                    Não realizado
                  </StatusPill>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ReagendarModal
        open={!!remarcando}
        agendamentoId={remarcando?.id ?? null}
        nomePet={remarcando?.nome ?? ''}
        onClose={() => setRemarcando(null)}
        onSaved={() => { setRemarcando(null); loadDia(selected); loadSemana(semana) }}
      />
      <JustificarModal
        open={!!justificando}
        agendamentoId={justificando?.id ?? null}
        nomePet={justificando?.nome ?? ''}
        onClose={() => setJustificando(null)}
        onSaved={() => { setJustificando(null); loadDia(selected) }}
      />
    </div>
  )
}
