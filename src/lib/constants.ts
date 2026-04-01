export const USERS = [
  { id: 'bruno', name: 'Bruno', role: 'proprietário', color: '#3B82F6' },
  { id: 'graziela', name: 'Graziela', role: 'proprietária', color: '#EC4899' },
  { id: 'mari', name: 'Mari', role: 'designer', color: '#8B5CF6' },
  { id: 'claude', name: 'Claude (AI)', role: 'assistente', color: '#10B981' },
] as const

export type UserID = typeof USERS[number]['id']

// Access key -> user mapping
// bruno_graziela key maps to either bruno or graziela (user still picks who they are)
// mari key maps directly to mari
export const ACCESS_KEY_USER_MAP: Record<string, { users: UserID[]; role: string }> = {
  bruno_graziela: { users: ['bruno', 'graziela'], role: 'owner' },
  mari: { users: ['mari'], role: 'designer' },
}

// Personalized greetings per user
export const USER_GREETINGS: Record<string, { greeting: string; subtitle: string }> = {
  bruno: {
    greeting: 'E aí Bruno!',
    subtitle: 'Bora acompanhar a reforma do 62',
  },
  graziela: {
    greeting: 'Oi Grazi!',
    subtitle: 'Vamos ver como está a reforma do 62',
  },
  mari: {
    greeting: 'Bem-vinda Mari!',
    subtitle: 'Aqui está tudo sobre o projeto do Ap 62',
  },
  claude: {
    greeting: 'Modo AI ativo',
    subtitle: 'Assistente da reforma',
  },
}

export const APP_NAME = 'Reforma Ap 62'
export const APP_SUBTITLE = 'Baggio Primo (Bruno e Grazi)'

export const STATUS_CONFIG = {
  ja_temos: { label: 'Já Temos', color: '#8B5CF6', bg: '#EDE9FE' },
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
