import type { Room } from '@/lib/supabase'

export interface ServiceCategory {
  id: string
  name: string
  icon: string
  order_index: number
}

export interface Professional {
  id: string
  name: string
  phone?: string
  email?: string
  specialty?: string
  notes?: string
  recommended_by?: string
  created_at: string
  created_by: string
}

export interface Quote {
  id: string
  professional_id: string
  service_category_id?: string
  room_id?: string
  description: string
  amount: number
  status: 'recebido' | 'avaliando' | 'aprovado' | 'contratado' | 'pago' | 'recusado'
  notes?: string
  scheduled_date?: string
  paid_date?: string
  payment_method?: string
  payment_details?: string
  negotiated_amount?: number
  created_at: string
  created_by: string
  updated_by: string
  professional?: Professional
  service_category?: ServiceCategory
  room?: Room
}

export interface Contract {
  id: string; professional: string; role: string; original_total: number; negotiated_total: number;
  start_date: string; first_payment_date: string; status: string; notes: string;
}

export interface BudgetItem {
  id: string; professional: string; category: string; service: string; location: string;
  original_value: number | null; notes: string | null; sort_order: number;
}

export interface Payment {
  id: string; professional: string; installment_number: number; amount: number;
  due_date: string; paid_date: string | null; status: string; notes: string;
}

export interface OrcamentoDoc {
  id: string
  title: string
  description?: string
  doc_type: string
  url?: string
  file_path?: string
  file_name?: string
  file_size?: number
  file_type?: string
  created_by: string
  created_at: string
}

export interface OrcamentoParsedItem {
  numero: number
  descricao: string
  quantidade: number
  unidade: string | null
  valor_unitario: number
  valor_total: number
  categoria: string | null
  ambiente_sugerido: string | null
  observacoes: string | null
  room_id?: string | null
}

export interface OrcamentoParsed {
  profissional_sugerido: string | null
  especialidade_sugerida: string | null
  telefone: string | null
  email: string | null
  cnpj_cpf: string | null
  data_orcamento: string | null
  validade_dias: number | null
  condicoes_pagamento: string | null
  total: number
  total_mao_obra: number | null
  total_material: number | null
  itens: OrcamentoParsedItem[]
  observacoes: string | null
  confidence: 'alta' | 'media' | 'baixa'
  warnings: string[]
  file_name?: string
  file_size?: number
}

export interface OrcamentoFlow {
  proId: string
  step: 'select' | 'parsing' | 'review'
  file: File | null
  documentId: string | null
  parsed: OrcamentoParsed | null
  description: string
  editedItems: OrcamentoParsedItem[]
  saving: boolean
  error: string | null
}

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX', emoji: '⚡' },
  { value: 'boleto', label: 'Boleto', emoji: '📄' },
  { value: 'cartao_credito', label: 'Cartão Crédito', emoji: '💳' },
  { value: 'cartao_debito', label: 'Cartão Débito', emoji: '💳' },
  { value: 'dinheiro', label: 'Dinheiro', emoji: '💵' },
  { value: 'transferencia', label: 'Transferência', emoji: '🏦' },
  { value: 'parcelado', label: 'Parcelado', emoji: '📊' },
]

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  recebido: { label: 'Recebido', color: '#6b7280', bg: '#f3f4f6', emoji: '📩' },
  avaliando: { label: 'Avaliando', color: '#d97706', bg: '#fef3c7', emoji: '🔍' },
  aprovado: { label: 'Aprovado', color: '#059669', bg: '#d1fae5', emoji: '✅' },
  contratado: { label: 'Contratado', color: '#2563eb', bg: '#dbeafe', emoji: '🤝' },
  pago: { label: 'Pago', color: '#7c3aed', bg: '#ede9fe', emoji: '💰' },
  recusado: { label: 'Recusado', color: '#dc2626', bg: '#fee2e2', emoji: '❌' },
}

export const STATUS_FLOW = ['recebido', 'avaliando', 'aprovado', 'contratado']

export const ORC_CATEGORIES = [
  'eletrica', 'hidraulica', 'alvenaria', 'piso', 'pintura', 'gesso',
  'marcenaria', 'serralheria', 'vidraçaria', 'impermeabilizacao',
  'ar_condicionado', 'demolicao', 'limpeza', 'mao_de_obra', 'material', 'outro',
]

export const fmtBRL = (v: number | null) => v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—'
export const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
export const fmtFileSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
