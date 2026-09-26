import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBR, formatMoney } from '../lib/date'
import { TIPO_PROCEDIMENTO_LABEL } from '../lib/procedimentos'
import { FORMA_PAGAMENTO_LABEL } from '../lib/pagamento'
import { abrirWhatsapp } from '../lib/whatsapp'
import type { FormaPagamento, TipoProcedimento } from '../types/database'

interface RelatorioDetalhe {
  id: string
  data: string
  anotacao_tutor: string | null
  fotos: string[]
  pet: {
    nome: string
    especie: string
    tutor: { nome: string; telefone: string | null } | null
  } | null
  agendamento: {
    tipo_procedimento: TipoProcedimento
    tipo_servico: 'avulso' | 'pacote'
    valor: number | null
    forma_pagamento: FormaPagamento | null
  } | null
}

/** Relatório de um banho registrado — página pensada pra imprimir/salvar como PDF
 * (window.print) e pra reenviar o resumo pro tutor pelo WhatsApp. */
export function RelatorioProcedimento() {
  const { procedimentoId } = useParams<{ procedimentoId: string }>()
  const [relatorio, setRelatorio] = useState<RelatorioDetalhe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!procedimentoId) return
    supabase
      .from('procedimentos')
      .select(
        'id, data, anotacao_tutor, fotos, pet:pets(nome, especie, tutor:tutores(nome, telefone)), agendamento:agendamentos(tipo_procedimento, tipo_servico, valor, forma_pagamento)'
      )
      .eq('id', procedimentoId)
      .single()
      .then(({ data }) => {
        setRelatorio(data as unknown as RelatorioDetalhe)
        setLoading(false)
      })
  }, [procedimentoId])

  function reenviar() {
    if (!relatorio) return
    const msg = `Olá! Aqui está o retorno do banho do(a) ${relatorio.pet?.nome} em ${formatBR(relatorio.data)}. ${relatorio.anotacao_tutor || ''}`.trim()
    const enviado = abrirWhatsapp(relatorio.pet?.tutor?.telefone, msg)
    if (!enviado) alert('Esse tutor não tem telefone cadastrado.')
  }

  if (loading) return <div className="text-text-muted">Carregando…</div>
  if (!relatorio) return <div className="text-text-muted">Relatório não encontrado.</div>

  return (
    <div className="print-area mx-auto flex max-w-[680px] flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-4 py-[10px] text-[13px] font-bold text-white"
        >
          Baixar PDF / Imprimir
        </button>
        <button
          onClick={reenviar}
          className="flex items-center gap-2 rounded-pill border border-border bg-card px-4 py-[10px] text-[13px] font-bold text-text-soft"
        >
          Reenviar no WhatsApp
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-border-faint pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue to-blue-dark text-[16px] font-extrabold text-white">
          K
        </div>
        <div>
          <div className="text-[17px] font-extrabold">Gestão Kibanho</div>
          <div className="text-[12px] text-text-muted">Relatório de atendimento</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
        <div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Pet</div>
          <div className="font-bold">{relatorio.pet?.nome} · {relatorio.pet?.especie}</div>
        </div>
        <div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Tutor</div>
          <div className="font-bold">{relatorio.pet?.tutor?.nome ?? '—'}</div>
        </div>
        <div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Data</div>
          <div className="font-bold">{formatBR(relatorio.data)}</div>
        </div>
        <div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Procedimento</div>
          <div className="font-bold">
            {relatorio.agendamento ? TIPO_PROCEDIMENTO_LABEL[relatorio.agendamento.tipo_procedimento] : '—'}
          </div>
        </div>
        {relatorio.agendamento?.valor != null && (
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Valor</div>
            <div className="font-bold">
              {formatMoney(relatorio.agendamento.valor)}
              {relatorio.agendamento.forma_pagamento ? ` · ${FORMA_PAGAMENTO_LABEL[relatorio.agendamento.forma_pagamento]}` : ''}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Fotos</div>
        {relatorio.fotos.length === 0 ? (
          <div className="text-[12px] text-text-muted">Nenhuma foto registrada.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {relatorio.fotos.map((url, i) => (
              <img key={i} src={url} alt="" className="h-28 w-28 rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Anotação para o tutor</div>
        <div className="rounded-xl bg-[#f7f4ee] p-3 text-[12.5px] text-text-soft">
          {relatorio.anotacao_tutor ?? 'Sem anotação registrada.'}
        </div>
      </div>
    </div>
  )
}
