import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { TagPill } from '../components/ui/Pill'
import { formatBR, todayISO } from '../lib/date'
import { diasEmUso, ESTOQUE_CLASSES, ESTOQUE_LABEL } from '../lib/estoque'
import clsx from '../lib/clsx'
import type { EstoqueLacos, EstoqueProduto } from '../types/database'

export function Estoque() {
  const [produtos, setProdutos] = useState<EstoqueProduto[]>([])
  const [lotesLacos, setLotesLacos] = useState<EstoqueLacos[]>([])
  const [loading, setLoading] = useState(true)

  const [nomeProduto, setNomeProduto] = useState('')
  const [dataAbertura, setDataAbertura] = useState(todayISO())
  const [salvandoProduto, setSalvandoProduto] = useState(false)

  const [novaCompra, setNovaCompra] = useState('')
  const [salvandoLacos, setSalvandoLacos] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [prodRes, lacosRes] = await Promise.all([
      supabase.from('estoque_produtos').select('*').neq('status', 'encerrado').order('data_abertura', { ascending: true }),
      supabase.from('estoque_lacos').select('*').order('data_registro', { ascending: true }),
    ])
    setProdutos((prodRes.data as EstoqueProduto[]) ?? [])
    setLotesLacos((lacosRes.data as EstoqueLacos[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function registrarProduto() {
    if (!nomeProduto || !dataAbertura) return
    setSalvandoProduto(true)
    await supabase.from('estoque_produtos').insert({
      nome: nomeProduto,
      data_abertura: dataAbertura,
      banhos_realizados: 0,
      status: 'em_uso',
    })
    setSalvandoProduto(false)
    setNomeProduto('')
    setDataAbertura(todayISO())
    load()
  }

  async function encerrarProduto(id: string) {
    await supabase.from('estoque_produtos').update({ status: 'encerrado', data_fim: todayISO() }).eq('id', id)
    load()
  }

  async function registrarCompraLacos() {
    const qtd = Number(novaCompra)
    if (!qtd || qtd <= 0) return
    setSalvandoLacos(true)
    await supabase.from('estoque_lacos').insert({
      quantidade_comprada: qtd,
      quantidade_usada: 0,
      data_registro: todayISO(),
    })
    setSalvandoLacos(false)
    setNovaCompra('')
    load()
  }

  const comprados = lotesLacos.reduce((s, l) => s + l.quantidade_comprada, 0)
  const usados = lotesLacos.reduce((s, l) => s + l.quantidade_usada, 0)
  const restantes = Math.max(0, comprados - usados)
  const pctRestante = comprados > 0 ? Math.round((restantes / comprados) * 100) : 0
  const lacosAlerta = comprados > 0 && pctRestante <= 25

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="text-[23px] font-extrabold">Estoque</div>
        <div className="mt-[2px] text-[12.5px] text-text-muted">Controle de uso de produtos e reposição de laços</div>
      </div>

      <Card className="p-5">
        <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">
          Registrar novo produto
        </div>
        <div className="flex items-end gap-3">
          <input
            placeholder="Nome do produto"
            value={nomeProduto}
            onChange={(e) => setNomeProduto(e.target.value)}
            className="flex-[1.4] rounded-xl border border-border bg-[#fbf9f5] px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
          />
          <input
            type="date"
            value={dataAbertura}
            onChange={(e) => setDataAbertura(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-[#fbf9f5] px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
          />
          <button
            onClick={registrarProduto}
            disabled={salvandoProduto || !nomeProduto}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-blue to-blue-dark px-[18px] py-[11px] text-[12.5px] font-bold text-white disabled:opacity-60"
          >
            + Registrar
          </button>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <div className="text-[13px] font-extrabold">Produtos em uso</div>
        <TagPill>{produtos.length} ativo{produtos.length !== 1 ? 's' : ''}</TagPill>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <Card className="px-[22px] py-1">
          <div className="flex items-center gap-[14px] border-b border-[#ece5d8] py-[10px] text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">
            <div className="flex-[1.6]">Produto</div>
            <div className="w-[90px]">Aberto em</div>
            <div className="w-[100px]">Em uso há</div>
            <div className="w-[130px]">Banhos realizados</div>
            <div className="w-[130px] text-right">Status</div>
          </div>
          {produtos.length === 0 && <div className="py-3 text-[13px] text-text-muted">Nenhum produto em uso.</div>}
          {produtos.map((p) => (
            <div key={p.id} className="flex items-center gap-[14px] border-b border-[#ece5d8] py-[13px] last:border-none">
              <div className="flex-[1.6] text-[13px] font-bold">{p.nome}</div>
              <div className="w-[90px] text-[12.5px] text-text-soft">{formatBR(p.data_abertura)}</div>
              <div className="w-[100px] text-[12.5px] text-text-soft">{diasEmUso(p.data_abertura)} dias</div>
              <div className="w-[130px] text-[12.5px] text-text-soft">{p.banhos_realizados} banhos</div>
              <div className="flex w-[130px] items-center justify-end gap-2">
                <span className={clsx('rounded-pill px-[11px] py-1 text-[10.5px] font-extrabold', ESTOQUE_CLASSES[p.status])}>
                  {ESTOQUE_LABEL[p.status]}
                </span>
                <button
                  onClick={() => encerrarProduto(p.id)}
                  title="Encerrar produto (repôs)"
                  className="text-[11px] font-bold text-text-faint hover:text-terracota-strong"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="flex items-center gap-6 p-[22px]">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-tint to-blue-bar1 text-blue">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3" />
            <path d="M12 11v10M8 15l4-4 4 4" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-extrabold">Laços</div>
          <div className="mt-[2px] text-[11.5px] text-text-muted">
            Reposição calculada com base no número de procedimentos realizados
          </div>
        </div>
        <div className="flex items-center gap-[26px]">
          <div className="text-center">
            <div className="text-[20px] font-extrabold">{comprados}</div>
            <div className="text-[10.5px] font-bold uppercase text-text-faint">Comprados</div>
          </div>
          <div className="text-center">
            <div className="text-[20px] font-extrabold">{usados}</div>
            <div className="text-[10.5px] font-bold uppercase text-text-faint">Usados</div>
          </div>
          <div className="text-center">
            <div className={clsx('text-[20px] font-extrabold', lacosAlerta ? 'text-terracota-dark' : 'text-ink')}>
              {restantes}
            </div>
            <div className="text-[10.5px] font-bold uppercase text-text-faint">Restantes</div>
          </div>
          <div className="w-[160px]">
            <div className="h-2 overflow-hidden rounded-pill bg-border-faint">
              <div
                className={clsx('h-full rounded-pill', lacosAlerta ? 'bg-gradient-to-r from-terracota to-terracota-dark' : 'bg-gradient-to-r from-blue to-blue-dark')}
                style={{ width: `${pctRestante}%` }}
              />
            </div>
            <div className={clsx('mt-[6px] text-[10.5px] font-bold', lacosAlerta ? 'text-terracota-dark' : 'text-text-faint')}>
              {comprados === 0 ? 'Registre a primeira compra' : lacosAlerta ? 'Restam poucos — repor em breve' : `${pctRestante}% do lote restante`}
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <input
          placeholder="Quantidade comprada"
          value={novaCompra}
          onChange={(e) => setNovaCompra(e.target.value)}
          inputMode="numeric"
          className="w-48 rounded-xl border border-border bg-[#fbf9f5] px-[13px] py-[10px] text-[12.5px] outline-none focus:border-blue"
        />
        <button
          onClick={registrarCompraLacos}
          disabled={salvandoLacos || !novaCompra}
          className="rounded-xl border border-border px-4 py-[10px] text-[12.5px] font-bold text-text-soft disabled:opacity-60"
        >
          + Registrar compra de laços
        </button>
      </Card>
    </div>
  )
}
