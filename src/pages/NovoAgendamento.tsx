import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBR } from '../lib/date'
import { TIPO_PROCEDIMENTO_LABEL, TIPO_PROCEDIMENTO_OPCOES } from '../lib/procedimentos'
import clsx from '../lib/clsx'
import type { TipoProcedimento } from '../types/database'

interface PetOpcao {
  id: string
  nome: string
  tutor: { nome: string } | null
}

interface TipoPacote {
  id: string
  nome: string
  valor: number
}

const HORARIOS = ['09:00', '10:00', '11:00', '11:30', '14:00', '15:00', '15:30', '16:00', '16:30', '17:00']
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function NovoAgendamento() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const petPreSelecionado = params.get('pet')

  const [pets, setPets] = useState<PetOpcao[]>([])
  const [petId, setPetId] = useState(petPreSelecionado ?? '')
  const [busca, setBusca] = useState('')

  const [tiposPacote, setTiposPacote] = useState<TipoPacote[]>([])
  const [pacoteAtivoId, setPacoteAtivoId] = useState<string | null>(null)
  const [tipoServico, setTipoServico] = useState<'avulso' | 'pacote'>('avulso')
  const [tipoProcedimento, setTipoProcedimento] = useState<TipoProcedimento>('banho')

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  }), [])

  const [data, setData] = useState(toISO(dias[0]))
  const [hora, setHora] = useState('')
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
  const [pagamentoPendente, setPagamentoPendente] = useState(false)
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
      .select('id, nome, valor')
      .then(({ data }) => setTiposPacote((data as TipoPacote[]) ?? []))
  }, [])

  useEffect(() => {
    if (!petId) {
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
  }, [petId])

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

  const avulso = tiposPacote.find((t) => t.nome === 'Avulso')
  const petSelecionado = pets.find((p) => p.id === petId)

  async function salvar() {
    if (!petId) {
      setErro('Selecione um pet.')
      return
    }
    if (!hora) {
      setErro('Selecione um horário.')
      return
    }
    setSalvando(true)
    setErro(null)

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .insert({
        pet_id: petId,
        tipo_servico: tipoServico,
        tipo_procedimento: tipoProcedimento,
        data,
        hora,
        status: 'confirmado',
        pagamento_status: pagamentoPendente ? 'pendente' : 'pago',
        valor: tipoServico === 'avulso' ? avulso?.valor ?? null : null,
      })
      .select('id')
      .single()

    setSalvando(false)
    if (error || !agendamento) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }
    navigate('/agenda')
  }

  const petsFiltrados = pets.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.tutor?.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <div className="text-[20px] font-extrabold">Novo agendamento</div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Pet</div>
        <input
          placeholder="Buscar pet ou tutor…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-2 w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
        />
        <div className="flex flex-wrap gap-2">
          {petsFiltrados.map((p) => (
            <button
              key={p.id}
              onClick={() => setPetId(p.id)}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-2xl border-[1.5px] px-4 py-[10px]',
                petId === p.id ? 'border-blue bg-blue-tint' : 'border-border-soft'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-tint text-[9px] font-bold text-blue">
                IMG
              </div>
              <div className="text-[12px] font-bold">{p.nome}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Serviço</div>
        <div className="flex gap-2">
          <button
            onClick={() => setTipoServico('avulso')}
            className={clsx(
              'flex-1 rounded-2xl border-[1.5px] py-[11px] text-center text-[12.5px] font-bold',
              tipoServico === 'avulso'
                ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                : 'border-border-soft text-text-soft'
            )}
          >
            Avulso {avulso ? `(R$ ${avulso.valor.toFixed(0)})` : ''}
          </button>
          <button
            disabled={!pacoteAtivoId}
            onClick={() => setTipoServico('pacote')}
            className={clsx(
              'flex-1 rounded-2xl border-[1.5px] py-[11px] text-center text-[12.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40',
              tipoServico === 'pacote'
                ? 'border-transparent bg-gradient-to-br from-blue to-blue-dark text-white'
                : 'border-border-soft text-text-soft'
            )}
          >
            {pacoteAtivoId ? 'Usar pacote ativo' : 'Sem pacote ativo'}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Procedimento</div>
        <div className="flex gap-2">
          {TIPO_PROCEDIMENTO_OPCOES.map((op) => (
            <button
              key={op}
              onClick={() => setTipoProcedimento(op)}
              className={clsx(
                'flex-1 rounded-2xl border-[1.5px] py-[11px] text-center text-[12.5px] font-bold',
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

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Data e horário</div>
        <div className="mb-3 flex gap-[6px]">
          {dias.map((d) => {
            const iso = toISO(d)
            const isSelected = iso === data
            return (
              <button
                key={iso}
                onClick={() => setData(iso)}
                className={clsx(
                  'flex-1 rounded-xl py-[9px] text-center',
                  isSelected ? 'bg-gradient-to-br from-blue to-blue-dark text-white' : 'bg-[#f7f4ee]'
                )}
              >
                <div className={clsx('text-[9px] font-bold', isSelected ? 'text-white/75' : 'text-text-faint')}>
                  {DIAS_SEMANA[d.getDay()]}
                </div>
                <div className="mt-[2px] text-[13px] font-extrabold">{d.getDate()}</div>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {HORARIOS.map((h) => {
            const ocupado = horariosOcupados.includes(h)
            const isSelected = h === hora
            return (
              <button
                key={h}
                disabled={ocupado}
                onClick={() => setHora(h)}
                className={clsx(
                  'rounded-[11px] border-[1.5px] py-[9px] text-center text-[12px] font-bold',
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

      {petSelecionado && hora && (
        <div className="flex items-center gap-[10px] rounded-2xl bg-[#f7f4ee] px-4 py-3">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-blue-tint text-blue-dark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <div className="text-[12.5px]">
            <b>{petSelecionado.nome}</b> · {tipoServico === 'pacote' ? 'Pacote ativo' : 'Avulso'} ·{' '}
            {DIAS_SEMANA[new Date(data + 'T00:00:00').getDay()]}, {formatBR(data)} às <b>{hora}</b>
          </div>
        </div>
      )}

      <label className="flex items-center gap-[8px] text-[12.5px] font-semibold text-text-soft">
        <input
          type="checkbox"
          checked={pagamentoPendente}
          onChange={(e) => setPagamentoPendente(e.target.checked)}
        />
        Cobrar depois (pagamento pendente)
      </label>

      {erro && <div className="text-[12.5px] font-semibold text-terracota-strong">{erro}</div>}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-pill border border-border px-5 py-[13px] text-[13px] font-bold text-text-soft"
        >
          Cancelar
        </button>
        <button
          onClick={salvar}
          disabled={salvando}
          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[22px] py-[13px] text-[13px] font-bold text-white disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Confirmar agendamento'}
        </button>
      </div>
    </div>
  )
}
