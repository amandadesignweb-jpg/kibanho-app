import type { Boleto, BoletoStatus } from '../types/database'
import { diffDays } from './date'

/** Estado visual derivado da data de vencimento (a menos que já esteja pago/adiado). */
export function boletoEstado(boleto: Pick<Boleto, 'data_vencimento' | 'status'>): BoletoStatus {
  if (boleto.status === 'pago' || boleto.status === 'adiado') return boleto.status
  const d = diffDays(boleto.data_vencimento)
  if (d < 0) return 'atrasado'
  if (d <= 5) return 'atencao'
  return 'em_dia'
}

export const ESTADO_LABEL: Record<BoletoStatus, string> = {
  em_dia: 'Em dia',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  pago: 'Pago',
  adiado: 'Adiado',
}

export const ESTADO_CLASSES: Record<BoletoStatus, string> = {
  em_dia: 'bg-[#f2ede3] text-text-soft',
  atencao: 'bg-terracota-tint text-terracota-dark',
  atrasado: 'bg-terracota-border2 text-terracota-strong',
  pago: 'bg-blue-tint text-blue-dark',
  adiado: 'bg-[#f2ede3] text-text-soft',
}

/** Boletos que devem aparecer como lembrete no Dashboard: dentro de 5 dias do
 * vencimento (inclui atrasados), e que ainda não foram pagos. */
export function isLembreteDashboard(boleto: Pick<Boleto, 'data_vencimento' | 'status'>): boolean {
  if (boleto.status === 'pago') return false
  return diffDays(boleto.data_vencimento) <= 5
}
