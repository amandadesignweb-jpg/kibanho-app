import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { formatBR } from '../lib/date'

interface PetDetalhe {
  id: string
  nome: string
  especie: string
  raca: string | null
  observacoes: string | null
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

export function FichaPet() {
  const { id } = useParams<{ id: string }>()
  const [pet, setPet] = useState<PetDetalhe | null>(null)
  const [pacote, setPacote] = useState<PacoteAtual | null>(null)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const [petRes, pacoteRes, histRes] = await Promise.all([
        supabase.from('pets').select('id, nome, especie, raca, observacoes, tutor:tutores(id, nome, telefone)').eq('id', id).single(),
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
      ])
      setPet(petRes.data as unknown as PetDetalhe)
      setPacote(pacoteRes.data as unknown as PacoteAtual)
      setHistorico((histRes.data as unknown as HistoricoItem[]) ?? [])
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="text-text-muted">Carregando…</div>
  if (!pet) return <div className="text-text-muted">Pet não encontrado.</div>

  const progresso = pacote
    ? Math.min(100, Math.round((pacote.banhos_usados_ciclo / (pacote.tipo_pacote?.banhos_por_ciclo ?? 1)) * 100))
    : 0

  return (
    <div className="relative flex flex-col gap-[18px]">
      <Card className="flex items-center gap-4 p-5">
        <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full bg-blue-tint text-[10px] font-bold text-blue">
          IMG
        </div>
        <div className="flex-1">
          <div className="text-[18px] font-extrabold">{pet.nome}</div>
          <div className="text-[12.5px] text-text-muted">
            {pet.especie}
            {pet.raca ? ` · ${pet.raca}` : ''}
          </div>
          {pet.observacoes && (
            <div className="mt-1 rounded-lg bg-[#f7f4ee] px-2 py-1 text-[11.5px] text-text-soft">{pet.observacoes}</div>
          )}
          <div className="mt-2 text-[12px] text-text-muted">
            Tutor: <span className="font-bold text-ink">{pet.tutor?.nome ?? '—'}</span>
            {pet.tutor?.telefone ? ` · ${pet.tutor.telefone}` : ''}
          </div>
        </div>
      </Card>

      {pacote && (
        <Card tone="terracota" className="p-5">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-terracota">Pacote atual</div>
          <div className="mt-1 text-[15px] font-extrabold">
            {pacote.tipo_pacote?.nome} · {pacote.tipo_pacote?.banhos_por_ciclo} banhos/ciclo
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-terracota-border">
            <div className="h-full rounded-full bg-terracota" style={{ width: `${progresso}%` }} />
          </div>
          <div className="mt-2 text-[11.5px] text-terracota-dark">
            {pacote.banhos_usados_ciclo}/{pacote.tipo_pacote?.banhos_por_ciclo} usados neste ciclo
          </div>
        </Card>
      )}

      <div className="text-[13px] font-extrabold">Histórico de atendimentos</div>
      <div className="flex flex-col gap-3">
        {historico.length === 0 && <div className="text-[13px] text-text-muted">Nenhum atendimento registrado ainda.</div>}
        {historico.map((h) => (
          <Card key={h.id} className="flex items-center gap-3 p-4">
            <div className="rounded-pill bg-[#f2ede3] px-[9px] py-[2px] text-[10px] font-bold text-text-muted">
              {formatBR(h.data)}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-tint text-[8px] font-bold text-blue">
              {h.fotos.length > 0 ? `${h.fotos.length} foto${h.fotos.length > 1 ? 's' : ''}` : '—'}
            </div>
            <div className="text-[12.5px] text-text-soft">{h.anotacao_tutor ?? 'Sem anotação.'}</div>
          </Card>
        ))}
      </div>

      <Link
        to={`/agenda/novo?pet=${pet.id}`}
        className="fixed bottom-8 right-8 flex items-center gap-2 rounded-pill bg-gradient-to-br from-blue to-blue-dark px-5 py-[13px] text-[13px] font-bold text-white shadow-lg"
      >
        + Novo agendamento
      </Link>
    </div>
  )
}
