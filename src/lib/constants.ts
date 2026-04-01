export const USERS = [
  { id: 'bruno', name: 'Bruno', role: 'proprietário', color: '#3B82F6' },
  { id: 'graziela', name: 'Graziela', role: 'proprietária', color: '#EC4899' },
  { id: 'mari', name: 'Mari', role: 'designer', color: '#8B5CF6' },
  { id: 'claude', name: 'Claude (AI)', role: 'assistente', color: '#10B981' },
] as const

export type UserID = typeof USERS[number]['id']

export const STATUS_CONFIG = {
  desejado: { label: 'Desejado', color: '#F59E0B', bg: '#FEF3C7' },
  aprovado: { label: 'Aprovado', color: '#10B981', bg: '#D1FAE5' },
  comprado: { label: 'Comprado', color: '#3B82F6', bg: '#DBEAFE' },
} as const

export const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return 'Sem preço'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
