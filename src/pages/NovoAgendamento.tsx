import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBR } from '../lib/date'
import { TIPO_PROCEDIMENTO_LABEL, TIPO_PROCEDIMENTO_OPCOES } from '../lib/procedimentos'
import { FORMA_PAGAMENTO_LABEL, FORMA_PAGAMENTO_OPCOES } from '../lib/pagamento'
import clsx from '../lib/clsx'
import type { FormaPagamento, TipoProcedimento } from '../types/database'

interface PetOpcao {
  id: string
  nome: string
  tutor: { nome: string } | null
}

interface TipoPacote {
  id: string
  nome: string
  valor: number
  banhos_por_ciclo: number
}

interface Sessao {
  data: string
  hora: string
}

type TipoServicoUI = 'avulso' | 'pacote_ativo' | 'pacote_mensal' | 'pacote_quinzenal'

const HORARIOS = ['09:00', '10:00', '11:00', '11:30', '14:00', '15:00', '15:30', '16:00', '16:30', '17:00']
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const INTERVALO_DIAS: Record<'pacote_mensal' | 'pacote_quinzenal', number> = {
  pacote_mensal: 7,
  pacote_quinzenal: 15,
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nomeArquivoSeguro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
}

export function NovoAgendamento() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const petPreSelecionado = params.get('pet')

  const [modoPet, setModoPet] = useState<'existente' | 'novo'>('existente')
  const [pets, setPets] = useState<PetOpcao[]>([])
  const [petId, setPetId] = useState(petPreSelecionado ?? '')
  const [busca, setBusca] = useState('')

  const [novoPetNome, setNovoPetNome] = useState('')
  const [novoPetEspecie, setNovoPetEspecie] = useState('cão')
  const [novoPetFoto, setNovoPetFoto] = useState<File | null>(null)
  const [novoTutorNome, setNovoTutorNome] = useState('')
  const [novoTutorTelefone, setNovoTutorTelefone] = useState('')

  const [tiposPacote, setTiposPacote] = useState<TipoPacote[]>([])
  const [pacoteAtivoId, setPacoteAtivoId] = useState<string | null>(null)
  const [tipoServico, setTipoServico] = useState<TipoServicoUI>('avulso')
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimento>('banho')

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  }), [])

  const [data, setData] = useState(toISO(dias[0]))
  const [hora, setHora] = useState('')
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [ocupadosPorData, setOcupadosPorData] = useState<Record<string, string[]>>({})

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null)
  const [cobrarDepois, setCobrarDepois] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('pets')
      .select('id, nome, tutor:tutores(nome)')
      .order('nome', { ascending: true })
      .then(({ data }) => setPets((data as unknown as PetOpcao[]) ?? []))
    supabase
      .from('tipos_pacote')
      .select('id, nome, valor, banhos_por_ciclo')
      .then(({ data }) => setTiposPacote((data as TipoPacote[]) ?? []))
  }, [])

  useEffect(() => {
    if (modoPet !== 'existente' || !petId) {
      setPacoteAtivoId(null)
      return
    }
    supabase
      .from('pacotes_pet')
      .select('id')
      .eq('pet_id', petId)
      .eq('status', 'ativo')
      .maybeSingle()
      .then(({ data }) => setPacoteAtivoId((data as { id: string } | null)?.id ?? null))
  }, [petId, modoPet])

  // Pet novo nunca tem pacote ativo — sempre libera avulso/mensal/quinzenal.
  useEffect(() => {
    if (modoPet === 'novo') setPacoteAtivoId(null)
  }, [modoPet])

  // Se o serviço atual deixou de fazer sentido (ex.: pet passou a ter pacote ativo), corrige.
  useEffect(() => {
    if (tipoServico === 'pacote_ativo' && !pacoteAtivoId) setTipoServico('avulso')
    if ((tipoServico === 'pacote_mensal' || tipoServico === 'pacote_quinzenal') && pacoteAtivoId) {
      setTipoServico('pacote_ativo')
    }
  }, [pacoteAtivoId, tipoServico])

  // Horários ocupados no dia escolhido para a primeira sessão (avulso / pacote ativo / início do pacote).
  useEffect(() => {
    supabase
      .from('agendamentos')
      .select('hora')
      .eq('data', data)
      .neq('status', 'cancelado')
      .then(({ data: rows }) => {
        setHorariosOcupados(((rows as { hora: string }[] | null) ?? []).map((r) => r.hora.slice(0, 5)))
        setHora('')
      })
  }, [data])

  // Gera as sessões futuras quando o serviço é um pacote novo (mensal/quinzenal) e já há hora escolhida.
  useEffect(() => {
    if (tipoServico !== 'pacote_mensal' && tipoServico !== 'pacote_quinzenal') {
      setSessoes([])
      return
    }
    if (!hora) {
      setSessoes([])
      return
    }
    const nomeTipo = tipoServico === 'pacote_mensal' ? 'Mensal' : 'Quinzenal'
    const tipo = tiposPacote.find((t) => t.nome === nomeTipo)
    const n = tipo?.banhos_por_ciclo ?? (tipoServico === 'pacote_mensal' ? 4 : 2)
    const intervalo = INTERVALO_DIAS[tipoServico]
    const base = new Date(data + 'T00:00:00')
    const novas: Sessao[] = Array.from({ length: n }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i * intervalo)
      return { data: toISO(d), hora }
    })
    setSessoes(novas)
  }, [tipoServico, data, hora, tiposPacote])

  // Checa conflitos de horário para as datas das sessões geradas (ou editadas manualmente).
  useEffect(() => {
    if (sessoes.length === 0) {
      setOcupadosPorData({})
      return
    }
    const datasUnicas = Array.from(new Set(sessoes.map((s) => s.data)))
    supabase
      .from('agendamentos')
      .select('data, hora')
      .in('data', datasUnicas)
      .neq('status', 'cancelado')
      .then(({ data: rows }) => {
        const mapa: Record<string, string[]> = {}
        for (const r of (rows as { data: string; hora: string }[] | null) ?? []) {
          const h = r.hora.slice(0, 5)
          mapa[r.data] = [...(mapa[r.data] ?? []), h]
        }
        setOcupadosPorData(mapa)
      })
  }, [JSON.stringify(sessoes.map((s) => s.data))]) // eslint-disable-line react-hooks/exhaustive-deps

  const avulso = tiposPacote.find((t) => t.nome === 'Avulso')
  const petSelecionado = pets.find((p) => p.id === petId)
  const nomePetConfirmacao = modoPet === 'novo' ? novoPetNome : petSelecionado?.nome
  const ehPacoteNovo = tipoServico === 'pacote_mensal' || tipoServico === 'pacote_quinzenal'
  const exigePagamentoAgora = tipoServico === 'avulso' || ehPacoteNovo

  function atualizarSessao(i: number, campo: 'data' | 'hora', valor: string) {
    setSessoes((s) => s.map((sess, idx) => (idx === i ? { ...sess, [campo]: valor } : sess)))
  }

  function removerSessao(i: number) {
    setSessoes((s) => s.filter((_, idx) => idx !== i))
  }

  async function salvar() {
    if (modoPet === 'existente' && !petId) {
      setErro('Selecione um pet.')
      return
    }
    if (modoPet === 'novo' && (!novoPetNome || !novoTutorNome)) {
      setErro('Preencha o nome do pet e do tutor.')
      return
    }
    if (!hora) {
      setErro(ehPacoteNovo ? 'Selecione o horário do primeiro atendimento.' : 'Selecione um horário.')
      return
    }
    if (ehPacoteNovo && sessoes.length === 0) {
      setErro('Não foi possível gerar os atendimentos do pacote.')
      return
    }
    if (exigePagamentoAgora && !cobrarDepois && !formaPagamento) {
      setErro('Escolha a forma de pagamento ou marque "Cobrar depois".')
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      let petIdFinal = petId
      let nomePetFinal = petSelecionado?.nome ?? ''
      let nomeTutorFinal = petSelecionado?.tutor?.nome ?? ''

      if (modoPet === 'novo') {
        const { data: tutor, error: erroTutor } = await supabase
          .from('tutores')
          .insert({ nome: novoTutorNome, telefone: novoTutorTelefone || null })
          .select('id')
          .single()
        if (erroTutor || !tutor) throw new Error('Não foi possível cadastrar o tutor.')

        const { data: pet, error: erroPet } = await supabase
          .from('pets')
          .insert({ tutor_id: tutor.id, nome: novoPetNome, especie: novoPetEspecie })
          .select('id')
          .single()
        if (erroPet || !pet) throw new Error('Não foi possível cadastrar o pet.')

        petIdFinal = pet.id
        nomePetFinal = novoPetNome
        nomeTutorFinal = novoTutorNome

        // Foto é opcional — se falhar o upload, o pet já foi salvo e não bloqueia o agendamento.
        if (novoPetFoto) {
          const path = `pets/${pet.id}-${Date.now()}-${nomeArquivoSeguro(novoPetFoto.name)}`
          const { error: erroUpload } = await supabase.storage.from('fotos-kibanho').upload(path, novoPetFoto)
          if (!erroUpload) {
            const { data: pub } = supabase.storage.from('fotos-kibanho').getPublicUrl(path)
            await supabase.from('pets').update({ foto_url: pub.publicUrl }).eq('id', pet.id)
          }
        }
      }

      if (tipoServico === 'avulso') {
        const { error } = await supabase.from('agendamentos').insert({
          pet_id: petIdFinal,
          tipo_servico: 'avulso',
          tipo_procedimento: tipoProcedimento,
          data,
          hora,
          status: 'confirmado',
          pagamento_status: cobrarDepois ? 'pendente' : 'pago',
          forma_pagamento: cobrarDepois ? null : formaPagamento,
          valor: avulso?.valor ?? null,
        })
        if (error) throw new Error('Não foi possível salvar o agendamento.')
      } else if (tipoServico === 'pacote_ativo') {
        const { error } = await supabase.from('agendamentos').insert({
          pet_id: petIdFinal,
          tipo_servico: 'pacote',
          tipo_procedimento: tipoProcedimento,
          data,
          hora,
          status: 'confirmado',
          pagamento_status: 'pago',
          forma_pagamento: null,
          valor: null,
        })
        if (error) throw new Error('Não foi possível salvar o agendamento.')
      } else {
        // Pacote novo (mensal/quinzenal): cria o pacote, lança o pagamento e agenda as sessões.
        const nomeTipo = tipoServico === 'pacote_mensal' ? 'Mensal' : 'Quinzenal'
        const tipoPacote = tiposPacote.find((t) => t.nome === nomeTipo)
        if (!tipoPacote) throw new Error(`Tipo de pacote "${nomeTipo}" não encontrado em Configurações.`)

        const { data: novoPacote, error: erroPacote } = await supabase
          .from('pacotes_pet')
          .insert({ pet_id: petIdFinal, tipo_pacote_id: tipoPacote.id, status: 'ativo', banhos_usados_ciclo: 0 })
          .select('id')
          .single()
        if (erroPacote || !novoPacote) throw new Error('Não foi possível criar o pacote.')

        const { error: erroLancamento } = await supabase.from('financeiro_lancamentos').insert({
          tipo: 'entrada',
          descricao: `Pacote ${nomeTipo} · ${nomePetFinal} · ${nomeTutorFinal}`,
          categoria: 'Pacote',
          valor: tipoPacote.valor,
          status_pagamento: cobrarDepois ? 'pendente' : 'pago',
          forma_pagamento: cobrarDepois ? null : formaPagamento,
        })
        if (erroLancamento) throw new Error('Pacote criado, mas não foi possível lançar o pagamento no financeiro.')

        const { error: erroSessoes } = await supabase.from('agendamentos').insert(
          sessoes.map((s) => ({
            pet_id: petIdFinal,
            tipo_servico: 'pacote' as const,
            tipo_procedimento: tipoProcedimento,
            data: s.data,
            hora: s.hora,
            status: 'confirmado' as const,
            pagamento_status: 'pago' as const,
            forma_pagamento: null,
            valor: null,
          }))
        )
        if (erroSessoes) throw new Error('Pacote criado, mas não foi possível agendar as sessões. Agende-as manualmente na Agenda.')
      }

      navigate('/agenda')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const petsFiltrados = pets.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.tutor?.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1040px] flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <div className="text-[18px] font-extrabold">Novo agendamento</div>
        <button onClick={() => navigate(-1)} className="text-text-muted">✕</button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-5">
        {/* Coluna esquerda: pet, serviço, procedimento */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <div>
            <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Pet</div>
            <div className="mb-2 flex gap-2">
              <button
                onClick={() => setModoPet('existente')}
                className={clsx(
                  'rounded-pill border px-3 py-[6px] text-[12px] font-bold',
                  modoPet === 'existente' ? 'border-ink bg-ink text-[#fdfbf8]' : 'border-border text-text-soft'
                )}
              >
                Pet cadastrado
              </button>
              <button
                onClick={() => setModoPet('novo')}
                className={clsx(
                  'rounded-pill border px-3 py-[6px] text-[12px] font-bold',
                  modoPet === 'novo' ? 'border-ink bg-ink text-[#fdfbf8]' : 'border-border text-text-soft'
                )}
              >
                Cadastrar novo pet
              </button>
            </div>

            {modoPet === 'existente' ? (
              <>
                <input
                  placeholder="Buscar pet ou tutor…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="mb-2 w-full rounded-xl border border-border px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                />
                <div className="flex flex-wrap gap-[6px]">
                  {petsFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPetId(p.id)}
                      className={clsx(
                        'flex flex-col items-center gap-1 rounded-2xl border-[1.5px] px-3 py-2',
                        petId === p.id ? 'border-blue bg-blue-tint' : 'border-border-soft'
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-tint text-[8px] font-bold text-blue">
                        IMG
                      </div>
                      <div className="text-[11.5px] font-bold">{p.nome}</div>
                    </button>
                  ))}
                  {petsFiltrados.length === 0 && (
                    <div className="text-[12px] text-text-muted">Nenhum pet encontrado.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 rounded-2xl bg-[#f7f4ee] p-3">
                <div className="flex items-center gap-2">
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-blue bg-blue-tint text-[8px] font-bold text-blue">
                    {novoPetFoto ? (
                      <img src={URL.createObjectURL(novoPetFoto)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      '+ Foto'
                    )}
                    <input type="file" accept="image/*" hidden onChange={(e) => setNovoPetFoto(e.target.files?.[0] ?? null)} />
                  </label>
                  <div className="text-[11px] text-text-muted">Foto do pet (opcional)</div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-[1.4]">
                    <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Nome do pet</div>
                    <input
                      value={novoPetNome}
                      onChange={(e) => setNovoPetNome(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Espécie</div>
                    <select
                      value={novoPetEspecie}
                      onChange={(e) => setNovoPetEspecie(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                    >
                      <option value="cão">Cão</option>
                      <option value="gato">Gato</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Nome do tutor</div>
                    <input
                      value={novoTutorNome}
                      onChange={(e) => setNovoTutorNome(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Telefone</div>
                    <input
                      value={novoTutorTelefone}
                      onChange={(e) => setNovoTutorTelefone(e.target.value)}
                      placeholder="(11) 90000-0000"
                      className="w-full rounded-xl border border-border bg-card px-3 py-[8px] text-[12.5px] outline-none focus:border-blue"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Serviço</div>
            <div className="flex gap-2">
              <button
                onClick={() => setTipoServico('avulso')}
                className={clsx(
                  'flex-1 rounded-2xl border-[1.5px] py-[8px] text-center text-[12px] font-bold',
                  tipoServico === 'avulso'
                    ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                    : 'border-border-soft text-text-soft'
                )}
              >
                Avulso {avulso ? `(R$ ${avulso.valor.toFixed(0)})` : ''}
              </button>
              {pacoteAtivoId ? (
                <button
                  onClick={() => setTipoServico('pacote_ativo')}
                  className={clsx(
                    'flex-1 rounded-2xl border-[1.5px] py-[8px] text-center text-[12px] font-bold',
                    tipoServico === 'pacote_ativo'
                      ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                      : 'border-border-soft text-text-soft'
                  )}
                >
                  Usar pacote ativo
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setTipoServico('pacote_mensal')}
                    className={clsx(
                      'flex-1 rounded-2xl border-[1.5px] py-[8px] text-center text-[12px] font-bold',
                      tipoServico === 'pacote_mensal'
                        ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                        : 'border-border-soft text-text-soft'
                    )}
                  >
                    Pacote mensal
                  </button>
                  <button
                    onClick={() => setTipoServico('pacote_quinzenal')}
                    className={clsx(
                      'flex-1 rounded-2xl border-[1.5px] py-[8px] text-center text-[12px] font-bold',
                      tipoServico === 'pacote_quinzenal'
                        ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                        : 'border-border-soft text-text-soft'
                    )}
                  >
                    Pacote quinzenal
                  </button>
                </>
              )}
            </div>
            {ehPacoteNovo && (
              <div className="mt-1 text-[11px] text-text-muted">
                Cria o pacote, agenda automaticamente os próximos atendimentos e cobra o pacote inteiro agora.
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">Procedimento</div>
            <div className="flex gap-2">
              {TIPO_PROCEDIMENTO_OPCOES.map((op) => (
                <button
                  key={op}
                  onClick={() => setTipoProcedimento(op)}
                  className={clsx(
                    'flex-1 rounded-2xl border-[1.5px] py-[8px] text-center text-[12px] font-bold',
                    tipoProcedimento === op
                      ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                      : 'border-border-soft text-text-soft'
                  )}
                >
                  {TIPO_PROCEDIMENTO_LABEL[op]}
                </button>
              ))}
            </div>
          </div>

          {exigePagamentoAgora && (
            <div>
              <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">
                Pagamento {ehPacoteNovo ? '(pacote inteiro)' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {FORMA_PAGAMENTO_OPCOES.map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFormaPagamento(f); setCobrarDepois(false) }}
                    disabled={cobrarDepois}
                    className={clsx(
                      'flex-1 rounded-2xl border-[1.5px] py-[7px] text-center text-[12px] font-bold disabled:opacity-40',
                      formaPagamento === f && !cobrarDepois
                        ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                        : 'border-border-soft text-text-soft'
                    )}
                  >
                    {FORMA_PAGAMENTO_LABEL[f]}
                  </button>
                ))}
              </div>
              <label className="mt-1 flex items-center gap-[8px] text-[12px] font-semibold text-text-soft">
                <input
                  type="checkbox"
                  checked={cobrarDepois}
                  onChange={(e) => { setCobrarDepois(e.target.checked); if (e.target.checked) setFormaPagamento(null) }}
                />
                Cobrar depois (pagamento pendente)
              </label>
            </div>
          )}
        </div>

        {/* Coluna direita: data/horário e sessões do pacote */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <div>
            <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">
              {ehPacoteNovo ? 'Data e horário do 1º atendimento' : 'Data e horário'}
            </div>
            <div className="mb-2 flex gap-[5px]">
              {dias.map((d) => {
                const iso = toISO(d)
                const isSelected = iso === data
                return (
                  <button
                    key={iso}
                    onClick={() => setData(iso)}
                    className={clsx(
                      'flex-1 rounded-xl py-[7px] text-center',
                      isSelected ? 'bg-gradient-to-br from-blue to-blue-dark text-white' : 'bg-[#f7f4ee]'
                    )}
                  >
                    <div className={clsx('text-[8.5px] font-bold', isSelected ? 'text-white/75' : 'text-text-faint')}>
                      {DIAS_SEMANA[d.getDay()]}
                    </div>
                    <div className="mt-[1px] text-[12px] font-extrabold">{d.getDate()}</div>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-5 gap-[6px]">
              {HORARIOS.map((h) => {
                const ocupado = horariosOcupados.includes(h)
                const isSelected = h === hora
                return (
                  <button
                    key={h}
                    disabled={ocupado}
                    onClick={() => setHora(h)}
                    className={clsx(
                      'rounded-[10px] border-[1.5px] py-[7px] text-center text-[11.5px] font-bold',
                      ocupado
                        ? 'cursor-not-allowed border-dashed border-border-soft text-text-faint'
                        : isSelected
                          ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                          : 'border-border-soft text-ink hover:border-blue'
                    )}
                  >
                    {h}
                  </button>
                )
              })}
            </div>
          </div>

          {ehPacoteNovo && sessoes.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-wider text-text-faint">
                Próximos atendimentos ({sessoes.length})
              </div>
              <div className="flex flex-col gap-[6px] overflow-y-auto">
                {sessoes.map((s, i) => {
                  const ocupado = i > 0 && (ocupadosPorData[s.data] ?? []).includes(s.hora)
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-xl bg-[#f7f4ee] px-2 py-[6px]">
                      <div className="w-4 text-center text-[10.5px] font-extrabold text-text-faint">{i + 1}</div>
                      <input
                        type="date"
                        value={s.data}
                        onChange={(e) => atualizarSessao(i, 'data', e.target.value)}
                        className="rounded-lg border border-border bg-card px-[6px] py-[4px] text-[11px] outline-none focus:border-blue"
                      />
                      <input
                        type="time"
                        value={s.hora}
                        onChange={(e) => atualizarSessao(i, 'hora', e.target.value)}
                        className="rounded-lg border border-border bg-card px-[6px] py-[4px] text-[11px] outline-none focus:border-blue"
                      />
                      {ocupado && (
                        <span className="text-[10px] font-bold text-terracota-strong">Ocupado</span>
                      )}
                      <button
                        onClick={() => removerSessao(i)}
                        className="ml-auto text-[10.5px] font-bold text-text-faint hover:text-terracota-strong"
                      >
                        Remover
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0">
        {nomePetConfirmacao && hora && (
          <div className="mb-2 flex items-center gap-[10px] rounded-2xl bg-[#f7f4ee] px-4 py-2">
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] bg-blue-tint text-blue-dark">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18" />
              </svg>
            </div>
            <div className="text-[12px]">
              <b>{nomePetConfirmacao}</b> ·{' '}
              {tipoServico === 'avulso' ? 'Avulso' : tipoServico === 'pacote_ativo' ? 'Pacote ativo' : tipoServico === 'pacote_mensal' ? 'Pacote mensal (novo)' : 'Pacote quinzenal (novo)'}
              {' '}· {DIAS_SEMANA[new Date(data + 'T00:00:00').getDay()]}, {formatBR(data)} às <b>{hora}</b>
              {ehPacoteNovo && sessoes.length > 0 && ` · +${sessoes.length - 1} atendimento${sessoes.length - 1 !== 1 ? 's' : ''} agendados`}
            </div>
          </div>
        )}

        {erro && <div className="mb-2 text-[12px] font-semibold text-terracota-strong">{erro}</div>}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-pill border border-border px-5 py-[11px] text-[13px] font-bold text-text-soft"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[22px] py-[11px] text-[13px] font-bold text-white disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Confirmar agendamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
