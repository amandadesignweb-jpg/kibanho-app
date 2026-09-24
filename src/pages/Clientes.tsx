import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'

interface PetLinha {
  id: string
  nome: string
  especie: string
  foto_url: string | null
  tutor: { nome: string; telefone: string | null } | null
}

function nomeArquivoSeguro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-]/g, '_')
}

export function Clientes() {
  const [pets, setPets] = useState<PetLinha[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('pets')
      .select('id, nome, especie, foto_url, tutor:tutores(nome, telefone)')
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

  async function criarPet(nomePet: string, especie: string, nomeTutor: string, telefone: string, foto: File | null) {
    setCriando(true)
    setErro(null)
    const { data: tutor, error: erroTutor } = await supabase
      .from('tutores')
      .insert({ nome: nomeTutor, telefone: telefone || null })
      .select('id')
      .single()
    if (erroTutor || !tutor) {
      setErro('Não foi possível salvar o tutor.')
      setCriando(false)
      return
    }
    const { data: pet, error: erroPet } = await supabase
      .from('pets')
      .insert({ tutor_id: tutor.id, nome: nomePet, especie })
      .select('id')
      .single()
    if (erroPet || !pet) {
      setCriando(false)
      setErro('Não foi possível salvar o pet.')
      return
    }

    // Foto é opcional — se falhar o upload, o pet já foi salvo e não bloqueia o cadastro.
    if (foto) {
      const path = `pets/${pet.id}-${Date.now()}-${nomeArquivoSeguro(foto.name)}`
      const { error: erroUpload } = await supabase.storage.from('fotos-kibanho').upload(path, foto)
      if (!erroUpload) {
        const { data: pub } = supabase.storage.from('fotos-kibanho').getPublicUrl(path)
        await supabase.from('pets').update({ foto_url: pub.publicUrl }).eq('id', pet.id)
      }
    }

    setCriando(false)
    setModalAberto(false)
    navigate(`/clientes/${pet.id}`)
  }

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <div className="text-[19px] font-extrabold">Clientes &amp; Pets</div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <input
          placeholder="Buscar pet ou tutor…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-card px-[14px] py-[9px] text-[13px] outline-none focus:border-blue"
        />
        <button
          onClick={() => { setErro(null); setModalAberto(true) }}
          className="whitespace-nowrap rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[18px] py-[9px] text-[13px] font-bold text-white"
        >
          + Novo pet
        </button>
      </div>

      {loading ? (
        <div className="text-text-muted">Carregando…</div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-4 gap-2.5 overflow-y-auto pb-2">
          {filtrados.map((p) => (
            <Link key={p.id} to={`/clientes/${p.id}`}>
              <Card className="flex items-center gap-2.5 p-3 hover:shadow-lg">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-tint text-[8px] font-bold text-blue">
                    IMG
                  </div>
                )}
                <div>
                  <div className="text-[12.5px] font-bold">{p.nome}</div>
                  <div className="text-[11px] text-text-muted">{p.tutor?.nome ?? '—'}</div>
                </div>
              </Card>
            </Link>
          ))}
          {filtrados.length === 0 && (
            <div className="col-span-4 text-[13px] text-text-muted">Nenhum pet encontrado.</div>
          )}
        </div>
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <NovoPetFormulario onCreate={criarPet} loading={criando} erro={erro} onCancel={() => setModalAberto(false)} />
      </Modal>
    </div>
  )
}

function NovoPetFormulario({
  onCreate,
  onCancel,
  loading,
  erro,
}: {
  onCreate: (pet: string, especie: string, tutor: string, telefone: string, foto: File | null) => void
  onCancel: () => void
  loading: boolean
  erro: string | null
}) {
  const [pet, setPet] = useState('')
  const [especie, setEspecie] = useState('cão')
  const [tutor, setTutor] = useState('')
  const [telefone, setTelefone] = useState('')
  const [foto, setFoto] = useState<File | null>(null)

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-[19px] font-extrabold">Cadastrar novo pet</div>
        <button onClick={onCancel} className="text-text-muted">✕</button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="flex h-[58px] w-[58px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-blue bg-blue-tint text-[9px] font-bold text-blue">
            {foto ? (
              <img src={URL.createObjectURL(foto)} alt="" className="h-full w-full object-cover" />
            ) : (
              '+ Foto'
            )}
            <input type="file" accept="image/*" hidden onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </label>
          <div className="text-[11.5px] text-text-muted">Foto do pet (opcional)</div>
        </div>
        <div className="flex gap-3">
          <div className="flex-[1.4]">
            <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Nome do pet</div>
            <input
              value={pet}
              onChange={(e) => setPet(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
            />
          </div>
          <div className="flex-1">
            <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Espécie</div>
            <select
              value={especie}
              onChange={(e) => setEspecie(e.target.value)}
              className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
            >
              <option value="cão">Cão</option>
              <option value="gato">Gato</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
        <div>
          <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Nome do tutor</div>
          <input
            value={tutor}
            onChange={(e) => setTutor(e.target.value)}
            className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
          />
        </div>
        <div>
          <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Telefone / WhatsApp</div>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 90000-0000"
            className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
          />
        </div>
      </div>

      {erro && <div className="text-[12.5px] font-semibold text-terracota-strong">{erro}</div>}

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-pill border border-border px-5 py-[12px] text-[13px] font-bold text-text-soft"
        >
          Cancelar
        </button>
        <button
          disabled={!pet || !tutor || loading}
          onClick={() => onCreate(pet, especie, tutor, telefone, foto)}
          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[20px] py-[12px] text-[13px] font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Salvando…' : 'Salvar pet'}
        </button>
      </div>
    </>
  )
}
