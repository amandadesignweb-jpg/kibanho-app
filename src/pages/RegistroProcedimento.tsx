import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'

interface AgendamentoInfo {
  id: string
  pet_id: string
  tipo_servico: 'avulso' | 'pacote'
  pet: { nome: string; tutor: { nome: string; telefone: string | null } | null } | null
}

function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '')
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
      .select('id, pet_id, tipo_servico, pet:pets(nome, tutor:tutores(nome, telefone))')
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
    setSalvando(true)
    setErro(null)

    try {
      const urls: string[] = []
      for (const foto of fotos) {
        const path = `procedimentos/${agendamentoId}/${Date.now()}-${foto.name}`
        const { error: upErr } = await supabase.storage.from('fotos-kibanho').upload(path, foto)
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('fotos-kibanho').getPublicUrl(path)
        urls.push(pub.publicUrl)
      }

      await supabase.from('procedimentos').insert({
        agendamento_id: agendamentoId,
        pet_id: info.pet_id,
        data: todayISO(),
        fotos: urls,
        anotacao_tutor: anotacao || null,
        enviado_whatsapp: enviarWhatsapp,
      })

      await supabase.from('agendamentos').update({ status: 'realizado' }).eq('id', agendamentoId)

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

      if (enviarWhatsapp) {
        const telefone = apenasDigitos(info.pet?.tutor?.telefone ?? '')
        const msg = encodeURIComponent(
          `Olá! O banho do(a) ${info.pet?.nome} foi concluído. ${anotacao || ''}`.trim()
        )
        if (telefone) window.open(`https://wa.me/55${telefone}?text=${msg}`, '_blank')
      }

      navigate('/agenda')
    } catch {
      setErro('Não foi possível salvar o registro. Tente novamente.')
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
          Fotos do banho ({fotos.length}/3)
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

      <div className="flex justify-end gap-2">
        <button
          onClick={() => concluir(false)}
          disabled={salvando}
          className="rounded-pill border border-border px-5 py-[13px] text-[13px] font-bold text-text-soft disabled:opacity-60"
        >
          Salvar
        </button>
        <button
          onClick={() => concluir(true)}
          disabled={salvando}
          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[22px] py-[13px] text-[13px] font-bold text-white disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Salvar e enviar no WhatsApp'}
        </button>
      </div>
    </div>
  )
}
