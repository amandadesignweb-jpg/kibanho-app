import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Chip, TagPill, StatusPill } from '../components/ui/Pill'
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

  async function marcar(id: string, status: AgendamentoStatus) {
    await supabase.from('agendamentos').update({ status }).eq('id', id)
    loadDia(selected)
  }

  const hojeISO = toISO(new Date())

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[23px] font-extrabold">Agenda</div>
          <div className="mt-[2px] text-[12.5px] text-text-muted">
            {refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip active>Semana</Chip>
          <Link
            to="/agenda/novo"
            className="flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[18px] py-[11px] text-[13px] font-bold text-white"
          >
            + Novo agendamento
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setRefDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-card"
        >
          ‹
        </button>
        <div className="flex flex-1 gap-2">
          {semana.map((d) => {
            const iso = toISO(d)
            const isSelected = iso === selected
            const isHoje = iso === hojeISO
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={clsx(
                  'flex-1 rounded-xl py-[9px] text-center',
                  isSelected
                    ? 'bg-gradient-to-br from-blue to-blue-dark text-white'
                    : isHoje
                      ? 'bg-terracota-tint2 border border-terracota-border'
                      : 'bg-card'
                )}
              >
                <div className={clsx('text-[9px] font-bold', isSelected ? 'text-white/75' : 'text-text-faint')}>
                  {DIAS[d.getDay()]}
                </div>
                <div className="mt-[2px] text-[13px] font-extrabold">{d.getDate()}</div>
                <div className={clsx('mt-[2px] text-[9px]', isSelected ? 'text-white/75' : 'text-text-faint')}>
                  {contagemSemana[iso] ?? 0} banho{(contagemSemana[iso] ?? 0) !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setRefDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-card"
        >
          ›
        </button>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {agendamentos.length === 0 && (
            <div className="text-[13px] text-text-muted">Nenhum agendamento neste dia.</div>
          )}
          {agendamentos.map((a) => (
            <div
              key={a.id}
              className={clsx(
                'flex items-center gap-[14px] rounded-[18px] p-[12px_16px] shadow-rowcard',
                a.pagamento_status === 'pendente' ? 'border border-terracota-border bg-terracota-tint2' : 'bg-card'
              )}
            >
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-blue-tint text-[9px] font-bold text-blue">
                IMG
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-bold">{a.pet?.nome}</div>
                  <TagPill tone={a.tipo_servico === 'pacote' ? 'blue' : 'neutral'}>
                    {a.tipo_servico === 'pacote' ? 'Pacote' : 'Avulso'}
                  </TagPill>
                </div>
                <div className="mt-[2px] text-[12px] text-text-muted">
                  {a.hora.slice(0, 5)} · {a.pet?.tutor?.nome ?? '—'}
                </div>
              </div>
              {a.status === 'realizado' ? (
                <TagPill tone="blue">Realizado</TagPill>
              ) : (
                <div className="flex gap-[6px]">
                  <Link
                    to={`/agenda/${a.id}/registrar`}
                    className="inline-flex items-center gap-[5px] rounded-pill border border-transparent bg-gradient-to-br from-blue to-blue-dark px-3 py-[7px] text-[11px] font-bold text-white"
                  >
                    Realizado
                  </Link>
                  <StatusPill active={a.status === 'remarcado'} onClick={() => marcar(a.id, 'remarcado')}>
                    Remarcado
                  </StatusPill>
                  <StatusPill active={a.status === 'nao_realizado'} onClick={() => marcar(a.id, 'nao_realizado')}>
                    Não realizado
                  </StatusPill>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
