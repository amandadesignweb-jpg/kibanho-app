import type { EstoqueProduto } from '../types/database'
import { diffDays } from './date'

// Limiares de banhos realizados que disparam o alerta de reposição.
export const REPOR_AGORA_BANHOS = 30
export const REPOR_EM_BREVE_BANHOS = 20

export function estoqueStatus(banhosRealizados: number): EstoqueProduto['status'] {
  if (banhosRealizados >= REPOR_AGORA_BANHOS) return 'repor_agora'
  if (banhosRealizados >= REPOR_EM_BREVE_BANHOS) return 'repor_em_breve'
  return 'em_uso'
}

export const ESTOQUE_LABEL: Record<EstoqueProduto['status'], string> = {
  em_uso: 'Em uso',
  repor_em_breve: 'Repor em breve',
  repor_agora: 'Repor agora',
  encerrado: 'Encerrado',
}

export const ESTOQUE_CLASSES: Record<EstoqueProduto['status'], string> = {
  em_uso: 'bg-blue-tint text-blue-dark',
  repor_em_breve: 'bg-terracota-tint text-terracota-dark',
  repor_agora: 'bg-terracota-tint text-terracota-dark',
  encerrado: 'bg-[#f2ede3] text-text-muted',
}

/** Dias corridos desde a abertura do produto. */
export function diasEmUso(dataAbertura: string): number {
  return Math.abs(diffDays(dataAbertura))
}
