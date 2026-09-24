import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Chip, TagPill } from '../components/ui/Pill'
import { diasEmUso, ESTOQUE_CLASSES, ESTOQUE_LABEL } from '../lib/estoque'
import { TIPO_PROCEDIMENTO_LABEL, TIPO_PROCEDIMENTO_OPCOES } from '../lib/procedimentos'
import { formatMoney } from '../lib/date'
import clsx from '../lib/clsx'
import type { EstoqueLacos, EstoqueProduto, TipoProcedimento } from '../types/database'

type Periodo = 'mes' | 'trimestre' | 'ano'

function rangeFor(periodo: Periodo): { inicio: string; fim: string } {
  const now = new Date()
  const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let inicio: Date
  if (periodo === 'mes') inicio = new Date(now.getFullYear(), now.getMonth(), 1)
  else if (periodo === 'trimestre') inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  else inicio = new Date(now.getFullYear(), 0, 1)
  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { inicio: toISO(inicio), fim: toISO(fim) }
}

interface Semana {
  label: string
  inicio: string
  fim: string
  total: number
}

export function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [loading, setLoading] = useState(true)
  const [totalBanhos, setTotalBanhos] = useState(0)
  const [receitaTotal, setReceitaTotal] = useState(0)
  const [pacotesAtivos, setPacotesAtivos] = useState(0)
  const [porTipo, setPorTipo] = useState({ pacote: 0, avulso: 0 })
  const [porProcedimento, setPorProcedimento] = useState<Record<TipoProcedimento, number>>({
    banho: 0,
    banho_tosa: 0,
    tosa_higienica: 0,
  })
  const [semanas, setSemanas] = useState<Semana[]>([])
  const [produtos, setProdutos] = useState<EstoqueProduto[]>([])
  const [lotesLacos, setLotesLacos] = useState<EstoqueLacos[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { inicio, fim } = rangeFor(periodo)

    const [agRes, lancRes, pacotesRes, produtosRes, lacosRes] = await Promise.all([
      supabase.from('agendamentos').select('data, tipo_servico, tipo_procedimento').eq('status', 'realizado').gte('data', inicio).lte('data', fim),
      supabase.from('financeiro_lancamentos').select('valor').eq('tipo', 'entrada').gte('data', inicio).lte('data', fim),
      supabase.from('pacotes_pet').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('estoque_produtos').select('*').neq('status', 'encerrado').order('banhos_realizados', { ascending: false }),
      supabase.from('estoque_lacos').select('*'),
    ])

    const ags = (agRes.data as { data: string; tipo_servico: 'avulso' | 'pacote'; tipo_procedimento: TipoProcedimento }[] | null) ?? []
    setTotalBanhos(ags.length)
    const contagem = { pacote: 0, avulso: 0 }
    for (const a of ags) contagem[a.tipo_servico]++
    setPorTipo(contagem)

    const contagemProc: Record<TipoProcedimento, number> = { banho: 0, banho_tosa: 0, tosa_higienica: 0 }
    for (const a of ags) contagemProc[a.tipo_procedimento]++
    setPorProcedimento(contagemProc)

    const receita = ((lancRes.data as { valor: number }[] | null) ?? []).reduce((s, l) => s + Number(l.valor), 0)
    setReceitaTotal(receita)
    setPacotesAtivos(pacotesRes.count ?? 0)
    setProdutos(((produtosRes.data as EstoqueProduto[]) ?? []).slice(0, 4))
    setLotesLacos((lacosRes.data as EstoqueLacos[]) ?? [])

    // Banhos por semana dentro do período (até 6 semanas mais recentes).
    const semanasMap: Semana[] = []
    const cursor = new Date(inicio + 'T00:00:00')
    const fimDate = new Date(fim + 'T00:00:00')
    let n = 1
    while (cursor <= fimDate) {
      const semInicio = new Date(cursor)
      const semFim = new Date(cursor)
      semFim.setDate(semFim.getDate() + 6)
      const semFimClamped = semFim > fimDate ? fimDate : semFim
      const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const total = ags.filter((a) => a.data >= iso(semInicio) && a.data <= iso(semFimClamped)).length
      semanasMap.push({ label: `Sem ${n}`, inicio: iso(semInicio), fim: iso(semFimClamped), total })
      cursor.setDate(cursor.getDate() + 7)
      n++
    }
    setSemanas(semanasMap.slice(-6))

    setLoading(false)
  }, [periodo])

  useEffect(() => {
    load()
  }, [load])

  const ticketMedio = totalBanhos > 0 ? receitaTotal / totalBanhos : 0
  const totalTipo = porTipo.pacote + porTipo.avulso
  const pctPacote = totalTipo > 0 ? Math.round((porTipo.pacote / totalTipo) * 100) : 0
  const semanaMax = Math.max(1, ...semanas.map((s) => s.total))

  const comprados = lotesLacos.reduce((s, l) => s + l.quantidade_comprada, 0)
  const usados = lotesLacos.reduce((s, l) => s + l.quantidade_usada, 0)
  const restantes = Math.max(0, comprados - usados)
  const pctRestante = comprados > 0 ? Math.round((restantes / comprados) * 100) : 0
  const itensARepor = produtos.filter((p) => p.status !== 'em_uso').length

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[23px] font-extrabold">Relatórios</div>
          <div className="mt-[2px] text-[12.5px] text-text-muted">Visão consolidada do negócio</div>
        </div>
        <div className="flex gap-2">
          <Chip active={periodo === 'mes'} onClick={() => setPeriodo('mes')}>Este mês</Chip>
          <Chip active={periodo === 'trimestre'} onClick={() => setPeriodo('trimestre')}>Trimestre</Chip>
          <Chip active={periodo === 'ano'} onClick={() => setPeriodo('ano')}>Ano</Chip>
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <>
          <div className="flex gap-[14px]">
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Total de banhos</div>
              <div className="mt-[6px] text-[28px] font-extrabold">{totalBanhos}</div>
            </Card>
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Receita total</div>
              <div className="mt-[6px] text-[28px] font-extrabold">{formatMoney(receitaTotal)}</div>
            </Card>
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Ticket médio</div>
              <div className="mt-[6px] text-[28px] font-extrabold">{formatMoney(ticketMedio)}</div>
            </Card>
            <Card className="flex-1 p-5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Pacotes ativos</div>
              <div className="mt-[6px] text-[28px] font-extrabold">{pacotesAtivos}</div>
            </Card>
          </div>

          <div className="flex gap-[14px]">
            <Card className="flex-[1.4] p-[22px]">
              <div className="mb-4 text-[13px] font-extrabold">Banhos por semana</div>
              {semanas.length === 0 ? (
                <div className="text-[12px] text-text-muted">Sem dados no período.</div>
              ) : (
                <div className="flex items-end gap-4">
                  {semanas.map((s, i) => {
                    const alturaPct = Math.max(6, Math.round((s.total / semanaMax) * 100))
                    const isUltima = i === semanas.length - 1
                    return (
                      <div key={s.inicio} className="flex flex-1 flex-col items-center gap-2">
                        <div className={clsx('text-[11px] font-bold', isUltima ? 'rounded-lg bg-gradient-to-br from-blue to-blue-dark px-[7px] py-[1px] text-white' : '')}>
                          {s.total}
                        </div>
                        <div
                          className={clsx('w-full rounded-t-[10px]', isUltima ? 'bg-gradient-to-b from-blue to-blue-dark' : 'bg-blue-bar1')}
                          style={{ height: `${alturaPct * 1.1}px` }}
                        />
                        <div className={clsx('text-[10px]', isUltima ? 'font-bold text-ink' : 'text-text-faint')}>{s.label}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card className="flex flex-1 flex-col gap-4 p-[22px]">
              <div className="text-[13px] font-extrabold">Serviços mais realizados</div>
              {totalTipo === 0 ? (
                <div className="text-[12px] text-text-muted">Nenhum banho realizado no período.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {TIPO_PROCEDIMENTO_OPCOES.map((tipo, i) => {
                    const count = porProcedimento[tipo]
                    const pct = totalBanhos > 0 ? Math.round((count / totalBanhos) * 100) : 0
                    const cores = [
                      'bg-gradient-to-r from-blue to-blue-dark',
                      'bg-gradient-to-r from-terracota to-terracota-dark',
                      '',
                    ]
                    return (
                      <div key={tipo}>
                        <div className="mb-[6px] flex justify-between text-[12px]">
                          <span className="font-bold">{TIPO_PROCEDIMENTO_LABEL[tipo]}</span>
                          <span>{count}</span>
                        </div>
                        <div className="h-[9px] overflow-hidden rounded-pill bg-border-faint">
                          <div
                            className={clsx('h-full rounded-pill', cores[i])}
                            style={{ width: `${pct}%`, background: i === 2 ? '#cfc4b2' : undefined }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-auto flex items-center gap-[14px] border-t border-[#ece5d8] pt-[14px]">
                <div
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#2f5d82 0% ${pctPacote}%, #f0dcc8 ${pctPacote}% 100%)` }}
                >
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-card text-[11px] font-extrabold">
                    {pctPacote}%
                  </div>
                </div>
                <div className="text-[11.5px] leading-[1.5] text-text-soft">
                  dos atendimentos são de clientes com <b className="text-ink">pacote</b> ativo
                </div>
              </div>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[13px] font-extrabold">Estoque e reposição</div>
            {itensARepor > 0 && <TagPill tone="terracota">{itensARepor} ite{itensARepor !== 1 ? 'ns' : 'm'} a repor</TagPill>}
          </div>

          <div className="flex gap-[14px]">
            <Card className="flex-[1.5] px-[22px] py-[18px]">
              <div className="mb-2 text-[12px] font-extrabold">Produtos em uso</div>
              {produtos.length === 0 && <div className="text-[12px] text-text-muted">Nenhum produto ativo.</div>}
              {produtos.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border-b border-[#ece5d8] py-2 last:border-none">
                  <div className="flex-[1.5] text-[12.5px] font-bold">{p.nome}</div>
                  <div className="w-[70px] text-[11.5px] text-text-soft">{diasEmUso(p.data_abertura)} dias</div>
                  <div className="w-[90px] text-[11.5px] text-text-soft">{p.banhos_realizados} banhos</div>
                  <div className="w-[110px] text-right">
                    <span className={clsx('rounded-pill px-[10px] py-[3px] text-[10px] font-extrabold', ESTOQUE_CLASSES[p.status])}>
                      {ESTOQUE_LABEL[p.status]}
                    </span>
                  </div>
                </div>
              ))}
              <Link to="/estoque" className="mt-[10px] block text-right text-[11.5px] font-bold text-blue">
                Ver estoque completo →
              </Link>
            </Card>

            <Card className="flex flex-1 flex-col gap-3 px-[22px] py-[18px]">
              <div className="text-[12px] font-extrabold">Laços</div>
              <div className="flex gap-[18px]">
                <div>
                  <div className="text-[20px] font-extrabold">{comprados}</div>
                  <div className="text-[9.5px] font-bold uppercase text-text-faint">Comprados</div>
                </div>
                <div>
                  <div className="text-[20px] font-extrabold">{usados}</div>
                  <div className="text-[9.5px] font-bold uppercase text-text-faint">Usados</div>
                </div>
                <div>
                  <div className={clsx('text-[20px] font-extrabold', pctRestante <= 25 && comprados > 0 ? 'text-terracota-dark' : '')}>
                    {restantes}
                  </div>
                  <div className="text-[9.5px] font-bold uppercase text-text-faint">Restam</div>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-pill bg-border-faint">
                <div
                  className={clsx('h-full rounded-pill', pctRestante <= 25 && comprados > 0 ? 'bg-gradient-to-r from-terracota to-terracota-dark' : 'bg-gradient-to-r from-blue to-blue-dark')}
                  style={{ width: `${pctRestante}%` }}
                />
              </div>
              <div className={clsx('text-[11px] font-bold', pctRestante <= 25 && comprados > 0 ? 'text-terracota-dark' : 'text-text-faint')}>
                {comprados === 0
                  ? 'Sem compras registradas ainda.'
                  : pctRestante <= 25
                    ? 'Restam poucos — repor em breve, com base no ritmo de procedimentos.'
                    : `${pctRestante}% do lote restante.`}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
