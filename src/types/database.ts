// Tipos manuais alinhados ao schema aplicado no Supabase (projeto gestao-kibanho).
// Cobre as tabelas usadas nas telas já construídas. Ao gerar tipos oficiais
// depois (supabase gen types), este arquivo pode ser substituído sem tocar
// no resto do app — todo o código consome apenas os tipos de linha abaixo.

export interface Tutor {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
  created_at: string
}

export interface TipoPacote {
  id: string
  nome: string
  valor: number
  banhos_por_ciclo: number
  created_at: string
}

export interface Pet {
  id: string
  tutor_id: string
  nome: string
  especie: string
  raca: string | null
  observacoes: string | null
  foto_url: string | null
  created_at: string
}

export interface PacotePet {
  id: string
  pet_id: string
  tipo_pacote_id: string
  data_inicio: string
  banhos_usados_ciclo: number
  status: 'ativo' | 'encerrado'
  created_at: string
}

export type AgendamentoStatus =
  | 'confirmado'
  | 'realizado'
  | 'remarcado'
  | 'nao_realizado'
  | 'cancelado'

export type TipoProcedimento = 'banho' | 'banho_tosa' | 'tosa_higienica'
export type FormaPagamento = 'pix' | 'credito' | 'debito' | 'dinheiro'

export interface Agendamento {
  id: string
  pet_id: string
  tipo_servico: 'avulso' | 'pacote'
  tipo_procedimento: TipoProcedimento
  data: string
  hora: string
  status: AgendamentoStatus
  pagamento_status: 'pago' | 'pendente'
  forma_pagamento: FormaPagamento | null
  valor: number | null
  justificativa_ausencia: string | null
  created_at: string
}

export interface Procedimento {
  id: string
  agendamento_id: string
  pet_id: string
  data: string
  fotos: string[]
  anotacao_tutor: string | null
  enviado_whatsapp: boolean
  created_at: string
}

export interface FinanceiroLancamento {
  id: string
  tipo: 'entrada' | 'saida'
  descricao: string
  categoria: string | null
  valor: number
  data: string
  status_pagamento: 'pago' | 'pendente'
  forma_pagamento: FormaPagamento | null
  agendamento_id: string | null
  boleto_id: string | null
  created_at: string
}

export type BoletoStatus = 'em_dia' | 'atencao' | 'atrasado' | 'pago' | 'adiado'

export interface Boleto {
  id: string
  nome: string
  categoria: string | null
  valor: number
  data_vencimento: string
  recorrente: boolean
  status: BoletoStatus
  lancamento_id: string | null
  created_at: string
}

export interface EstoqueProduto {
  id: string
  nome: string
  data_abertura: string
  data_fim: string | null
  banhos_realizados: number
  status: 'em_uso' | 'repor_em_breve' | 'repor_agora' | 'encerrado'
  created_at: string
}

export interface EstoqueLacos {
  id: string
  quantidade_comprada: number
  quantidade_usada: number
  data_registro: string
  created_at: string
}

export interface Configuracoes {
  id: number
  empresa_nome: string
  responsavel: string | null
  telefone: string | null
  instagram: string | null
  endereco: string | null
  notif_lembrete_diario: boolean
  notif_cobrancas_pendentes: boolean
  notif_renovacao_pacote: boolean
  notif_alerta_estoque: boolean
  backup_automatico: boolean
  updated_at: string
}
