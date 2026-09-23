export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function diffDays(dateISO: string): number {
  const today = new Date(todayISO() + 'T00:00:00')
  const target = new Date(dateISO + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatBR(dateISO: string): string {
  const [y, m, d] = dateISO.split('-')
  return `${d}/${m}/${y}`
}

export function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Frase de vencimento no padrão pedido pela cliente. */
export function vencimentoLabel(dateISO: string): string {
  const d = diffDays(dateISO)
  if (d === 0) return 'Vence hoje'
  if (d > 0) return `Vence em ${d} dia${d > 1 ? 's' : ''}`
  return `Venceu há ${Math.abs(d)} dia${Math.abs(d) > 1 ? 's' : ''}`
}
