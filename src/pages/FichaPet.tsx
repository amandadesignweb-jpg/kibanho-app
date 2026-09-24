import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { TagPill } from '../components/ui/Pill'
import { formatBR, formatMoney, todayISO } from '../lib/date'
import { FORMA_PAGAMENTO_LABEL } from '../lib/pagamento'
import { TIPO_PROCEDIMENTO_LABEL } from '../lib/procedimentos'
import type { FormaPagamento, TipoProcedimento } from '../types/database'

interface PetDetalhe {
  id: string
  nome: string
  especie: string
  raca: string | null
  observacoes: string | null
  foto_url: string | null
  tutor: { id: string; nome: string; telefone: string | null } | null
}

interface PacoteAtual {
  id: string
  banhos_usados_ciclo: number
  tipo_pacote: { nome: string; banhos_por_ciclo: number } | null
}

interface HistoricoItem {
  id: string
  data: string
  anotacao_tutor: string | null
  fotos: string[]
}

interface ProximoAgendamento {
  id: string
  data: string
  hora: string
  tipo_servico: 'avulso' | 'pacote'
  tipo_procedimento: TipoProcedimento
}

interface PagamentoItem {
  id: string
  data: string
  status: 'confirmado' | 'realizado' | 'remarcado' | 'nao_realizado' | 'cancelado'
  pagamento_status: 'pago' | 'pendente'
  forma_pagamento: FormaPagamento | null
  valor: number | null
}

export function FichaPet() {
  const { id } = useParams<{ id: string }>()
  const [pet, setPet] = useState<PetDetalhe | null>(null)
  const [pacote, setPacote] = useState<PacoteAtual | null>(null)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [proximos, setProximos] = useState<ProximoAgendamento[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([])
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const hoje = todayISO()
      const [petRes, pacoteRes, histRes, proximosRes, pagamentosRes] = await Promise.all([
        supabase.from('pets').select('id, nome, especie, raca, observacoes, foto_url, tutor:tutores(id, nome, telefone)').eq('id', id).single(),
        supabase
          .from('pacotes_pet')
          .select('id, banhos_usados_ciclo, tipo_pacote:tipos_pacote(nome, banhos_por_ciclo)')
          .eq('pet_id', id)
          .eq('status', 'ativo')
          .maybeSingle(),
        supabase
          .from('procedimentos')
          .select('id, data, anotacao_tutor, fotos')
          .eq('pet_id', id)
          .order('data', { ascending: false }),
        supabase
          .from('agendamentos')
          .select('id, data, hora, tipo_servico, tipo_procedimento')
          .eq('pet_id', id)
          .gte('data', hoje)
          .in('status', ['confirmado', 'remarcado'])
          .order('data', { ascending: true })
          .order('hora', { ascending: true }),
        supabase
          .from('agendamentos')
          .select('id, data, status, pagamento_status, forma_pagamento, valor')
          .eq('pet_id', id)
          .order('data', { ascending: false }),
      ])
      setPet(petRes.data as unknown as PetDetalhe)
      setPacote(pacoteRes.data as unknown as PacoteAtual)
      setHistorico((histRes.data as unknown as HistoricoItem[]) ?? [])
      setProximos((proximosRes.data as unknown as ProximoAgendamento[]) ?? [])
      setPagamentos((pagamentosRes.data as unknown as PagamentoItem[]) ?? [])
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="text-text-muted">Carregando…</div>
  if (!pet) return <div className="text-text-muted">Pet não encontrado.</div>

  const progresso = pacote
    ? Math.min(100, Math.round((pacote.banhos_usados_ciclo / (pacote.tipo_pacote?.banhos_por_ciclo ?? 1)) * 100))
    : 0

  return (
    <div className="relative flex flex-col gap-[18px]">
      <Card className="flex items-center gap-4 p-5">
        {pet.foto_url ? (
          <img src={pet.foto_url} alt={pet.nome} className="h-[64px] w-[64px] shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-blue-tint text-[10px] font-bold text-blue">
            IMG
          </div>
        )}
        <div className="flex-1">
          <div className="text-[18px] font-extrabold">{pet.nome}</div>
          <div className="text-[12.5px] text-text-muted">
            {pet.especie}
            {pet.raca ? ` · ${pet.raca}` : ''}
          </div>
          {pet.observacoes && (
            <div className="mt-1 rounded-lg bg-[#f7f4ee] px-2 py-1 text-[11.5px] text-text-soft">{pet.observacoes}</div>
          )}
          <div className="mt-2 text-[12px] text-text-muted">
            Tutor: <span className="font-bold text-ink">{pet.tutor?.nome ?? '—'}</span>
            {pet.tutor?.telefone ? ` · ${pet.tutor.telefone}` : ''}
          </div>
        </div>
      </Card>

      {pacote && (
        <Card tone="terracota" className="p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-terracota">Pacote atual</div>
          <div className="mt-1 text-[15px] font-extrabold">
            {pacote.tipo_pacote?.nome} · {pacote.tipo_pacote?.banhos_por_ciclo} banhos/ciclo
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-terracota-border">
            <div className="h-full rounded-full bg-terracota" style={{ width: `${progresso}%` }} />
          </div>
          <div className="mt-2 text-[11.5px] text-terracota-dark">
            {pacote.banhos_usados_ciclo}/{pacote.tipo_pacote?.banhos_por_ciclo} usados neste ciclo
          </div>
        </Card>
      )}

      <div>
        <div className="mb-2 text-[13px] font-extrabold">Próximos banhos</div>
        {proximos.length === 0 ? (
          <div className="text-[12.5px] text-text-muted">Nenhum atendimento futuro agendado.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {proximos.map((p) => (
              <Card key={p.id} className="flex items-center gap-3 p-3">
                <div className="rounded-pill bg-blue-tint px-[9px] py-[3px] text-[11px] font-bold text-blue-dark">
                  {formatBR(p.data)} · {p.hora.slice(0, 5)}
                </div>
                <div className="text-[12px] text-text-soft">{TIPO_PROCEDIMENTO_LABEL[p.tipo_procedimento]}</div>
                <TagPill tone={p.tipo_servico === 'pacote' ? 'blue' : 'neutral'} className="ml-auto">
                  {p.tipo_servico === 'pacote' ? 'Pacote' : 'Avulso'}
                </TagPill>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[13px] font-extrabold">Histórico de pagamento</div>
        {pagamentos.length === 0 ? (
          <div className="text-[12.5px] text-text-muted">Nenhum pagamento registrado ainda.</div>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {pagamentos.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-[#f7f4ee] px-3 py-2">
                <div className="text-[11.5px] text-text-soft">
                  {formatBR(p.data)}
                  {p.forma_pagamento ? ` · ${FORMA_PAGAMENTO_LABEL[p.forma_pagamento]}` : ''}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[12.5px] font-extrabold">{formatMoney(p.valor ?? 0)}</div>
                  <TagPill tone={p.pagamento_status === 'pago' ? 'blue' : 'terracota'}>
                    {p.pagamento_status === 'pago' ? 'Pago' : 'Pendente'}
                  </TagPill>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[13px] font-extrabold">Histórico de atendimentos</div>
        <div className="flex flex-col gap-3">
          {historico.length === 0 && <div className="text-[13px] text-text-muted">Nenhum atendimento registrado ainda.</div>}
          {historico.map((h) => {
            const aberto = expandidoId === h.id
            return (
              <Card key={h.id} className="overflow-hidden p-0">
                <button
                  onClick={() => setExpandidoId(aberto ? null : h.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="rounded-pill bg-[#f2ede3] px-[9px] py-[2px] text-[10px] font-bold text-text-muted">
                    {formatBR(h.data)}
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-tint text-[8px] font-bold text-blue">
                    {h.fotos.length > 0 ? `${h.fotos.length} foto${h.fotos.length > 1 ? 's' : ''}` : '—'}
                  </div>
                  <div className="flex-1 text-[12.5px] text-text-soft">{h.anotacao_tutor ?? 'Sem anotação.'}</div>
                  <div className={`text-text-faint transition-transform ${aberto ? 'rotate-180' : ''}`}>▾</div>
                </button>
                {aberto && (
                  <div className="flex flex-col gap-3 border-t border-border-faint p-4">
                    {h.fotos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {h.fotos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[12px] text-text-muted">Sem fotos neste atendimento.</div>
                    )}
                    <div className="text-[12.5px] text-text-soft">{h.anotacao_tutor ?? 'Sem anotação para o tutor.'}</div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      <Link
        to={`/agenda/novo?pet=${pet.id}`}
        className="fixed bottom-8 right-8 flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-5 py-[13px] text-[13px] font-bold text-white shadow-lg"
      >
        + Novo agendamento
      </Link>
    </div>
  )
}
