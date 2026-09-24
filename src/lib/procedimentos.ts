import type { TipoProcedimento } from '../types/database'

export const TIPO_PROCEDIMENTO_LABEL: Record<TipoProcedimento, string> = {
  banho: 'Banho',
  banho_tosa: 'Banho + tosa',
  tosa_higienica: 'Tosa higiênica',
}

export const TIPO_PROCEDIMENTO_OPCOES: TipoProcedimento[] = ['banho', 'banho_tosa', 'tosa_higienica']
