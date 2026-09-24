import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/date'
import clsx from '../lib/clsx'

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

  const [data, setData] = useState(todayISO())
  const [hora, setHora] = useState('09:00')
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

  const avulso = tiposPacote.find((t) => t.nome === 'Avulso')

  async function salvar() {
    if (!petId) {
      setErro('Selecione um pet.')
      return
    }
    setSalvando(true)
    setErro(null)

    const { data: agendamento, error } = await supabase
      .from('agendamentos')
      .insert({
        pet_id: petId,
        tipo_servico: tipoServico,
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

      <div className="flex gap-3">
        <div className="flex-1">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Data</div>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
          />
        </div>
        <div className="flex-1">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Horário</div>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
          />
        </div>
      </div>

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
