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

/** Intervalo (ISO, inclusive) do mês atual (monthsAgo=0) ou de meses anteriores. */
export function monthRange(monthsAgo: number): { inicio: string; fim: string; label: string } {
  const now = new Date()
  const ref = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  const label = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { inicio: toISODate(inicio), fim: toISODate(fim), label: label.charAt(0).toUpperCase() + label.slice(1) }
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Últimos N dias (ISO), do mais antigo ao mais recente, incluindo hoje. */
export function lastNDays(n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(toISODate(d))
  }
  return out
}
