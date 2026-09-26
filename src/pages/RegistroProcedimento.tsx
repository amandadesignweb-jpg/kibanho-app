import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'
import { estoqueStatus } from '../lib/estoque'

interface AgendamentoInfo {
  id: string
  pet_id: string
  tipo_servico: 'avulso' | 'pacote'
  pagamento_status: 'pago' | 'pendente'
  forma_pagamento: 'pix' | 'credito' | 'debito' | 'dinheiro' | null
  valor: number | null
  pet: { nome: string; tutor: { nome: string; telefone: string | null } | null } | null
}

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

/** Remove espaços e caracteres fora de a-z/0-9/./-  do nome do arquivo, pra evitar
 * rejeição de path no Storage (fotos de celular costumam vir com espaços/acentos). */
function nomeArquivoSeguro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
}

export function RegistroProcedimento() {
  const { agendamentoId } = useParams<{ agendamentoId: string }>()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [info, setInfo] = useState<AgendamentoInfo | null>(null)
  const [fotos, setFotos] = useState<File[]>([])
  const [anotacao, setAnotacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!agendamentoId) return
    supabase
      .from('agendamentos')
      .select('id, pet_id, tipo_servico, pagamento_status, forma_pagamento, valor, pet:pets(nome, tutor:tutores(nome, telefone))')
      .eq('id', agendamentoId)
      .single()
      .then(({ data }) => setInfo(data as unknown as AgendamentoInfo))
  }, [agendamentoId])

  function adicionarFotos(files: FileList | null) {
    if (!files) return
    setFotos((f) => [...f, ...Array.from(files)].slice(0, 3))
  }

  async function concluir(enviarWhatsapp: boolean) {
    if (!info || !agendamentoId) return
    if (fotos.length === 0) {
      setErro('Adicione pelo menos 1 foto do banho antes de salvar.')
      return
    }
    setSalvando(true)
    setErro(null)

    try {
      const urls: string[] = []
      for (const foto of fotos) {
        const path = `procedimentos/${agendamentoId}/${Date.now()}-${nomeArquivoSeguro(foto.name)}`
        const { error: upErr } = await supabase.storage.from('fotos-kibanho').upload(path, foto)
        if (upErr) throw new Error(`Falha ao enviar foto: ${upErr.message}`)
        const { data: pub } = supabase.storage.from('fotos-kibanho').getPublicUrl(path)
        urls.push(pub.publicUrl)
      }

      const { error: erroProcedimento } = await supabase.from('procedimentos').insert({
        agendamento_id: agendamentoId,
        pet_id: info.pet_id,
        data: todayISO(),
        fotos: urls,
        anotacao_tutor: anotacao || null,
        enviado_whatsapp: enviarWhatsapp,
      })
      if (erroProcedimento) throw new Error(`Falha ao registrar o procedimento: ${erroProcedimento.message}`)

      const { error: erroStatus } = await supabase
        .from('agendamentos')
        .update({ status: 'realizado' })
        .eq('id', agendamentoId)
      if (erroStatus) throw new Error(`Falha ao atualizar o agendamento: ${erroStatus.message}`)

      // Gera o lançamento financeiro correspondente ao banho (entrada), refletido em Financeiro.
      const { error: erroLancamento } = await supabase.from('financeiro_lancamentos').insert({
        tipo: 'entrada',
        descricao: `${info.pet?.nome ?? 'Pet'} · ${info.pet?.tutor?.nome ?? 'Tutor'}`,
        categoria: info.tipo_servico === 'pacote' ? 'Pacote' : 'Avulso',
        valor: info.valor ?? 0,
        status_pagamento: info.pagamento_status,
        forma_pagamento: info.forma_pagamento,
        agendamento_id: agendamentoId,
      })
      if (erroLancamento) throw new Error(`Falha ao lançar no financeiro: ${erroLancamento.message}`)

      if (info.tipo_servico === 'pacote') {
        const { data: pacote } = await supabase
          .from('pacotes_pet')
          .select('id, banhos_usados_ciclo')
          .eq('pet_id', info.pet_id)
          .eq('status', 'ativo')
          .maybeSingle()
        if (pacote) {
          await supabase
            .from('pacotes_pet')
            .update({ banhos_usados_ciclo: pacote.banhos_usados_ciclo + 1 })
            .eq('id', pacote.id)
        }
      }

      // Todo banho consome os produtos em uso (shampoo, condicionador etc.) e um laço.
      // Não é crítico: se falhar, não bloqueia o registro do banho (já salvo acima).
      try {
        const { data: produtosAtivos } = await supabase
          .from('estoque_produtos')
          .select('id, banhos_realizados')
          .neq('status', 'encerrado')
        for (const p of (produtosAtivos as { id: string; banhos_realizados: number }[] | null) ?? []) {
          const novoTotal = p.banhos_realizados + 1
          await supabase
            .from('estoque_produtos')
            .update({ banhos_realizados: novoTotal, status: estoqueStatus(novoTotal) })
            .eq('id', p.id)
        }

        const { data: lote } = await supabase
          .from('estoque_lacos')
          .select('id, quantidade_usada')
          .order('data_registro', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lote) {
          await supabase
            .from('estoque_lacos')
            .update({ quantidade_usada: lote.quantidade_usada + 1 })
            .eq('id', lote.id)
        }
      } catch (estoqueErr) {
        console.warn('Não foi possível atualizar o estoque automaticamente:', estoqueErr)
      }

      if (enviarWhatsapp) {
        const telefone = apenasDigitos(info.pet?.tutor?.telefone ?? '')
        const msg = encodeURIComponent(
          `Olá! O banho do(a) ${info.pet?.nome} foi concluído. ${anotacao || ''}`.trim()
        )
        if (telefone) window.open(`https://wa.me/55${telefone}?text=${msg}`, '_blank')
      }

      navigate('/agenda')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o registro. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (!info) return <div className="text-text-muted">Carregando…</div>

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-text-muted">Registrar atendimento</div>
          <div className="text-[20px] font-extrabold">{info.pet?.nome}</div>
        </div>
        <button onClick={() => navigate(-1)} className="text-text-muted">✕</button>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">
          Fotos do banho ({fotos.length}/3) · mínimo 1
        </div>
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => {
            const foto = fotos[i]
            return (
              <div
                key={i}
                onClick={() => i === fotos.length && fileRef.current?.click()}
                className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-dashed border-blue bg-blue-tint text-[10px] font-bold text-blue"
              >
                {foto ? (
                  <img src={URL.createObjectURL(foto)} alt="" className="h-full w-full object-cover" />
                ) : (
                  '+ Foto'
                )}
              </div>
            )
          })}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => adicionarFotos(e.target.files)}
          />
        </div>
        {fotos.length === 0 && (
          <div className="mt-2 text-[11.5px] font-semibold text-terracota-strong">
            Adicione pelo menos 1 foto para poder salvar.
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">
          Anotação para o tutor
        </div>
        <textarea
          value={anotacao}
          onChange={(e) => setAnotacao(e.target.value)}
          rows={3}
          placeholder="Ex.: Tudo tranquilo no banho de hoje!"
          className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
        />
      </div>

      {erro && <div className="text-[12.5px] font-semibold text-terracota-strong">{erro}</div>}

      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button
          onClick={() => concluir(false)}
          disabled={salvando || fotos.length === 0}
          className="rounded-pill border border-border px-5 py-[13px] text-[13px] font-bold text-text-soft disabled:opacity-60"
        >
          Salvar
        </button>
        <button
          onClick={() => concluir(true)}
          disabled={salvando || fotos.length === 0}
          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[22px] py-[13px] text-[13px] font-bold text-white disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Salvar e enviar no WhatsApp'}
        </button>
      </div>
    </div>
  )
}
