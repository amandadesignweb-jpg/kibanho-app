import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { TagPill } from '../components/ui/Pill'
import { formatBR, formatMoney, todayISO } from '../lib/date'
import { FORMA_PAGAMENTO_LABEL } from '../lib/pagamento'
import { TIPO_PROCEDIMENTO_LABEL } from '../lib/procedimentos'
import { abrirWhatsapp } from '../lib/whatsapp'
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

function nomeArquivoSeguro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
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

  const [editando, setEditando] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editEspecie, setEditEspecie] = useState('')
  const [editRaca, setEditRaca] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')
  const [editTutorNome, setEditTutorNome] = useState('')
  const [editTutorTelefone, setEditTutorTelefone] = useState('')
  const [editFoto, setEditFoto] = useState<File | null>(null)

  async function load() {
    if (!id) return
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
    const petData = petRes.data as unknown as PetDetalhe
    setPet(petData)
    setPacote(pacoteRes.data as unknown as PacoteAtual)
    setHistorico((histRes.data as unknown as HistoricoItem[]) ?? [])
    setProximos((proximosRes.data as unknown as ProximoAgendamento[]) ?? [])
    setPagamentos((pagamentosRes.data as unknown as PagamentoItem[]) ?? [])
    if (petData) {
      setEditNome(petData.nome)
      setEditEspecie(petData.especie)
      setEditRaca(petData.raca ?? '')
      setEditObservacoes(petData.observacoes ?? '')
      setEditTutorNome(petData.tutor?.nome ?? '')
      setEditTutorTelefone(petData.tutor?.telefone ?? '')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function iniciarEdicao() {
    setErroEdicao(null)
    setEditFoto(null)
    setEditando(true)
  }

  async function salvarEdicao() {
    if (!pet || !editNome || !editTutorNome) {
      setErroEdicao('Preencha ao menos o nome do pet e do tutor.')
      return
    }
    setSalvandoEdicao(true)
    setErroEdicao(null)

    const { error: erroPet } = await supabase
      .from('pets')
      .update({
        nome: editNome,
        especie: editEspecie,
        raca: editRaca || null,
        observacoes: editObservacoes || null,
      })
      .eq('id', pet.id)
    if (erroPet) {
      setSalvandoEdicao(false)
      setErroEdicao('Não foi possível salvar os dados do pet.')
      return
    }

    if (pet.tutor) {
      const { error: erroTutor } = await supabase
        .from('tutores')
        .update({ nome: editTutorNome, telefone: editTutorTelefone || null })
        .eq('id', pet.tutor.id)
      if (erroTutor) {
        setSalvandoEdicao(false)
        setErroEdicao('Dados do pet salvos, mas não foi possível atualizar o tutor.')
        return
      }
    }

    if (editFoto) {
      const path = `pets/${pet.id}-${Date.now()}-${nomeArquivoSeguro(editFoto.name)}`
      const { error: erroUpload } = await supabase.storage.from('fotos-kibanho').upload(path, editFoto)
      if (!erroUpload) {
        const { data: pub } = supabase.storage.from('fotos-kibanho').getPublicUrl(path)
        await supabase.from('pets').update({ foto_url: pub.publicUrl }).eq('id', pet.id)
      }
    }

    setSalvandoEdicao(false)
    setEditando(false)
    load()
  }

  function reenviarWhatsapp(h: HistoricoItem) {
    if (!pet) return
    const msg = `Olá! Aqui está o retorno do banho do(a) ${pet.nome} em ${formatBR(h.data)}. ${h.anotacao_tutor || ''}`.trim()
    const enviado = abrirWhatsapp(pet.tutor?.telefone, msg)
    if (!enviado) alert('Esse tutor não tem telefone cadastrado.')
  }

  if (loading) return <div className="text-text-muted">Carregando…</div>
  if (!pet) return <div className="text-text-muted">Pet não encontrado.</div>

  const progresso = pacote
    ? Math.min(100, Math.round((pacote.banhos_usados_ciclo / (pacote.tipo_pacote?.banhos_por_ciclo ?? 1)) * 100))
    : 0

  return (
    <div className="relative flex flex-col gap-3">
      <Card className="p-4">
        {editando ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <label className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-blue bg-blue-tint text-[8px] font-bold text-blue">
                {editFoto ? (
                  <img src={URL.createObjectURL(editFoto)} alt="" className="h-full w-full object-cover" />
                ) : pet.foto_url ? (
                  <img src={pet.foto_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  '+ Foto'
                )}
                <input type="file" accept="image/*" hidden onChange={(e) => setEditFoto(e.target.files?.[0] ?? null)} />
              </label>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome do pet"
                  className="rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                />
                <select
                  value={editEspecie}
                  onChange={(e) => setEditEspecie(e.target.value)}
                  className="rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                >
                  <option value="cão">Cão</option>
                  <option value="gato">Gato</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={editRaca}
                onChange={(e) => setEditRaca(e.target.value)}
                placeholder="Raça (opcional)"
                className="rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
              />
              <input
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Observações (opcional)"
                className="rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={editTutorNome}
                onChange={(e) => setEditTutorNome(e.target.value)}
                placeholder="Nome do tutor"
                className="rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
              />
              <input
                value={editTutorTelefone}
                onChange={(e) => setEditTutorTelefone(e.target.value)}
                placeholder="Telefone / WhatsApp"
                className="rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
              />
            </div>
            {erroEdicao && <div className="text-[11.5px] font-semibold text-terracota-strong">{erroEdicao}</div>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditando(false)}
                className="rounded-pill border border-border px-4 py-[8px] text-[12px] font-bold text-text-soft"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao}
                className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-4 py-[8px] text-[12px] font-bold text-white disabled:opacity-60"
              >
                {salvandoEdicao ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {pet.foto_url ? (
              <img src={pet.foto_url} alt={pet.nome} className="h-[54px] w-[54px] shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-blue-tint text-[9px] font-bold text-blue">
                IMG
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-extrabold">{pet.nome}</div>
              <div className="text-[12px] text-text-muted">
                {pet.especie}
                {pet.raca ? ` · ${pet.raca}` : ''}
              </div>
              {pet.observacoes && (
                <div className="mt-1 rounded-lg bg-[#f7f4ee] px-2 py-1 text-[11px] text-text-soft">{pet.observacoes}</div>
              )}
              <div className="mt-1 text-[11.5px] text-text-muted">
                Tutor: <span className="font-bold text-ink">{pet.tutor?.nome ?? '—'}</span>
                {pet.tutor?.telefone ? ` · ${pet.tutor.telefone}` : ''}
              </div>
            </div>
            <button
              onClick={iniciarEdicao}
              className="shrink-0 rounded-pill border border-border px-3 py-[7px] text-[11.5px] font-bold text-text-soft hover:bg-[#f7f4ee]"
            >
              Editar
            </button>
          </div>
        )}
      </Card>

      {pacote && (
        <Card tone="terracota" className="p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-terracota">Pacote atual</div>
          <div className="mt-1 text-[13.5px] font-extrabold">
            {pacote.tipo_pacote?.nome} · {pacote.tipo_pacote?.banhos_por_ciclo} banhos/ciclo
          </div>
          <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-terracota-border">
            <div className="h-full rounded-full bg-terracota" style={{ width: `${progresso}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-terracota-dark">
            {pacote.banhos_usados_ciclo}/{pacote.tipo_pacote?.banhos_por_ciclo} usados neste ciclo
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[12px] font-extrabold">Próximos banhos</div>
          {proximos.length === 0 ? (
            <div className="text-[11.5px] text-text-muted">Nenhum atendimento futuro agendado.</div>
          ) : (
            <div className="flex max-h-[120px] flex-col gap-[6px] overflow-y-auto">
              {proximos.map((p) => (
                <Card key={p.id} className="flex items-center gap-2 p-2">
                  <div className="rounded-pill bg-blue-tint px-2 py-[2px] text-[10px] font-bold text-blue-dark">
                    {formatBR(p.data)} · {p.hora.slice(0, 5)}
                  </div>
                  <div className="text-[11px] text-text-soft">{TIPO_PROCEDIMENTO_LABEL[p.tipo_procedimento]}</div>
                  <TagPill tone={p.tipo_servico === 'pacote' ? 'blue' : 'neutral'} className="ml-auto">
                    {p.tipo_servico === 'pacote' ? 'Pacote' : 'Avulso'}
                  </TagPill>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 text-[12px] font-extrabold">Histórico de pagamento</div>
          {pagamentos.length === 0 ? (
            <div className="text-[11.5px] text-text-muted">Nenhum pagamento registrado ainda.</div>
          ) : (
            <div className="flex max-h-[120px] flex-col gap-[5px] overflow-y-auto">
              {pagamentos.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-[#f7f4ee] px-2 py-[6px]">
                  <div className="text-[10.5px] text-text-soft">
                    {formatBR(p.data)}
                    {p.forma_pagamento ? ` · ${FORMA_PAGAMENTO_LABEL[p.forma_pagamento]}` : ''}
                  </div>
                  <div className="flex items-center gap-[6px]">
                    <div className="text-[11.5px] font-extrabold">{formatMoney(p.valor ?? 0)}</div>
                    <TagPill tone={p.pagamento_status === 'pago' ? 'blue' : 'terracota'}>
                      {p.pagamento_status === 'pago' ? 'Pago' : 'Pendente'}
                    </TagPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[12px] font-extrabold">Histórico de atendimentos</div>
        <div className="flex flex-col gap-2">
          {historico.length === 0 && <div className="text-[12px] text-text-muted">Nenhum atendimento registrado ainda.</div>}
          {historico.map((h) => {
            const aberto = expandidoId === h.id
            return (
              <Card key={h.id} className="overflow-hidden p-0">
                <button
                  onClick={() => setExpandidoId(aberto ? null : h.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div className="rounded-pill bg-[#f2ede3] px-2 py-[2px] text-[10px] font-bold text-text-muted">
                    {formatBR(h.data)}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-tint text-[7px] font-bold text-blue">
                    {h.fotos.length > 0 ? `${h.fotos.length} foto${h.fotos.length > 1 ? 's' : ''}` : '—'}
                  </div>
                  <div className="flex-1 text-[12px] text-text-soft">{h.anotacao_tutor ?? 'Sem anotação.'}</div>
                  <div className={`text-text-faint transition-transform ${aberto ? 'rotate-180' : ''}`}>▾</div>
                </button>
                {aberto && (
                  <div className="flex flex-col gap-2 border-t border-border-faint p-3">
                    {h.fotos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {h.fotos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11.5px] text-text-muted">Sem fotos neste atendimento.</div>
                    )}
                    <div className="text-[12px] text-text-soft">{h.anotacao_tutor ?? 'Sem anotação para o tutor.'}</div>
                    <div className="flex gap-2">
                      <Link
                        to={`/procedimento/${h.id}`}
                        target="_blank"
                        className="rounded-pill border border-border px-3 py-[6px] text-[11px] font-bold text-text-soft hover:bg-[#f7f4ee]"
                      >
                        Baixar PDF
                      </Link>
                      <button
                        onClick={() => reenviarWhatsapp(h)}
                        className="rounded-pill border border-border px-3 py-[6px] text-[11px] font-bold text-text-soft hover:bg-[#f7f4ee]"
                      >
                        Reenviar no WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      <Link
        to={`/agenda/novo?pet=${pet.id}`}
        className="fixed bottom-5 right-5 flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-4 py-[12px] text-[12.5px] font-bold text-white shadow-lg sm:bottom-8 sm:right-8 sm:px-5 sm:py-[13px] sm:text-[13px]"
      >
        <span className="sm:hidden">+ Agendar</span>
        <span className="hidden sm:inline">+ Novo agendamento</span>
      </Link>
    </div>
  )
}
