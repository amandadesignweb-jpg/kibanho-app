import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'

interface PetLinha {
  id: string
  nome: string
  especie: string
  tutor: { nome: string; telefone: string | null } | null
}

export function Clientes() {
  const [pets, setPets] = useState<PetLinha[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('pets')
      .select('id, nome, especie, tutor:tutores(nome, telefone)')
      .order('nome', { ascending: true })
    setPets((data as unknown as PetLinha[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtrados = pets.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.tutor?.nome.toLowerCase().includes(busca.toLowerCase())
  )

  async function criarPetRapido(nomePet: string, nomeTutor: string, telefone: string) {
    setCriando(true)
    const { data: tutor } = await supabase
      .from('tutores')
      .insert({ nome: nomeTutor, telefone })
      .select('id')
      .single()
    if (tutor) {
      const { data: pet } = await supabase
        .from('pets')
        .insert({ tutor_id: tutor.id, nome: nomePet })
        .select('id')
        .single()
      if (pet) navigate(`/clientes/${pet.id}`)
    }
    setCriando(false)
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[23px] font-extrabold">Clientes &amp; Pets</div>
      </div>

      <div className="flex items-center gap-3">
        <input
          placeholder="Buscar pet ou tutor…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-card px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
        />
        <NovoPetForm onCreate={criarPetRapido} loading={criando} />
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <div className="grid grid-cols-3 gap-[14px]">
          {filtrados.map((p) => (
            <Link key={p.id} to={`/clientes/${p.id}`}>
              <Card className="flex items-center gap-3 p-4 hover:shadow-lg">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-blue-tint text-[9px] font-bold text-blue">
                  IMG
                </div>
                <div>
                  <div className="text-[13.5px] font-bold">{p.nome}</div>
                  <div className="text-[11.5px] text-text-muted">{p.tutor?.nome ?? '—'}</div>
                </div>
              </Card>
            </Link>
          ))}
          {filtrados.length === 0 && (
            <div className="col-span-3 text-[13px] text-text-muted">Nenhum pet encontrado.</div>
          )}
        </div>
      )}
    </div>
  )
}

function NovoPetForm({
  onCreate,
  loading,
}: {
  onCreate: (pet: string, tutor: string, telefone: string) => void
  loading: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pet, setPet] = useState('')
  const [tutor, setTutor] = useState('')
  const [telefone, setTelefone] = useState('')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[18px] py-[11px] text-[13px] font-bold text-white"
      >
        + Novo pet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
      <input placeholder="Nome do pet" value={pet} onChange={(e) => setPet(e.target.value)} className="w-32 rounded-lg border border-border px-2 py-[7px] text-[12px] outline-none" />
      <input placeholder="Nome do tutor" value={tutor} onChange={(e) => setTutor(e.target.value)} className="w-32 rounded-lg border border-border px-2 py-[7px] text-[12px] outline-none" />
      <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-28 rounded-lg border border-border px-2 py-[7px] text-[12px] outline-none" />
      <button
        disabled={!pet || !tutor || loading}
        onClick={() => onCreate(pet, tutor, telefone)}
        className="rounded-lg bg-gradient-to-br from-blue to-blue-dark px-3 py-[7px] text-[11px] font-bold text-white disabled:opacity-50"
      >
        Salvar
      </button>
    </div>
  )
}
