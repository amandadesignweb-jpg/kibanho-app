import type { FormaPagamento } from '../types/database'

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: 'Pix',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
}

export const FORMA_PAGAMENTO_OPCOES: FormaPagamento[] = ['pix', 'credito', 'debito', 'dinheiro']
