import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Chip, TagPill } from '../components/ui/Pill'
import { formatBR, formatMoney, lastNDays, monthRange, todayISO, vencimentoLabel } from '../lib/date'
import { boletoEstado, ESTADO_LABEL, ESTADO_CLASSES } from '../lib/boletos'
import clsx from '../lib/clsx'
import type { Boleto, FinanceiroLancamento } from '../types/database'

const DIAS_FLUXO = 12

export function Financeiro() {
  const [periodo, setPeriodo] = useState<0 | 1>(0) // 0 = este mês, 1 = mês passado
  const [lancamentos, setLancamentos] = useState<FinanceiroLancamento[]>([])
  const [fluxo, setFluxo] = useState<Record<string, number>>({})
  const [tiposServico, setTiposServico] = useState<{ pacote: number; avulso: number }>({ pacote: 0, avulso: 0 })
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoBoleto, setSalvandoBoleto] = useState(false)
  const [erroBoleto, setErroBoleto] = useState<string | null>(null)

  const { inicio, fim, label } = monthRange(periodo)

  const load = useCallback(async () => {
    setLoading(true)
    const dias = lastNDays(DIAS_FLUXO)

    const [lancRes, fluxoRes, agRes, boletosRes] = await Promise.all([
      supabase
        .from('financeiro_lancamentos')
        .select('*')
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false }),
      supabase
        .from('financeiro_lancamentos')
        .select('data, tipo, valor')
        .gte('data', dias[0])
        .lte('data', dias[dias.length - 1]),
      supabase
        .from('agendamentos')
        .select('tipo_servico')
        .eq('status', 'realizado')
        .gte('data', inicio)
        .lte('data', fim),
      supabase.from('boletos').select('*').neq('status', 'pago').order('data_vencimento', { ascending: true }),
    ])

    setLancamentos((lancRes.data as FinanceiroLancamento[]) ?? [])

    const porDia: Record<string, number> = {}
    for (const d of dias) porDia[d] = 0
    for (const row of (fluxoRes.data as { data: string; tipo: string; valor: number }[] | null) ?? []) {
      const sinal = row.tipo === 'entrada' ? 1 : -1
      porDia[row.data] = (porDia[row.data] ?? 0) + sinal * Number(row.valor)
    }
    setFluxo(porDia)

    const contagem = { pacote: 0, avulso: 0 }
    for (const row of (agRes.data as { tipo_servico: 'avulso' | 'pacote' }[] | null) ?? []) {
      contagem[row.tipo_servico]++
    }
    setTiposServico(contagem)

    setBoletos((boletosRes.data as Boleto[]) ?? [])
    setLoading(false)
  }, [inicio, fim])

  useEffect(() => {
    load()
  }, [load])

  async function marcarBoleto(id: string, status: 'pago' | 'adiado') {
    const boleto = boletos.find((b) => b.id === id)
    if (!boleto) return
    if (status === 'pago') {
      await supabase.from('financeiro_lancamentos').insert({
        tipo: 'saida',
        descricao: boleto.nome,
        categoria: boleto.categoria,
        valor: boleto.valor,
        status_pagamento: 'pago',
        boleto_id: boleto.id,
      })
      await supabase.from('boletos').update({ status: 'pago' }).eq('id', id)
    } else {
      const nova = new Date(boleto.data_vencimento + 'T00:00:00')
      nova.setDate(nova.getDate() + 7)
      await supabase
        .from('boletos')
        .update({ data_vencimento: nova.toISOString().slice(0, 10) })
        .eq('id', id)
    }
    load()
  }

  const entradas = lancamentos.filter((l) => l.tipo === 'entrada')
  const saidas = lancamentos.filter((l) => l.tipo === 'saida')
  const totalEntradas = entradas.reduce((s, l) => s + Number(l.valor), 0)
  const totalSaidas = saidas.reduce((s, l) => s + Number(l.valor), 0)
  const saldo = totalEntradas - totalSaidas
  const ticketMedio = entradas.length > 0 ? totalEntradas / entradas.length : 0
  const totalServicos = tiposServico.pacote + tiposServico.avulso
  const pctPacote = totalServicos > 0 ? Math.round((tiposServico.pacote / totalServicos) * 100) : 0

  const fluxoValores = Object.values(fluxo)
  const fluxoMax = Math.max(1, ...fluxoValores.map((v) => Math.abs(v)))
  const diasFluxo = lastNDays(DIAS_FLUXO)

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[23px] font-extrabold">Financeiro</div>
          <div className="mt-[2px] text-[12.5px] text-text-muted">{label}</div>
        </div>
        <div className="flex gap-2">
          <Chip active={periodo === 0} onClick={() => setPeriodo(0)}>
            Este mês
          </Chip>
          <Chip active={periodo === 1} onClick={() => setPeriodo(1)}>
            Mês passado
          </Chip>
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <>
          <div className="flex gap-[14px]">
            <Card tone="blue" className="relative flex-1 overflow-hidden p-5">
              <div className="pointer-events-none absolute -right-10 -top-12 h-[140px] w-[140px] rounded-full bg-white/10 blur-sm" />
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">Entradas</div>
              <div className="mt-[6px] text-[30px] font-black">{formatMoney(totalEntradas)}</div>
              <div className="mt-[10px] inline-block rounded-pill bg-white/15 px-[10px] py-1 text-[11px] font-bold">
                {entradas.length} banho{entradas.length !== 1 ? 's' : ''}
              </div>
            </Card>
            <Card tone="terracota" className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-terracota">Saídas</div>
              <div className="mt-[6px] text-[26px] font-extrabold text-terracota-dark">{formatMoney(totalSaidas)}</div>
              <div className="mt-[10px] inline-block rounded-pill bg-terracota-tint px-[10px] py-1 text-[11px] font-bold text-terracota-dark">
                Gastos fixos + produtos
              </div>
            </Card>
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Ticket médio</div>
              <div className="mt-[6px] text-[26px] font-extrabold">{formatMoney(ticketMedio)}</div>
              <div className="mt-[10px] text-[11px] text-text-muted">
                {entradas.length} banho{entradas.length !== 1 ? 's' : ''} no período
              </div>
            </Card>
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Saldo do período</div>
              <div className="mt-[6px] text-[26px] font-extrabold">{formatMoney(saldo)}</div>
              <div className={clsx('mt-[10px] text-[11px] font-bold', saldo >= 0 ? 'text-blue' : 'text-terracota-strong')}>
                {saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
              </div>
            </Card>
          </div>

          <div className="flex gap-[14px]">
            <Card className="flex-[1.6] p-[22px]">
              <div className="mb-4 text-[13px] font-extrabold">Fluxo de caixa — últimos {DIAS_FLUXO} dias</div>
              <div className="flex h-[130px] items-end gap-[9px]">
                {diasFluxo.map((d) => {
                  const v = fluxo[d] ?? 0
                  const alturaPct = Math.max(4, Math.round((Math.abs(v) / fluxoMax) * 100))
                  const isHoje = d === todayISO()
                  return (
                    <div
                      key={d}
                      title={`${formatBR(d)}: ${formatMoney(v)}`}
                      className={clsx(
                        'flex-1 rounded-t-lg',
                        v < 0 ? 'bg-terracota-border' : isHoje ? 'bg-gradient-to-b from-blue to-blue-dark' : 'bg-blue-tint'
                      )}
                      style={{ height: `${alturaPct}%` }}
                    />
                  )
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-text-faint">
                <span>{formatBR(diasFluxo[0])}</span>
                <span>{formatBR(diasFluxo[Math.floor(diasFluxo.length / 2)])}</span>
                <span>{formatBR(diasFluxo[diasFluxo.length - 1])}</span>
              </div>
            </Card>

            <Card className="flex flex-1 flex-col gap-[14px] p-[22px]">
              <div className="text-[13px] font-extrabold">Pacotes x Avulsos</div>
              {totalServicos === 0 ? (
                <div className="text-[12px] text-text-muted">Nenhum banho realizado no período.</div>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(#2f5d82 0% ${pctPacote}%, #f0dcc8 ${pctPacote}% 100%)`,
                    }}
                  >
                    <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-card text-[13px] font-extrabold">
                      {pctPacote}%
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-[7px] text-[12px]">
                      <span className="h-[9px] w-[9px] rounded-full bg-blue" />
                      Pacotes · {tiposServico.pacote}
                    </div>
                    <div className="flex items-center gap-[7px] text-[12px]">
                      <span className="h-[9px] w-[9px] rounded-full bg-[#e9c8a4]" />
                      Avulsos · {tiposServico.avulso}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[13px] font-extrabold">Lançamentos recentes</div>
            <TagPill>{lancamentos.length} no período</TagPill>
          </div>

          <Card className="px-5 py-1">
            {lancamentos.length === 0 && (
              <div className="py-3 text-[13px] text-text-muted">Nenhum lançamento no período.</div>
            )}
            {lancamentos.slice(0, 15).map((l) => (
              <div key={l.id} className="flex items-center gap-[14px] border-b border-[#ece5d8] py-[11px] last:border-none">
                <div className="w-[60px] shrink-0 text-[11.5px] text-text-faint">{formatBR(l.data)}</div>
                <div className="flex-grow text-[13px] font-bold">{l.descricao}</div>
                <TagPill tone={l.tipo === 'entrada' ? 'blue' : 'terracota'}>
                  {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </TagPill>
                <div
                  className={clsx(
                    'w-20 text-right text-[13px] font-extrabold',
                    l.tipo === 'saida' ? 'text-terracota-dark' : ''
                  )}
                >
                  {formatMoney(Number(l.valor))}
                </div>
                <div className="w-14 text-center">
                  {l.status_pagamento === 'pendente' ? (
                    <TagPill tone="terracota">Pendente</TagPill>
                  ) : (
                    <TagPill>—</TagPill>
                  )}
                </div>
              </div>
            ))}
          </Card>

          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-extrabold">Contas a pagar · Saídas</div>
              <TagPill tone="terracota">{boletos.length} pendente{boletos.length !== 1 ? 's' : ''}</TagPill>
            </div>
            <div className="text-[11px] text-text-faint">Lembrete no Dashboard a partir de 5 dias antes do vencimento</div>
          </div>

          <NovoBoletoForm loading={salvandoBoleto} erro={erroBoleto} onCreate={async (dados) => {
            setSalvandoBoleto(true)
            setErroBoleto(null)
            const { error } = await supabase.from('boletos').insert(dados)
            setSalvandoBoleto(false)
            if (error) {
              setErroBoleto('Não foi possível salvar o boleto.')
              return
            }
            load()
          }} />

          <Card className="px-5 py-1">
            {boletos.length === 0 && <div className="py-3 text-[13px] text-text-muted">Nenhuma conta pendente.</div>}
            {boletos.map((b) => {
              const estado = boletoEstado(b)
              return (
                <div key={b.id} className="flex items-center gap-[14px] border-b border-[#ece5d8] py-[13px] last:border-none">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-bold">{b.nome}</div>
                      {b.recorrente && <TagPill>Recorrente</TagPill>}
                    </div>
                    <div className="mt-[1px] text-[11px] text-text-muted">
                      {b.categoria ?? 'Sem categoria'} · vence em {formatBR(b.data_vencimento)}
                    </div>
                  </div>
                  <div
                    className={clsx(
                      'w-[130px] text-[11.5px] font-bold',
                      estado === 'atrasado' ? 'text-terracota-strong' : 'text-terracota'
                    )}
                  >
                    {vencimentoLabel(b.data_vencimento)}
                  </div>
                  <div className="w-[74px] text-right text-[13px] font-extrabold">{formatMoney(Number(b.valor))}</div>
                  <div className={clsx('w-[66px] rounded-pill py-[4px] text-center text-[10.5px] font-extrabold', ESTADO_CLASSES[estado])}>
                    {ESTADO_LABEL[estado]}
                  </div>
                  <div className="flex gap-[6px]">
                    <button
                      onClick={() => marcarBoleto(b.id, 'pago')}
                      className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-3 py-[7px] text-[10.5px] font-extrabold text-white"
                    >
                      Pago
                    </button>
                    <button
                      onClick={() => marcarBoleto(b.id, 'adiado')}
                      className="rounded-pill border border-border px-3 py-[7px] text-[10.5px] font-extrabold text-text-soft"
                    >
                      Adiado
                    </button>
                  </div>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}

function NovoBoletoForm({
  onCreate,
  loading,
  erro,
}: {
  onCreate: (dados: { nome: string; categoria: string | null; valor: number; data_vencimento: string; recorrente: boolean }) => void
  loading: boolean
  erro: string | null
}) {
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [recorrente, setRecorrente] = useState(false)

  function submit() {
    const valorNum = Number(valor.replace(',', '.'))
    if (!nome || !vencimento || !valorNum) return
    onCreate({ nome, categoria: categoria || null, valor: valorNum, data_vencimento: vencimento, recorrente })
    setNome('')
    setCategoria('')
    setValor('')
    setVencimento('')
    setRecorrente(false)
  }

  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-[10px]">
        <input
          placeholder="Nome do boleto"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-[1.3] rounded-xl border border-border bg-bg px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
        />
        <input
          placeholder="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-bg px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
        />
        <input
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          inputMode="decimal"
          className="w-24 rounded-xl border border-border bg-bg px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
        />
        <input
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
          className="w-[150px] rounded-xl border border-border bg-bg px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
        />
        <label className="flex items-center gap-[6px] whitespace-nowrap text-[11.5px] text-text-soft">
          <input type="checkbox" checked={recorrente} onChange={(e) => setRecorrente(e.target.checked)} />
          Recorrente
        </label>
        <button
          onClick={submit}
          disabled={loading}
          className="flex shrink-0 items-center gap-[7px] rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[18px] py-[10px] text-[12.5px] font-bold text-white disabled:opacity-60"
        >
          + Adicionar boleto
        </button>
      </div>
      {erro && <div className="text-[11.5px] font-semibold text-terracota-strong">{erro}</div>}
    </Card>
  )
}
