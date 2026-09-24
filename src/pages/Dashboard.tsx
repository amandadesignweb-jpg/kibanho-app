import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Chip, TagPill, StatusPill } from '../components/ui/Pill'
import { ReagendarModal } from '../components/ui/ReagendarModal'
import { JustificarModal } from '../components/ui/JustificarModal'
import { formatMoney, todayISO, vencimentoLabel } from '../lib/date'
import { boletoEstado, isLembreteDashboard, ESTADO_LABEL, pagarBoleto, adiarBoleto } from '../lib/boletos'
import type { AgendamentoStatus, Boleto } from '../types/database'

// Capacidade de horários por dia — ajustável depois em Configurações (Fase 3).
// Por ora fixa aqui para calcular "horários livres" e "ocupação".
const CAPACIDADE_DIARIA = 10

interface AgendamentoHoje {
  id: string
  hora: string
  status: AgendamentoStatus
  pagamento_status: 'pago' | 'pendente'
  tipo_servico: 'avulso' | 'pacote'
  valor: number | null
  pet: { nome: string; tutor: { nome: string } | null } | null
}

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [agendamentosHoje, setAgendamentosHoje] = useState<AgendamentoHoje[]>([])
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [estoqueAlerta, setEstoqueAlerta] = useState<
    { id: string; nome: string; status: string; detalhe: string }[]
  >([])
  const [adiandoId, setAdiandoId] = useState<string | null>(null)
  const [novaData, setNovaData] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const hoje = todayISO()

    const [agRes, boletosRes, estoqueRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select(
          'id, hora, status, pagamento_status, tipo_servico, valor, pet:pets(nome, tutor:tutores(nome))'
        )
        .eq('data', hoje)
        .order('hora', { ascending: true }),
      supabase
        .from('boletos')
        .select('*')
        .neq('status', 'pago')
        .order('data_vencimento', { ascending: true }),
      supabase
        .from('estoque_produtos')
        .select('id, nome, status')
        .in('status', ['repor_agora', 'repor_em_breve']),
    ])

    setAgendamentosHoje((agRes.data as unknown as AgendamentoHoje[]) ?? [])
    setBoletos(((boletosRes.data as Boleto[]) ?? []).filter(isLembreteDashboard))
    setEstoqueAlerta(
      ((estoqueRes.data as { id: string; nome: string; status: string }[]) ?? []).map((p) => ({
        ...p,
        detalhe: p.status === 'repor_agora' ? 'Repor agora' : 'Repor em breve',
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const [remarcando, setRemarcando] = useState<{ id: string; nome: string } | null>(null)
  const [justificando, setJustificando] = useState<{ id: string; nome: string } | null>(null)

  async function pagar(id: string) {
    const boleto = boletos.find((b) => b.id === id)
    if (!boleto) return
    await pagarBoleto(boleto)
    load()
  }

  async function marcarCobrancaPaga(agendamentoId: string) {
    await supabase.from('agendamentos').update({ pagamento_status: 'pago' }).eq('id', agendamentoId)
    await supabase.from('financeiro_lancamentos').update({ status_pagamento: 'pago' }).eq('agendamento_id', agendamentoId)
    load()
  }

  async function confirmarAdiamento(id: string) {
    const boleto = boletos.find((b) => b.id === id)
    if (!boleto || !novaData) return
    await adiarBoleto(boleto, novaData)
    setAdiandoId(null)
    setNovaData('')
    load()
  }

  const banhosHoje = agendamentosHoje.length
  const pendencias = agendamentosHoje.filter((a) => a.pagamento_status === 'pendente')
  const valorPendente = pendencias.reduce((s, a) => s + (a.valor ?? 0), 0)
  const ocupacaoPct = Math.min(100, Math.round((banhosHoje / CAPACIDADE_DIARIA) * 100))
  const horariosLivres = Math.max(0, CAPACIDADE_DIARIA - banhosHoje)

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[23px] font-extrabold">Boa tarde, Janaína</div>
          <div className="mt-[2px] text-[12.5px] text-text-muted">
            Aqui está o resumo do seu dia
          </div>
        </div>
        <Link
          to="/agenda/novo"
          className="flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[18px] py-[11px] text-[13px] font-bold text-white"
        >
          + Novo agendamento
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Chip active>Hoje</Chip>
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <>
          <div className="flex gap-[14px]">
            <Card tone="blue" className="relative flex-1 overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-12 h-[150px] w-[150px] rounded-full bg-white/10 blur-sm" />
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">
                Banhos hoje
              </div>
              <div className="mt-[6px] text-[40px] font-black">{banhosHoje}</div>
            </Card>
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">
                Horários livres
              </div>
              <div className="mt-[6px] text-[32px] font-extrabold">{horariosLivres}</div>
            </Card>
            <Card tone="terracota" className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-terracota">
                Pendências
              </div>
              <div className="mt-[6px] text-[28px] font-extrabold text-terracota-dark">
                {formatMoney(valorPendente)}
              </div>
              <TagPill tone="terracota" className="mt-[10px]">
                {pendencias.length} pendente{pendencias.length !== 1 ? 's' : ''}
              </TagPill>
            </Card>
            <Card className="flex flex-1 items-center gap-[14px] p-5">
              <div
                className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#2f5d82 0% ${ocupacaoPct}%, #f0ebe0 ${ocupacaoPct}% 100%)`,
                }}
              >
                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-card text-[13px] font-extrabold">
                  {ocupacaoPct}%
                </div>
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">
                Ocupação
              </div>
            </Card>
          </div>

          <div className="flex gap-[14px]">
            <Card tone="terracota" className="flex-1 p-5">
              <div className="mb-[10px] flex items-center justify-between">
                <div className="text-[13px] font-extrabold">Cobranças pendentes</div>
                <TagPill tone="terracota">{pendencias.length}</TagPill>
              </div>
              {pendencias.length === 0 && (
                <div className="text-[12px] text-text-muted">Nenhuma pendência hoje.</div>
              )}
              {pendencias.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-terracota-border py-[7px] last:border-none">
                  <div>
                    <div className="text-[12.5px] font-bold">
                      {a.pet?.nome} · {a.pet?.tutor?.nome ?? '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-extrabold text-terracota-dark">
                      {formatMoney(a.valor ?? 0)}
                    </div>
                    <button
                      onClick={() => marcarCobrancaPaga(a.id)}
                      className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[10px] py-1 text-[9.5px] font-extrabold text-white"
                    >
                      Pago
                    </button>
                  </div>
                </div>
              ))}
            </Card>

            <Card className="flex-1 p-5">
              <div className="mb-[10px] flex items-center justify-between">
                <div className="text-[13px] font-extrabold">Boletos vencendo</div>
                <TagPill tone="terracota">{boletos.length}</TagPill>
              </div>
              {boletos.length === 0 && (
                <div className="text-[12px] text-text-muted">Nenhum boleto no radar.</div>
              )}
              {boletos.map((b) => {
                const estado = boletoEstado(b)
                return (
                  <div key={b.id} className="border-b border-[#f0ebe0] py-2 last:border-none">
                    <div className="flex items-center justify-between">
                      <div className="text-[12.5px] font-bold">{b.nome}</div>
                      <div className="text-[13px] font-extrabold">{formatMoney(b.valor)}</div>
                    </div>
                    <div
                      className={
                        'mt-[2px] text-[11px] font-bold ' +
                        (estado === 'atrasado' ? 'text-terracota-strong' : 'text-terracota')
                      }
                    >
                      {estado === 'atrasado'
                        ? `Seu boleto ${vencimentoLabel(b.data_vencimento).toLowerCase()}`
                        : `Seu boleto está prestes a vencer · ${ESTADO_LABEL[estado]}`}
                    </div>
                    {adiandoId === b.id ? (
                      <div className="mt-[6px] flex items-center gap-[5px]">
                        <input
                          type="date"
                          value={novaData}
                          onChange={(e) => setNovaData(e.target.value)}
                          autoFocus
                          className="rounded-lg border border-border px-2 py-1 text-[10.5px] outline-none focus:border-blue"
                        />
                        <button
                          onClick={() => confirmarAdiamento(b.id)}
                          disabled={!novaData}
                          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[10px] py-1 text-[9.5px] font-extrabold text-white disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setAdiandoId(null); setNovaData('') }}
                          className="text-[9.5px] font-bold text-text-faint"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-[6px] flex gap-[5px]">
                        <button
                          onClick={() => pagar(b.id)}
                          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[10px] py-1 text-[9.5px] font-extrabold text-white"
                        >
                          Pago
                        </button>
                        <button
                          onClick={() => { setAdiandoId(b.id); setNovaData(b.data_vencimento) }}
                          className="rounded-pill border border-border px-[10px] py-1 text-[9.5px] font-extrabold text-text-soft"
                        >
                          Adiado
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>

            <Card tone="terracota" className="flex-1 p-5">
              <div className="mb-[10px] flex items-center justify-between">
                <div className="text-[13px] font-extrabold">Estoque para repor</div>
                <TagPill tone="terracota">{estoqueAlerta.length}</TagPill>
              </div>
              {estoqueAlerta.length === 0 && (
                <div className="text-[12px] text-text-muted">Estoque em dia.</div>
              )}
              {estoqueAlerta.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-terracota-border py-[7px] last:border-none">
                  <div className="text-[12.5px] font-bold">{p.nome}</div>
                  <TagPill tone="terracota">{p.detalhe}</TagPill>
                </div>
              ))}
            </Card>
          </div>

          <div className="mt-[2px] flex items-center gap-2">
            <div className="text-[13px] font-extrabold">Banhos de hoje</div>
            <TagPill>{banhosHoje} hoje</TagPill>
          </div>

          <div className="flex flex-col gap-[9px]">
            {agendamentosHoje.length === 0 && (
              <div className="text-[13px] text-text-muted">Nenhum agendamento para hoje.</div>
            )}
            {agendamentosHoje.map((a) => (
              <div
                key={a.id}
                className={
                  'flex items-center gap-[14px] rounded-[18px] p-[12px_16px] shadow-rowcard ' +
                  (a.pagamento_status === 'pendente'
                    ? 'border border-terracota-border bg-terracota-tint2'
                    : 'bg-card')
                }
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
                    {a.pagamento_status === 'pendente' && (
                      <TagPill tone="terracota">Pagamento pendente</TagPill>
                    )}
                  </div>
                  <div className="mt-[2px] text-[12px] text-text-muted">{a.hora.slice(0, 5)}</div>
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
                    <StatusPill
                      active={a.status === 'remarcado'}
                      onClick={() => setRemarcando({ id: a.id, nome: a.pet?.nome ?? 'Pet' })}
                    >
                      Remarcado
                    </StatusPill>
                    <StatusPill
                      active={a.status === 'nao_realizado'}
                      onClick={() => setJustificando({ id: a.id, nome: a.pet?.nome ?? 'Pet' })}
                    >
                      Não realizado
                    </StatusPill>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <ReagendarModal
        open={!!remarcando}
        agendamentoId={remarcando?.id ?? null}
        nomePet={remarcando?.nome ?? ''}
        onClose={() => setRemarcando(null)}
        onSaved={() => { setRemarcando(null); load() }}
      />
      <JustificarModal
        open={!!justificando}
        agendamentoId={justificando?.id ?? null}
        nomePet={justificando?.nome ?? ''}
        onClose={() => setJustificando(null)}
        onSaved={() => { setJustificando(null); load() }}
      />
    </div>
  )
}
