import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Chip, TagPill } from '../components/ui/Pill'
import { formatBR, formatMoney, lastNDays, monthRange, todayISO, vencimentoLabel } from '../lib/date'
import { boletoEstado, ESTADO_LABEL, ESTADO_CLASSES, pagarBoleto, adiarBoleto } from '../lib/boletos'
import clsx from '../lib/clsx'
import type { Boleto, FinanceiroLancamento } from '../types/database'

const DIAS_FLUXO = 12
const LANCAMENTOS_POR_PAGINA = 6

function exportarCSV(lancamentos: FinanceiroLancamento[], periodoLabel: string) {
  const cabecalho = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor', 'Status']
  const linhas = lancamentos.map((l) => [
    formatBR(l.data),
    `"${l.descricao.replace(/"/g, '""')}"`,
    l.tipo === 'entrada' ? 'Entrada' : 'Saída',
    l.categoria ?? '',
    Number(l.valor).toFixed(2).replace('.', ','),
    l.status_pagamento === 'pago' ? 'Pago' : 'Pendente',
  ])
  const csv = [cabecalho, ...linhas].map((linha) => linha.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `financeiro-${periodoLabel.toLowerCase().replace(/\s+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function Financeiro() {
  const [periodo, setPeriodo] = useState<0 | 1>(0) // 0 = este mês, 1 = mês passado
  const [lancamentos, setLancamentos] = useState<FinanceiroLancamento[]>([])
  const [fluxo, setFluxo] = useState<Record<string, number>>({})
  const [tiposServico, setTiposServico] = useState<{ pacote: number; avulso: number }>({ pacote: 0, avulso: 0 })
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoBoleto, setSalvandoBoleto] = useState(false)
  const [erroBoleto, setErroBoleto] = useState<string | null>(null)
  const [adiandoId, setAdiandoId] = useState<string | null>(null)
  const [novaData, setNovaData] = useState('')
  const [paginaLanc, setPaginaLanc] = useState(0)

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

  useEffect(() => {
    setPaginaLanc(0)
  }, [periodo])

  async function pagar(id: string) {
    const boleto = boletos.find((b) => b.id === id)
    if (!boleto) return
    await pagarBoleto(boleto)
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

  const totalPaginas = Math.max(1, Math.ceil(lancamentos.length / LANCAMENTOS_POR_PAGINA))
  const lancamentosPagina = lancamentos.slice(
    paginaLanc * LANCAMENTOS_POR_PAGINA,
    paginaLanc * LANCAMENTOS_POR_PAGINA + LANCAMENTOS_POR_PAGINA
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[19px] font-extrabold">Financeiro</div>
          <div className="mt-[2px] text-[12px] text-text-muted">{label}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={periodo === 0} onClick={() => setPeriodo(0)}>
            Este mês
          </Chip>
          <Chip active={periodo === 1} onClick={() => setPeriodo(1)}>
            Mês passado
          </Chip>
          <button
            onClick={() => exportarCSV(lancamentos, label)}
            disabled={lancamentos.length === 0}
            className="flex items-center gap-2 rounded-pill bg-card px-4 py-[10px] text-[13px] font-bold text-text-soft shadow-card disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v13M7 11l5 5 5-5" />
              <path d="M4 20h16" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card tone="blue" className="relative overflow-hidden p-3">
              <div className="pointer-events-none absolute -right-10 -top-12 h-[140px] w-[140px] rounded-full bg-white/10 blur-sm" />
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">Entradas</div>
              <div className="mt-1 text-[22px] font-black">{formatMoney(totalEntradas)}</div>
              <div className="mt-2 inline-block rounded-pill bg-white/15 px-[10px] py-1 text-[10.5px] font-bold">
                {entradas.length} banho{entradas.length !== 1 ? 's' : ''}
              </div>
            </Card>
            <Card tone="terracota" className="p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-terracota">Saídas</div>
              <div className="mt-1 text-[20px] font-extrabold text-terracota-dark">{formatMoney(totalSaidas)}</div>
              <div className="mt-2 inline-block rounded-pill bg-terracota-tint px-[10px] py-1 text-[10.5px] font-bold text-terracota-dark">
                Gastos fixos + produtos
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-faint">Ticket médio</div>
              <div className="mt-1 text-[20px] font-extrabold">{formatMoney(ticketMedio)}</div>
              <div className="mt-2 text-[10.5px] text-text-muted">
                {entradas.length} banho{entradas.length !== 1 ? 's' : ''} no período
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-text-faint">Saldo do período</div>
              <div className="mt-1 text-[20px] font-extrabold">{formatMoney(saldo)}</div>
              <div className={clsx('mt-2 text-[10.5px] font-bold', saldo >= 0 ? 'text-blue' : 'text-terracota-strong')}>
                {saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Card className="p-4 md:flex-[1.6]">
              <div className="mb-3 text-[12.5px] font-extrabold">Fluxo de caixa — últimos {DIAS_FLUXO} dias</div>
              <div className="flex h-[100px] items-end gap-[9px]">
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

            <Card className="flex flex-col gap-3 p-4 md:flex-1">
              <div className="text-[12.5px] font-extrabold">Pacotes x Avulsos</div>
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[13px] font-extrabold">Lançamentos recentes</div>
              <TagPill>{lancamentos.length} no período</TagPill>
            </div>
            {lancamentos.length > LANCAMENTOS_POR_PAGINA && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaLanc((p) => Math.max(0, p - 1))}
                  disabled={paginaLanc === 0}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-text-soft shadow-card disabled:opacity-40"
                >
                  ‹
                </button>
                <div className="text-[11px] text-text-muted">
                  Página {paginaLanc + 1} de {totalPaginas}
                </div>
                <button
                  onClick={() => setPaginaLanc((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={paginaLanc >= totalPaginas - 1}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-text-soft shadow-card disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <Card className="overflow-x-auto px-4 py-1">
            {lancamentos.length === 0 && (
              <div className="py-3 text-[13px] text-text-muted">Nenhum lançamento no período.</div>
            )}
            {lancamentosPagina.map((l) => (
              <div key={l.id} className="flex min-w-[420px] items-center gap-3 border-b border-[#ece5d8] py-2 last:border-none">
                <div className="w-[55px] shrink-0 text-[11px] text-text-faint">{formatBR(l.data)}</div>
                <div className="flex-grow text-[12.5px] font-bold">{l.descricao}</div>
                <TagPill tone={l.tipo === 'entrada' ? 'blue' : 'terracota'}>
                  {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </TagPill>
                <div
                  className={clsx(
                    'w-20 shrink-0 text-right text-[12.5px] font-extrabold',
                    l.tipo === 'saida' ? 'text-terracota-dark' : ''
                  )}
                >
                  {formatMoney(Number(l.valor))}
                </div>
                <div className="w-14 shrink-0 text-center">
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

          <Card className="overflow-x-auto px-4 py-1">
            {boletos.length === 0 && <div className="py-3 text-[13px] text-text-muted">Nenhuma conta pendente.</div>}
            {boletos.map((b) => {
              const estado = boletoEstado(b)
              return (
                <div key={b.id} className="flex min-w-[560px] items-center gap-[14px] border-b border-[#ece5d8] py-2 last:border-none">
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
                      'w-[130px] shrink-0 text-[11.5px] font-bold',
                      estado === 'atrasado' ? 'text-terracota-strong' : 'text-terracota'
                    )}
                  >
                    {vencimentoLabel(b.data_vencimento)}
                  </div>
                  <div className="w-[74px] shrink-0 text-right text-[13px] font-extrabold">{formatMoney(Number(b.valor))}</div>
                  <div className={clsx('w-[66px] shrink-0 rounded-pill py-[4px] text-center text-[10.5px] font-extrabold', ESTADO_CLASSES[estado])}>
                    {ESTADO_LABEL[estado]}
                  </div>
                  {adiandoId === b.id ? (
                    <div className="flex items-center gap-[6px]">
                      <input
                        type="date"
                        value={novaData}
                        onChange={(e) => setNovaData(e.target.value)}
                        autoFocus
                        className="rounded-lg border border-border px-2 py-[6px] text-[11px] outline-none focus:border-blue"
                      />
                      <button
                        onClick={() => confirmarAdiamento(b.id)}
                        disabled={!novaData}
                        className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-3 py-[7px] text-[10.5px] font-extrabold text-white disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => { setAdiandoId(null); setNovaData('') }}
                        className="text-[10.5px] font-bold text-text-faint"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-[6px]">
                      <button
                        onClick={() => pagar(b.id)}
                        className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-3 py-[7px] text-[10.5px] font-extrabold text-white"
                      >
                        Pago
                      </button>
                      <button
                        onClick={() => { setAdiandoId(b.id); setNovaData(b.data_vencimento) }}
                        className="rounded-pill border border-border px-3 py-[7px] text-[10.5px] font-extrabold text-text-soft"
                      >
                        Adiado
                      </button>
                    </div>
                  )}
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
      <div className="flex flex-wrap items-center gap-[10px]">
        <input
          placeholder="Nome do boleto"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="min-w-[140px] flex-[1.3] rounded-xl border border-border bg-bg px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
        />
        <input
          placeholder="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="min-w-[100px] flex-1 rounded-xl border border-border bg-bg px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
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
