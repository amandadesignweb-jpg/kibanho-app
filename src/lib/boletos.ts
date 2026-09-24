import { supabase } from './supabase'
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

/** Marca o boleto como pago: gera a saída correspondente no Financeiro e some do lembrete.
 * Centralizado aqui porque Dashboard e Financeiro precisam do mesmo comportamento. */
export async function pagarBoleto(boleto: Boleto): Promise<void> {
  await supabase.from('financeiro_lancamentos').insert({
    tipo: 'saida',
    descricao: boleto.nome,
    categoria: boleto.categoria,
    valor: boleto.valor,
    status_pagamento: 'pago',
    boleto_id: boleto.id,
  })
  await supabase.from('boletos').update({ status: 'pago' }).eq('id', boleto.id)
}

/** Adia o vencimento do boleto em N dias (padrão: 7 — a Fase seguinte pode trocar
 * por um seletor de data no próprio card). */
export async function adiarBoleto(boleto: Boleto, dias = 7): Promise<void> {
  const nova = new Date(boleto.data_vencimento + 'T00:00:00')
  nova.setDate(nova.getDate() + dias)
  await supabase
    .from('boletos')
    .update({ data_vencimento: nova.toISOString().slice(0, 10) })
    .eq('id', boleto.id)
}
