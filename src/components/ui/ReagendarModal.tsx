import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatBR } from '../../lib/date'
import { Modal } from './Modal'
import clsx from '../../lib/clsx'

const HORARIOS = ['09:00', '10:00', '11:00', '11:30', '14:00', '15:00', '15:30', '16:00', '16:30', '17:00']
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Modal de remarcação: mostra os próximos dias e os horários livres naquele
 * dia (excluindo o próprio agendamento sendo remarcado), pra escolher o novo
 * dia/hora sem digitar nada. */
export function ReagendarModal({
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
  const dias = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  }), [])

  const [data, setData] = useState(toISO(dias[0]))
  const [hora, setHora] = useState('')
  const [ocupados, setOcupados] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setData(toISO(dias[0]))
    setHora('')
    setErro(null)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    supabase
      .from('agendamentos')
      .select('id, hora')
      .eq('data', data)
      .neq('status', 'cancelado')
      .then(({ data: rows }) => {
        const livres = ((rows as { id: string; hora: string }[] | null) ?? [])
          .filter((r) => r.id !== agendamentoId)
          .map((r) => r.hora.slice(0, 5))
        setOcupados(livres)
        setHora('')
      })
  }, [open, data, agendamentoId])

  async function confirmar() {
    if (!agendamentoId || !hora) return
    setSalvando(true)
    setErro(null)
    const { error } = await supabase
      .from('agendamentos')
      .update({ data, hora, status: 'confirmado' })
      .eq('id', agendamentoId)
    setSalvando(false)
    if (error) {
      setErro('Não foi possível remarcar. Tente novamente.')
      return
    }
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="480px">
      <div className="flex items-center justify-between">
        <div className="text-[17px] font-extrabold">Remarcar · {nomePet}</div>
        <button onClick={onClose} className="text-text-muted">✕</button>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Novo dia</div>
        <div className="grid grid-cols-5 gap-[6px]">
          {dias.map((d) => {
            const iso = toISO(d)
            const isSelected = iso === data
            return (
              <button
                key={iso}
                onClick={() => setData(iso)}
                className={clsx(
                  'rounded-xl py-[9px] text-center',
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
      </div>

      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-text-faint">Horário disponível</div>
        <div className="grid grid-cols-5 gap-2">
          {HORARIOS.map((h) => {
            const ocupado = ocupados.includes(h)
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

      {hora && (
        <div className="rounded-xl bg-[#f7f4ee] px-3 py-2 text-[12.5px]">
          Novo horário: <b>{DIAS_SEMANA[new Date(data + 'T00:00:00').getDay()]}, {formatBR(data)} às {hora}</b>
        </div>
      )}

      {erro && <div className="text-[12.5px] font-semibold text-terracota-strong">{erro}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-pill border border-border px-5 py-[12px] text-[13px] font-bold text-text-soft">
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={!hora || salvando}
          className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-[20px] py-[12px] text-[13px] font-bold text-white disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Confirmar remarcação'}
        </button>
      </div>
    </Modal>
  )
}
