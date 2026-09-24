import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal } from './Modal'

/** Modal para justificar a ausência ao marcar um agendamento como "não realizado". */
export function JustificarModal({
  open,
  agendamentoId,
  nomePet,
  onClose,
  onSaved,
}: {
  open: boolean
  agendamentoId: string | null
  nomePet: string
  onClose: () => void
  onSaved: () => void
}) {
  const [justificativa, setJustificativa] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setJustificativa('')
      setErro(null)
    }
  }, [open])

  async function confirmar() {
    if (!agendamentoId) return
    setSalvando(true)
    setErro(null)
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'nao_realizado', justificativa_ausencia: justificativa || null })
      .eq('id', agendamentoId)
    setSalvando(false)
    if (error) {
      setErro('Não foi possível salvar. Tente novamente.')
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="440px">
      <div className="flex items-center justify-between">
        <div className="text-[17px] font-extrabold">Não realizado · {nomePet}</div>
        <button onClick={onClose} className="text-text-muted">✕</button>
      </div>

      <div>
        <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">
          Motivo da ausência (opcional)
        </div>
        <textarea
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Ex.: Tutor avisou que não pôde trazer o pet."
          className="w-full rounded-xl border border-border px-[14px] py-[11px] text-[13px] outline-none focus:border-blue"
        />
      </div>

      {erro && <div className="text-[12.5px] font-semibold text-terracota-strong">{erro}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-pill border border-border px-5 py-[12px] text-[13px] font-bold text-text-soft">
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={salvando}
          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[20px] py-[12px] text-[13px] font-bold text-white disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  )
}
